import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execPromise = promisify(exec);

// All routes require authentication
router.use(authenticateToken);

// Generate image from prompt
router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    console.log(`Generating image for user ${req.user.id}: "${prompt}"`);

    // Call Python script with GPU 0 (GTX 1050)
    const scriptPath = '/home/fphillips/hal/server/generate_image.py';
    const command = `CUDA_VISIBLE_DEVICES=0 python3 ${scriptPath} "${prompt.replace(/"/g, '\\"')}"`;

    // Execute with 2 minute timeout
    const { stdout, stderr } = await execPromise(command, {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Parse JSON response from Python script
    const result = JSON.parse(stdout.trim().split('\n').pop());

    if (!result.success) {
      console.error('Image generation failed:', result.error);
      return res.status(500).json({ error: result.error });
    }

    console.log(`Image generated successfully: ${result.image_path}`);

    res.json({
      success: true,
      image_url: result.image_path,
      prompt: prompt.trim(),
    });

  } catch (error) {
    console.error('Image generation error:', error);

    // Handle timeout
    if (error.killed) {
      return res.status(504).json({ error: 'Image generation timed out' });
    }

    res.status(500).json({ error: 'Failed to generate image' });
  }
});

export default router;
