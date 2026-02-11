// AImum API - Progress Tracking

const TRACKER = require('../scripts/tracker');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'status':
        return handleStatus(res);
      case 'update':
        return handleUpdate(req, res);
      case 'report':
        return handleReport(res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

function handleStatus(res) {
  const { total, completed, percent } = TRACKER.calculateProgress();
  
  return res.json({
    success: true,
    progress: {
      total,
      completed,
      percent,
      bar: TRACKER.generateProgressBar(percent)
    },
    phases: {
      phase1: {
        name: 'Phase 1: MVP',
        completed: TRACKER.PROGRESS.phase1.completed,
        total: TRACKER.PROGRESS.phase1.total,
        percent: Math.round((TRACKER.PROGRESS.phase1.completed / TRACKER.PROGRESS.phase1.total) * 100)
      },
      phase2: {
        name: 'Phase 2: 增强',
        completed: TRACKER.PROGRESS.phase2.completed,
        total: TRACKER.PROGRESS.phase2.total,
        percent: Math.round((TRACKER.PROGRESS.phase2.completed / TRACKER.PROGRESS.phase2.total) * 100)
      },
      phase3: {
        name: 'Phase 3: 生态',
        completed: TRACKER.PROGRESS.phase3.completed,
        total: TRACKER.PROGRESS.phase3.total,
        percent: Math.round((TRACKER.PROGRESS.phase3.completed / TRACKER.PROGRESS.phase3.total) * 100)
      }
    }
  });
}

function handleUpdate(req, res) {
  const { phase, task, status, pr } = req.body;
  
  if (!phase || !task || !status) {
    return res.status(400).json({ 
      error: 'Missing required fields: phase, task, status' 
    });
  }
  
  const success = TRACKER.updateTaskStatus(phase, task, status, pr);
  
  if (!success) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const { percent } = TRACKER.calculateProgress();
  const report = TRACKER.generateReport();
  
  return res.json({
    success: true,
    message: `Task "${task}" updated to ${status}`,
    currentProgress: percent,
    report
  });
}

function handleReport(res) {
  const report = TRACKER.generateReport();
  
  return res.json({
    success: true,
    report,
    generatedAt: new Date().toISOString()
  });
}
