import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/database.js';
import { authenticateToken, requireParent } from '../middleware/auth.js';

const execAsync = promisify(exec);
const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// All routes require parent authentication
router.use(authenticateToken);
router.use(requireParent);

// ========== Model Management ==========

// List all installed models
router.get('/models', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    const data = await response.json();
    res.json(data.models || []);
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

// Pull/download a new model
router.post('/models/pull', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    // Start the pull process
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ success: true, message: `Model ${name} downloaded successfully`, data });
  } catch (error) {
    console.error('Pull model error:', error);
    res.status(500).json({ error: error.message || 'Failed to pull model' });
  }
});

// Delete a model
router.delete('/models/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete model: ${response.statusText}`);
    }

    res.json({ success: true, message: `Model ${name} deleted successfully` });
  } catch (error) {
    console.error('Delete model error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete model' });
  }
});

// Get model info
router.get('/models/:name/info', async (req, res) => {
  try {
    const { name } = req.params;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get model info: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Get model info error:', error);
    res.status(500).json({ error: error.message || 'Failed to get model info' });
  }
});

// ========== System Hardware Detection ==========

router.get('/hardware', async (req, res) => {
  try {
    const hardware = {
      gpus: [],
      ram: { total: 0, available: 0 },
      cpu: { model: '', cores: 0 },
    };

    // Detect NVIDIA GPUs
    try {
      const { stdout: nvidiaOutput } = await execAsync('nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits');
      const gpuLines = nvidiaOutput.trim().split('\n');
      hardware.gpus = gpuLines.map((line, index) => {
        const [name, totalMem, freeMem] = line.split(',').map(s => s.trim());
        return {
          id: index,
          name,
          vendor: 'NVIDIA',
          vramTotal: parseInt(totalMem),
          vramFree: parseInt(freeMem),
        };
      });
    } catch (error) {
      // No NVIDIA GPUs or nvidia-smi not available
      console.log('No NVIDIA GPUs detected');
    }

    // Detect AMD GPUs (rocm-smi)
    try {
      const { stdout: amdOutput } = await execAsync('rocm-smi --showmeminfo vram --csv');
      // Parse AMD GPU info if available
      console.log('AMD GPU detection available but not fully implemented');
    } catch (error) {
      // No AMD GPUs
      console.log('No AMD GPUs detected');
    }

    // Get RAM info
    try {
      const { stdout: memInfo } = await execAsync('cat /proc/meminfo');
      const totalMatch = memInfo.match(/MemTotal:\s+(\d+)/);
      const availableMatch = memInfo.match(/MemAvailable:\s+(\d+)/);

      if (totalMatch && availableMatch) {
        hardware.ram.total = Math.round(parseInt(totalMatch[1]) / 1024); // Convert to MB
        hardware.ram.available = Math.round(parseInt(availableMatch[1]) / 1024);
      }
    } catch (error) {
      console.error('Failed to get RAM info:', error);
    }

    // Get CPU info
    try {
      const { stdout: cpuInfo } = await execAsync('lscpu');
      const modelMatch = cpuInfo.match(/Model name:\s+(.+)/);
      const coresMatch = cpuInfo.match(/CPU\(s\):\s+(\d+)/);

      if (modelMatch) hardware.cpu.model = modelMatch[1].trim();
      if (coresMatch) hardware.cpu.cores = parseInt(coresMatch[1]);
    } catch (error) {
      console.error('Failed to get CPU info:', error);
    }

    res.json(hardware);
  } catch (error) {
    console.error('Hardware detection error:', error);
    res.status(500).json({ error: 'Failed to detect hardware' });
  }
});

// ========== Disk Space Monitoring ==========

async function getDirectorySize(dirPath) {
  try {
    await fs.access(dirPath);
    const { stdout } = await execAsync(`du -sb "${dirPath}"`);
    const size = parseInt(stdout.split('\t')[0]);
    return size;
  } catch (error) {
    return 0;
  }
}

router.get('/disk-usage', async (req, res) => {
  try {
    const projectRoot = path.join(__dirname, '../../..');

    // Get sizes for different components
    const [
      modelsSize,
      gallerySize,
      totalDisk,
    ] = await Promise.all([
      // Ollama models location (common paths)
      getDirectorySize(process.env.OLLAMA_MODELS || '/usr/share/ollama/.ollama/models')
        .catch(() => getDirectorySize(path.join(process.env.HOME || '/root', '.ollama/models')))
        .catch(() => 0),

      // Generated images
      getDirectorySize(path.join(projectRoot, 'public/images')),

      // Total disk space
      execAsync('df -B1 . | tail -1').then(({ stdout }) => {
        const parts = stdout.trim().split(/\s+/);
        return {
          total: parseInt(parts[1]),
          used: parseInt(parts[2]),
          available: parseInt(parts[3]),
        };
      }),
    ]);

    // Get database size
    const dbSize = await prisma.$queryRaw`
      SELECT pg_database_size(current_database()) as size
    `.then(result => result[0]?.size || 0);

    // Calculate trash size (pending deletions in DB don't take much space, but count messages)
    const pendingDeletions = await prisma.conversation.count({
      where: { deletedAt: { not: null }, permanentDelete: false },
    });

    const diskUsage = {
      total: totalDisk.total,
      used: totalDisk.used,
      available: totalDisk.available,
      breakdown: {
        models: {
          bytes: modelsSize,
          label: 'AI Models',
        },
        database: {
          bytes: dbSize,
          label: 'Chats & Knowledge Base',
        },
        gallery: {
          bytes: gallerySize,
          label: 'Generated Images',
        },
        trash: {
          bytes: 0, // Soft deletes don't use extra space
          count: pendingDeletions,
          label: 'Pending Deletions',
        },
      },
    };

    res.json(diskUsage);
  } catch (error) {
    console.error('Disk usage error:', error);
    res.status(500).json({ error: 'Failed to get disk usage' });
  }
});

// ========== Settings Management ==========

// Get current default model
router.get('/settings/default-model', async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    res.json({ defaultModel: settings?.defaultModel || 'llama3.1:8b' });
  } catch (error) {
    console.error('Get default model error:', error);
    res.status(500).json({ error: 'Failed to get default model' });
  }
});

// Set default model
router.post('/settings/default-model', async (req, res) => {
  try {
    const { model } = req.body;

    if (!model) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: { defaultModel: model },
      create: { id: 1, defaultModel: model },
    });

    res.json({ success: true, defaultModel: settings.defaultModel });
  } catch (error) {
    console.error('Set default model error:', error);
    res.status(500).json({ error: 'Failed to set default model' });
  }
});

export default router;
