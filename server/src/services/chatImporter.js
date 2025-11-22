import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

/**
 * Chat Importer Service
 * Scrapes shared conversations from Claude.ai and ChatGPT using headless browser
 */

class ChatImporter {
  constructor() {
    this.browser = null;
  }

  /**
   * Initialize browser instance (reuse across requests)
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url) {
    if (url.includes('claude.ai')) return 'claude';
    if (url.includes('chatgpt.com')) return 'chatgpt';
    return null;
  }

  /**
   * Main import function - detects platform and scrapes accordingly
   */
  async importChat(shareUrl) {
    const platform = this.detectPlatform(shareUrl);

    if (!platform) {
      throw new Error('Unsupported platform. Only Claude.ai and ChatGPT share links are supported.');
    }

    console.log(`[ChatImporter] Importing from ${platform}: ${shareUrl}`);

    try {
      if (platform === 'claude') {
        return await this.scrapeClaude(shareUrl);
      } else if (platform === 'chatgpt') {
        return await this.scrapeChatGPT(shareUrl);
      }
    } catch (error) {
      console.error(`[ChatImporter] Error importing from ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Scrape Claude.ai shared conversation
   */
  async scrapeClaude(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      console.log('[ChatImporter] Loading Claude share page...');

      // Set viewport and user agent to avoid detection
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract conversation title
      const title = await page.evaluate(() => {
        const titleElement = document.querySelector('h1, title, [class*="title"]');
        return titleElement ? titleElement.textContent.trim() : 'Imported from Claude';
      });

      // Extract messages
      const rawMessages = await page.evaluate(() => {
        const userMsgs = document.querySelectorAll('[class*="font-user"]');
        const assistantMsgs = document.querySelectorAll('[class*="font-claude"]');

        // Combine and sort by position
        const all = [
          ...Array.from(userMsgs).map(el => ({ role: 'user', el })),
          ...Array.from(assistantMsgs).map(el => ({ role: 'assistant', el }))
        ];

        all.sort((a, b) => {
          const rectA = a.el.getBoundingClientRect();
          const rectB = b.el.getBoundingClientRect();
          return rectA.top - rectB.top;
        });

        return all.map(item => ({
          role: item.role,
          content: item.el.textContent.trim()
        }));
      });

      // Group consecutive messages from same role
      const messages = [];
      let currentMessage = null;

      for (const msg of rawMessages) {
        if (!msg.content) continue;

        if (currentMessage && currentMessage.role === msg.role) {
          // Same role, append content
          currentMessage.content += '\n\n' + msg.content;
        } else {
          // Different role or first message
          if (currentMessage) {
            messages.push(currentMessage);
          }
          currentMessage = { ...msg };
        }
      }

      // Push last message
      if (currentMessage) {
        messages.push(currentMessage);
      }

      await page.close();

      return {
        platform: 'claude',
        title,
        messages,
        importedAt: new Date().toISOString(),
        sourceUrl: url
      };

    } catch (error) {
      await page.close();
      throw new Error(`Failed to scrape Claude conversation: ${error.message}`);
    }
  }

  /**
   * Scrape ChatGPT shared conversation
   */
  async scrapeChatGPT(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      console.log('[ChatImporter] Loading ChatGPT share page...');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for conversation to load (ChatGPT uses different selectors)
      await page.waitForSelector('[data-message-author-role]', { timeout: 10000 });

      // Extract conversation title
      const title = await page.evaluate(() => {
        const titleElement = document.querySelector('h1, title');
        return titleElement ? titleElement.textContent.trim() : 'Imported from ChatGPT';
      });

      // Extract messages
      const messages = await page.evaluate(() => {
        const messageElements = document.querySelectorAll('[data-message-author-role]');
        const extracted = [];

        messageElements.forEach(el => {
          const role = el.getAttribute('data-message-author-role');

          // Get message content - ChatGPT uses markdown rendering
          const contentEl = el.querySelector('[class*="markdown"], [class*="message"], .prose');
          const content = contentEl ? contentEl.textContent.trim() : '';

          if (content && (role === 'user' || role === 'assistant')) {
            extracted.push({ role, content });
          }
        });

        return extracted;
      });

      await page.close();

      return {
        platform: 'chatgpt',
        title,
        messages,
        importedAt: new Date().toISOString(),
        sourceUrl: url
      };

    } catch (error) {
      await page.close();
      throw new Error(`Failed to scrape ChatGPT conversation: ${error.message}`);
    }
  }
}

// Export singleton instance
export const chatImporter = new ChatImporter();

// Cleanup on process exit
process.on('exit', async () => {
  await chatImporter.closeBrowser();
});
