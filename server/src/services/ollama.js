// Ollama AI Service
import prisma from '../config/database.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

class OllamaService {
  async generateResponse(messages, model = DEFAULT_MODEL, options = {}) {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            ...options,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.message.content,
        model: data.model,
      };
    } catch (error) {
      console.error('Ollama generation error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Generate a single prompt completion (non-chat)
   */
  async generateCompletion(prompt, model = DEFAULT_MODEL, options = {}) {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          system: options.systemPrompt || null,
          options: {
            temperature: options.temperature || 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama completion error:', error);
      throw new Error('Failed to generate completion');
    }
  }

  /**
   * Analyze knowledge base notes and suggest book groupings
   */
  async analyzeNotesForBooks(notes) {
    const notesText = notes.map((note, idx) => {
      const title = note.title || 'Untitled';
      const content = note.message?.content || '';
      const userNote = note.note || '';
      return `Note ${idx + 1}: "${title}"\nContent: ${content.substring(0, 200)}...\nUser notes: ${userNote}`;
    }).join('\n\n');

    const systemPrompt = `You are a knowledge organization assistant. Analyze notes and suggest how to group them into books by topic.

Your task:
1. Identify common topics/themes across notes
2. Suggest book titles and descriptions for each group
3. List which notes (by number) belong in each book
4. Return ONLY valid JSON, no other text

Required JSON format:
{
  "books": [
    {
      "title": "Book Title",
      "description": "Brief description",
      "noteIndices": [1, 3, 5]
    }
  ],
  "uncategorized": [2, 4]
}`;

    const prompt = `Analyze these notes and suggest book groupings:\n\n${notesText}\n\nReturn only the JSON response.`;

    try {
      const response = await this.generateCompletion(prompt, DEFAULT_MODEL, {
        systemPrompt,
        temperature: 0.3, // Lower temperature for more consistent JSON
      });

      // Extract JSON from response (in case model adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return analysis;
    } catch (error) {
      console.error('Note analysis error:', error);
      throw new Error('Failed to analyze notes for grouping');
    }
  }

  /**
   * Get GPU assignment from settings for a service
   */
  async getGPUForService(service) {
    try {
      const settings = await prisma.settings.findUnique({
        where: { id: 1 },
      });

      if (!settings) {
        return null; // Auto-select
      }

      switch (service) {
        case 'chat':
          return settings.chatGPU || null;
        case 'imageGen':
          return settings.imageGenGPU || null;
        case 'knowledgeBase':
          return settings.knowledgeBaseGPU || null;
        default:
          return null;
      }
    } catch (error) {
      console.error('Failed to get GPU assignment:', error);
      return null;
    }
  }

  async listModels() {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Ollama list models error:', error);
      return [];
    }
  }

  async checkHealth() {
    try {
      const models = await this.listModels();
      return models.length > 0;
    } catch (error) {
      return false;
    }
  }
}

export default new OllamaService();
