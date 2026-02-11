/**
 * AImum 智能上下文管理系统
 * 
 * 功能：
 * 1. 预防性自动保存（在断篇前）
 * 2. 渐进式上下文恢复（不是全部恢复）
 * 3. 核心状态永久保留
 * 4. 自动触发，无需手动操作
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  // 核心状态文件（永久保留，不会被压缩）
  coreState: {
    file: 'D:/openwork/00_active/aimum/.core-state.json',
    data: {
      projectName: 'AImum',
      phase: 'Phase 1 - MVP',
      progress: 16,
      completedTasks: [
        'PRD文档',
        '技术架构设计',
        '进度追踪系统',
        'API文档'
      ],
      nextActions: [
        '推送代码到GitHub',
        '配置飞书Webhook',
        '开发用户系统'
      ],
      lastUpdated: null,
      sessionCount: 0
    }
  },
  
  // 会话状态文件（可被清除）
  sessionState: {
    dir: 'D:/openwork/00_active/aimum/.sessions',
    currentFile: null
  },
  
  // 重要上下文（必须保留）
  criticalContext: [
    '当前开发的功能模块',
    '最近修改的文件',
    '未完成的工作',
    '关键决策'
  ]
};

// 初始化核心状态
function initCoreState() {
  const { coreState } = CONFIG;
  
  if (!fs.existsSync(coreState.file)) {
    const dir = path.dirname(coreState.file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    coreState.data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(coreState.file, JSON.stringify(coreState.data, null, 2));
    console.log('✅ 初始化核心状态文件');
  }
}

// 读取核心状态
function readCoreState() {
  try {
    const content = fs.readFileSync(CONFIG.coreState.file, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return CONFIG.coreState.data;
  }
}

// 更新核心状态
function updateCoreState(updates) {
  const state = readCoreState();
  const updated = { ...state, ...updates, lastUpdated: new Date().toISOString() };
  fs.writeFileSync(CONFIG.coreState.file, JSON.stringify(updated, null, 2));
  return updated;
}

// 保存会话状态（临时）
function saveSessionState(context) {
  const { sessionState } = CONFIG;
  
  if (!fs.existsSync(sessionState.dir)) {
    fs.mkdirSync(sessionState.dir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const filename = `session-${timestamp}.json`;
  const filepath = path.join(sessionState.dir, filename);
  
  const sessionData = {
    timestamp,
    context,
    summary: generateSummary(context)
  };
  
  fs.writeFileSync(filepath, JSON.stringify(sessionData, null, 2));
  sessionState.currentFile = filepath;
  
  return filepath;
}

// 生成上下文摘要
function generateSummary(context) {
  if (!context) return '';
  
  const lines = context.split('\n').filter(l => l.trim());
  if (lines.length === 0) return '';
  
  // 只保留关键信息
  const critical = lines.filter(l => 
    l.includes('正在开发') || 
    l.includes('已完成') || 
    l.includes('下一步') ||
    l.includes('文件') ||
    l.includes('错误') ||
    l.includes('问题')
  );
  
  return critical.slice(-20).join('\n'); // 只保留最近20行关键信息
}

// 渐进式恢复（不是全部恢复）
function progressiveRestore() {
  console.log('\n🔄 渐进式上下文恢复...\n');
  
  // 1. 恢复核心状态（必须保留）
  const coreState = readCoreState();
  console.log('✅ 核心状态已恢复:');
  console.log(`   项目: ${coreState.projectName}`);
  console.log(`   阶段: ${coreState.phase}`);
  console.log(`   进度: ${coreState.progress}%`);
  
  // 2. 显示已完成任务
  console.log('\n📦 已完成任务:');
  coreState.completedTasks.forEach(task => {
    console.log(`   ✅ ${task}`);
  });
  
  // 3. 显示下一步行动
  console.log('\n📝 下一步行动:');
  coreState.nextActions.forEach((action, i) => {
    console.log(`   ${i + 1}. ${action}`);
  });
  
  // 4. 尝试恢复最近的会话状态（如果有）
  const latestSession = getLatestSession();
  if (latestSession) {
    console.log('\n📖 最近会话摘要:');
    console.log(latestSession.summary || '(无摘要)');
  }
  
  return {
    coreState,
    latestSession
  };
}

// 获取最近的会话状态
function getLatestSession() {
  const { sessionState } = CONFIG;
  
  if (!fs.existsSync(sessionState.dir)) return null;
  
  const files = fs.readdirSync(sessionState.dir)
    .filter(f => f.startsWith('session-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      time: parseInt(f.replace('session-', '').replace('.json', ''))
    }))
    .sort((a, b) => b.time - a.time);
  
  if (files.length === 0) return null;
  
  try {
    const content = fs.readFileSync(
      path.join(sessionState.dir, files[0].name), 
      'utf-8'
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// 添加已完成任务
function addCompletedTask(task) {
  const state = readCoreState();
  if (!state.completedTasks.includes(task)) {
    state.completedTasks.push(task);
    updateCoreState({ completedTasks: state.completedTasks });
  }
}

// 添加下一步行动
function addNextAction(action) {
  const state = readCoreState();
  if (!state.nextActions.includes(action)) {
    state.nextActions.push(action);
    updateCoreState({ nextActions: state.nextActions });
  }
}

// 完成下一步行动
function completeNextAction(action) {
  const state = readCoreState();
  state.nextActions = state.nextActions.filter(a => a !== action);
  updateCoreState({ nextActions: state.nextActions });
  
  // 添加到已完成
  if (!state.completedTasks.includes(action)) {
    state.completedTasks.push(action);
    updateCoreState({ completedTasks: state.completedTasks });
  }
}

// 增加会话计数
function incrementSessionCount() {
  const state = readCoreState();
  state.sessionCount = (state.sessionCount || 0) + 1;
  updateCoreState({ sessionCount: state.sessionCount });
}

// 生成恢复报告
function generateRestoreReport() {
  const coreState = readCoreState();
  const latestSession = getLatestSession();
  
  return {
    timestamp: new Date().toISOString(),
    project: coreState.projectName,
    phase: coreState.phase,
    progress: coreState.progress,
    completedTasks: coreState.completedTasks,
    nextActions: coreState.nextActions,
    sessionCount: coreState.sessionCount,
    latestSession: latestSession ? {
      timestamp: new Date(latestSession.timestamp).toLocaleString(),
      summary: latestSession.summary
    } : null
  };
}

// 导出供外部使用
module.exports = {
  CONFIG,
  initCoreState,
  readCoreState,
  updateCoreState,
  saveSessionState,
  progressiveRestore,
  addCompletedTask,
  addNextAction,
  completeNextAction,
  incrementSessionCount,
  generateRestoreReport
};

// CLI 测试
if (require.main === module) {
  console.log('🧪 测试智能上下文管理系统...\n');
  
  initCoreState();
  const report = generateRestoreReport();
  
  console.log('📊 恢复报告:');
  console.log(JSON.stringify(report, null, 2));
  
  console.log('\n✅ 测试完成！');
}
