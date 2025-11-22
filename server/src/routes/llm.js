import express from 'express';
import fetch from 'node-fetch';
import { authenticateDevice } from '../middleware/auth.js';

const router = express.Router();
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// All routes require device authentication
router.use(authenticateDevice);

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
  try {
    const { message, model = 'llama3.1:8b', context = [], system } = req.body;

    if (!message || message.trim().length === 0) {
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
      throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
    }

    const data = await ollamaResponse.json();

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
  try {
    const { prompt, model = 'llama3.1:8b', system } = req.body;

    if (!prompt || prompt.trim().length === 0) {
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
      throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
    }

    const data = await ollamaResponse.json();

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
  try {
    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/tags`);

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
    }

    const data = await ollamaResponse.json();

    res.json({
      models: data.models,
      device: {
        id: req.device.id,
        name: req.device.name,
      },
    });
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({
      error: 'Failed to list models',
      details: error.message,
    });
  }
});

export default router;
