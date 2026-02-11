/**
 * AImum 自动会话钩子系统
 * 
 * 功能：
 * 1. 自动检测会话即将结束
 * 2. 在断篇前自动保存上下文
 * 3. 下次会话开始时自动恢复
 * 4. 渐进式恢复，不是全部覆盖
 */

const fs = require('fs');
const path = require('path');
const contextManager = require('./context-manager');

// 状态
let sessionStartTime = null;
let lastActivityTime = null;
const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5分钟无活动
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟会话超时

// 初始化
function init() {
  console.log('🔗 AImum 自动会话钩子系统已启动');
  
  // 初始化上下文管理器
  contextManager.initCoreState();
  
  // 开始会话
  startSession();
  
  // 设置检测定时器
  setInterval(checkSession, 30000); // 每30秒检查一次
}

// 开始会话
function startSession() {
  sessionStartTime = Date.now();
  lastActivityTime = Date.now();
  
  console.log('\n🆕 会话开始:', new Date().toLocaleString());
  
  // 渐进式恢复上下文
  const restoreResult = contextManager.progressiveRestore();
  
  // 增加会话计数
  contextManager.incrementSessionCount();
  
  // 保存会话开始状态
  contextManager.saveSessionState({
    type: 'session_start',
    time: sessionStartTime,
    restoreResult: restoreResult
  });
  
  return restoreResult;
}

// 记录活动
function recordActivity(activity) {
  lastActivityTime = Date.now();
  
  // 保存活动到会话状态
  contextManager.saveSessionState({
    type: 'activity',
    time: lastActivityTime,
    activity
  });
}

// 检测会话状态
function checkSession() {
  const now = Date.now();
  
  // 检测是否长时间无活动
  if (now - lastActivityTime > INACTIVITY_THRESHOLD) {
    console.log('\n⚠️ 检测到长时间无活动，自动保存上下文...');
    saveBeforeExit();
  }
  
  // 检测会话是否超时
  if (now - sessionStartTime > SESSION_TIMEOUT) {
    console.log('\n⏰ 会话超时，自动保存并准备退出...');
    saveBeforeExit();
    process.exit(0);
  }
}

// 保存上下文（断篇前）
function saveBeforeExit() {
  const now = Date.now();
  const duration = Math.round((now - sessionStartTime) / 1000);
  
  console.log(`\n💾 保存上下文... (会话时长: ${duration}秒)`);
  
  // 保存当前会话状态
  contextManager.saveSessionState({
    type: 'session_end',
    time: now,
    duration,
    autoSaved: true
  });
  
  console.log('✅ 上下文已保存！');
  console.log('   下次会话开始时会自动恢复。');
}

// 手动触发保存
function manualSave(message) {
  console.log(`\n💾 手动保存: ${message || ''}`);
  
  contextManager.saveSessionState({
    type: 'manual_save',
    time: Date.now(),
    message
  });
  
  console.log('✅ 已保存！');
}

// 获取会话状态
function getSessionStatus() {
  const now = Date.now();
  const coreState = contextManager.readCoreState();
  
  return {
    isActive: now - sessionStartTime < SESSION_TIMEOUT,
    duration: Math.round((now - sessionStartTime) / 1000),
    idle: now - lastActivityTime,
    progress: coreState.progress,
    phase: coreState.phase,
    nextActions: coreState.nextActions
  };
}

// 渐进式恢复（供外部调用）
function restore() {
  return contextManager.progressiveRestore();
}

// 添加任务完成
function completeTask(taskName) {
  contextManager.completeNextAction(taskName);
  manualSave(`完成任务: ${taskName}`);
}

// 添加下一步行动
function addAction(action) {
  contextManager.addNextAction(action);
  manualSave(`添加行动: ${action}`);
}

// 导出
module.exports = {
  init,
  startSession,
  recordActivity,
  saveBeforeExit,
  manualSave,
  getSessionStatus,
  restore,
  completeTask,
  addAction
};

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'test') {
    console.log('🧪 测试会话钩子系统...\n');
    
    init();
    
    console.log('\n📊 会话状态:');
    console.log(JSON.stringify(getSessionStatus(), null, 2));
    
    console.log('\n✅ 测试完成！');
  } else if (args[0] === 'restore') {
    console.log('🔄 恢复上下文...\n');
    const result = restore();
    console.log('\n✅ 恢复完成！');
  } else if (args[0] === 'status') {
    console.log('📊 会话状态:');
    console.log(JSON.stringify(getSessionStatus(), null, 2));
  } else {
    console.log('用法:');
    console.log('  node session-hook.js test     - 测试');
    console.log('  node session-hook.js restore - 恢复上下文');
    console.log('  node session-hook.js status  - 查看状态');
  }
}
