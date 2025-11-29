import express from 'express';
import fetch from 'node-fetch';
import { authenticateDevice } from '../middleware/auth.js';
import prisma from '../config/database.js';

const router = express.Router();
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// All routes require device authentication
router.use(authenticateDevice);

// Helper to check and update API rate limits
async function checkAndUpdateRateLimit(userId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get user with current limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      apiLimitDaily: true,
      apiLimitMonthly: true,
      apiCallsToday: true,
      apiCallsMonth: true,
      apiLimitResetDay: true,
      apiLimitResetMonth: true,
    },
  });

  if (!user) {
    return { allowed: false, error: 'User not found' };
  }

  // Check if we need to reset daily counter
  let apiCallsToday = user.apiCallsToday;
  let resetDay = false;
  if (!user.apiLimitResetDay || new Date(user.apiLimitResetDay) < today) {
    apiCallsToday = 0;
    resetDay = true;
  }

  // Check if we need to reset monthly counter
  let apiCallsMonth = user.apiCallsMonth;
  let resetMonth = false;
  if (!user.apiLimitResetMonth || new Date(user.apiLimitResetMonth) < thisMonth) {
    apiCallsMonth = 0;
    resetMonth = true;
  }

  // Check daily limit
  if (user.apiLimitDaily !== null && apiCallsToday >= user.apiLimitDaily) {
    return {
      allowed: false,
      error: `Daily API limit reached (${user.apiLimitDaily} calls). Resets at midnight.`,
      limitType: 'daily',
      current: apiCallsToday,
      limit: user.apiLimitDaily,
    };
  }

  // Check monthly limit
  if (user.apiLimitMonthly !== null && apiCallsMonth >= user.apiLimitMonthly) {
    return {
      allowed: false,
      error: `Monthly API limit reached (${user.apiLimitMonthly} calls). Resets on the 1st.`,
      limitType: 'monthly',
      current: apiCallsMonth,
      limit: user.apiLimitMonthly,
    };
  }

  // Update counters
  const updateData = {
    apiCallsToday: apiCallsToday + 1,
    apiCallsMonth: apiCallsMonth + 1,
  };

  if (resetDay) {
    updateData.apiLimitResetDay = today;
  }
  if (resetMonth) {
    updateData.apiLimitResetMonth = thisMonth;
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return {
    allowed: true,
    daily: { current: apiCallsToday + 1, limit: user.apiLimitDaily },
    monthly: { current: apiCallsMonth + 1, limit: user.apiLimitMonthly },
  };
}

// Helper to log API request
async function logApiRequest(deviceId, { endpoint, method, model, prompt, response, status, durationMs, tokenCount, error, metadata }) {
  try {
    // Truncate prompt and response to avoid storing huge texts
    const maxLength = 2000;
    const truncatedPrompt = prompt && prompt.length > maxLength ? prompt.substring(0, maxLength) + '...' : prompt;
    const truncatedResponse = response && response.length > maxLength ? response.substring(0, maxLength) + '...' : response;

    await prisma.deviceApiLog.create({
      data: {
        deviceId,
        endpoint,
        method,
        model,
        prompt: truncatedPrompt,
        response: truncatedResponse,
        status,
        durationMs,
        tokenCount,
        error,
        metadata,
      },
    });
  } catch (err) {
    console.error('Failed to log API request:', err);
    // Don't throw - logging failures shouldn't break the API
  }
}

/**
 * POST /api/llm/chat
 * Device LLM Chat endpoint
 * Allows devices to chat with the local LLM using their API key
 *
 * Body:
 * {
 *   "message": "User's message",
 *   "model": "llama3.1:8b" (optional, defaults to llama3.1:8b),
 *   "context": [] (optional, conversation history),
 *   "system": "System prompt" (optional)
 * }
 */
router.post('/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    const { message, model = 'llama3.1:8b', context = [], system } = req.body;

    // Check rate limits for the device owner
    const rateLimitResult = await checkAndUpdateRateLimit(req.device.userId);
    if (!rateLimitResult.allowed) {
      await logApiRequest(req.device.id, {
        endpoint: '/chat',
        method: 'POST',
        model,
        prompt: message,
        status: 429,
        durationMs: Date.now() - startTime,
        error: rateLimitResult.error,
      });
      return res.status(429).json({
        error: rateLimitResult.error,
        limitType: rateLimitResult.limitType,
        current: rateLimitResult.current,
        limit: rateLimitResult.limit,
      });
    }

    if (!message || message.trim().length === 0) {
      await logApiRequest(req.device.id, {
        endpoint: '/chat',
        method: 'POST',
        model,
        prompt: message,
        status: 400,
        durationMs: Date.now() - startTime,
        error: 'Message is required',
      });
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build conversation history for Ollama
    const messages = [];

    // Add system prompt if provided
    if (system) {
      messages.push({
        role: 'system',
        content: system,
      });
    }

    // Add context (previous messages)
    if (context && Array.isArray(context)) {
      messages.push(...context);
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message.trim(),
    });

    // Call Ollama API
    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false, // Disable streaming for devices
      }),
    });

    if (!ollamaResponse.ok) {
      const errorMsg = `Ollama API error: ${ollamaResponse.statusText}`;
      await logApiRequest(req.device.id, {
        endpoint: '/chat',
        method: 'POST',
        model,
        prompt: message.trim(),
        status: ollamaResponse.status,
        durationMs: Date.now() - startTime,
        error: errorMsg,
        metadata: { contextLength: context.length },
      });
      throw new Error(errorMsg);
    }

    const data = await ollamaResponse.json();
    const durationMs = Date.now() - startTime;

    // Log successful request
    await logApiRequest(req.device.id, {
      endpoint: '/chat',
      method: 'POST',
      model: data.model,
      prompt: message.trim(),
      response: data.message.content,
      status: 200,
      durationMs,
      tokenCount: data.eval_count,
      metadata: { contextLength: context.length },
    });

    // Return response
    res.json({
      message: data.message.content,
      model: data.model,
      device: {
        id: req.device.id,
        name: req.device.name,
      },
      context: [...messages, data.message], // Return full conversation for next request
      done: data.done,
      eval_count: data.eval_count,
      eval_duration: data.eval_duration,
    });
  } catch (error) {
    console.error('LLM chat error:', error);
    // Log the catch-all error
    await logApiRequest(req.device.id, {
      endpoint: '/chat',
      method: 'POST',
      model: req.body?.model || 'llama3.1:8b',
      prompt: req.body?.message,
      status: 500,
      durationMs: Date.now() - startTime,
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message,
    });
  }
});

/**
 * POST /api/llm/generate
 * Simple text generation endpoint (no conversation history)
 *
 * Body:
 * {
 *   "prompt": "Text to generate from",
 *   "model": "llama3.1:8b" (optional),
 *   "system": "System prompt" (optional)
 * }
 */
router.post('/generate', async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt, model = 'llama3.1:8b', system } = req.body;

    // Check rate limits for the device owner
    const rateLimitResult = await checkAndUpdateRateLimit(req.device.userId);
    if (!rateLimitResult.allowed) {
      await logApiRequest(req.device.id, {
        endpoint: '/generate',
        method: 'POST',
        model,
        prompt,
        status: 429,
        durationMs: Date.now() - startTime,
        error: rateLimitResult.error,
      });
      return res.status(429).json({
        error: rateLimitResult.error,
        limitType: rateLimitResult.limitType,
        current: rateLimitResult.current,
        limit: rateLimitResult.limit,
      });
    }

    if (!prompt || prompt.trim().length === 0) {
      await logApiRequest(req.device.id, {
        endpoint: '/generate',
        method: 'POST',
        model,
        prompt,
        status: 400,
        durationMs: Date.now() - startTime,
        error: 'Prompt is required',
      });
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Call Ollama API
    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: prompt.trim(),
        system,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      const errorMsg = `Ollama API error: ${ollamaResponse.statusText}`;
      await logApiRequest(req.device.id, {
        endpoint: '/generate',
        method: 'POST',
        model,
        prompt: prompt.trim(),
        status: ollamaResponse.status,
        durationMs: Date.now() - startTime,
        error: errorMsg,
      });
      throw new Error(errorMsg);
    }

    const data = await ollamaResponse.json();
    const durationMs = Date.now() - startTime;

    // Log successful request
    await logApiRequest(req.device.id, {
      endpoint: '/generate',
      method: 'POST',
      model: data.model,
      prompt: prompt.trim(),
      response: data.response,
      status: 200,
      durationMs,
      tokenCount: data.eval_count,
    });

    // Return response
    res.json({
      response: data.response,
      model: data.model,
      device: {
        id: req.device.id,
        name: req.device.name,
      },
      done: data.done,
      context: data.context,
      eval_count: data.eval_count,
      eval_duration: data.eval_duration,
    });
  } catch (error) {
    console.error('LLM generate error:', error);
    await logApiRequest(req.device.id, {
      endpoint: '/generate',
      method: 'POST',
      model: req.body?.model || 'llama3.1:8b',
      prompt: req.body?.prompt,
      status: 500,
      durationMs: Date.now() - startTime,
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to generate text',
      details: error.message,
    });
  }
});

/**
 * GET /api/llm/models
 * List available LLM models
 */
router.get('/models', async (req, res) => {
  const startTime = Date.now();
  try {
    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/tags`);

    if (!ollamaResponse.ok) {
      const errorMsg = `Ollama API error: ${ollamaResponse.statusText}`;
      await logApiRequest(req.device.id, {
        endpoint: '/models',
        method: 'GET',
        status: ollamaResponse.status,
        durationMs: Date.now() - startTime,
        error: errorMsg,
      });
      throw new Error(errorMsg);
    }

    const data = await ollamaResponse.json();
    const durationMs = Date.now() - startTime;

    // Log successful request
    await logApiRequest(req.device.id, {
      endpoint: '/models',
      method: 'GET',
      status: 200,
      durationMs,
      response: `${data.models?.length || 0} models available`,
    });

    res.json({
      models: data.models,
      device: {
        id: req.device.id,
        name: req.device.name,
      },
    });
  } catch (error) {
    console.error('List models error:', error);
    await logApiRequest(req.device.id, {
      endpoint: '/models',
      method: 'GET',
      status: 500,
      durationMs: Date.now() - startTime,
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to list models',
      details: error.message,
    });
  }
});

export default router;
