/**
 * AImum 智能会话启动器
 * 
 * 特点：
 * 1. 不是简单恢复全部上下文
 * 2. 渐进式恢复（核心状态 → 最近会话）
 * 3. 自动触发，无需手动操作
 * 4. 在断篇前自动保存
 */

const fs = require('fs');
const path = require('path');

const PROJECT_PATH = 'D:/openwork/00_active/aimum';

// ANSI 颜色
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};

function log(color, msg) {
  console.log(`${color}${msg}${colors.reset}`);
}

function clearScreen() {
  console.clear();
}

// 读取核心状态
function readCoreState() {
  const coreFile = path.join(PROJECT_PATH, '.core-state.json');
  try {
    if (fs.existsSync(coreFile)) {
      return JSON.parse(fs.readFileSync(coreFile, 'utf-8'));
    }
  } catch (e) {}
  return null;
}

// 读取最近会话
function readLatestSession() {
  const sessionDir = path.join(PROJECT_PATH, '.sessions');
  try {
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir)
        .filter(f => f.startsWith('session-') && f.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a));
      
      if (files.length > 0) {
        const content = fs.readFileSync(path.join(sessionDir, files[0]), 'utf-8');
        return JSON.parse(content);
      }
    }
  } catch (e) {}
  return null;
}

// 显示核心状态
function displayCoreState(state) {
  if (!state) return;
  
  console.log('\n' + colors.cyan + '╔═══════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║' + colors.reset + '               🦁 AImum 项目状态                     ' + colors.cyan + '║' + colors.reset);
  console.log(colors.cyan + '╚═══════════════════════════════════════════════════════╝' + colors.reset + '\n');
  
  log(colors.bold, `📦 项目: ${state.projectName || 'AImum'}`);
  log(colors.blue, `📊 阶段: ${state.phase || 'Phase 1 - MVP'}`);
  log(colors.green, `🎯 进度: ${state.progress || 0}%\n`);
  
  if (state.completedTasks && state.completedTasks.length > 0) {
    log(colors.bold, '✅ 已完成任务:');
    state.completedTasks.forEach(task => {
      log(colors.green, `   ✓ ${task}`);
    });
    console.log('');
  }
  
  if (state.nextActions && state.nextActions.length > 0) {
    log(colors.bold, '📝 下一步行动:');
    state.nextActions.forEach((action, i) => {
      log(colors.yellow, `   ${i + 1}. ${action}`);
    });
    console.log('');
  }
}

// 显示最近会话摘要
function displaySessionSummary(session) {
  if (!session) return;
  
  log(colors.bold, '📖 最近会话:');
  log(colors.blue, `   时间: ${new Date(session.timestamp).toLocaleString()}`);
  
  if (session.summary) {
    const lines = session.summary.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      log(colors.blue, '   摘要:');
      lines.slice(0, 5).forEach(line => {
        console.log(`      ${line.trim()}`);
      });
    }
  }
  console.log('');
}

// 生成会话启动报告
function generateReport() {
  clearScreen();
  
  log(colors.cyan, '🦁 AImum - 智能会话启动器\n');
  
  // 检查项目
  if (!fs.existsSync(PROJECT_PATH)) {
    log(colors.red, `❌ 项目不存在: ${PROJECT_PATH}`);
    return;
  }
  
  // 读取状态
  const coreState = readCoreState();
  const latestSession = readLatestSession();
  
  // 显示核心状态
  displayCoreState(coreState);
  
  // 显示最近会话
  displaySessionSummary(latestSession);
  
  // 快捷命令
  log(colors.bold, '🔧 快捷命令:');
  console.log(`   ${colors.green}npm run status${colors.reset}   - 查看状态`);
  console.log(`   ${colors.green}npm run tracker${colors.reset} - 进度追踪`);
  console.log(`   ${colors.green}npm run dev${colors.reset}    - 本地开发`);
  console.log(`   ${colors.green}npm run save${colors.reset}   - 手动保存`);
  console.log('');
  
  // 下一步提示
  log(colors.bold, '💡 下一步:');
  if (coreState && coreState.nextActions && coreState.nextActions.length > 0) {
    log(colors.yellow, `   → ${coreState.nextActions[0]}`);
  } else {
    log(colors.yellow, '   → 检查项目状态，开始开发');
  }
  console.log('');
}

// 导出供外部使用
module.exports = {
  generateReport,
  readCoreState,
  readLatestSession
};

// CLI 入口
if (require.main === module) {
  generateReport();
}
