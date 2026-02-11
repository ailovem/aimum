#!/usr/bin/env node

/**
 * AImum - 自动会话启动器
 * 
 * 功能：
 * 1. 每次会话开始自动读取记忆文件
 * 2. 恢复项目上下文
 * 3. 显示当前进度和下一步行动
 * 4. 集成到 OpenClaw 启动流程
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  // 记忆文件路径（按优先级排序）
  memoryFiles: [
    'D:/openwork/00_active/aimum/PRD.md',
    'D:/openwork/AIopenclaw/AImum-MEMORY.md',
    'C:/Users/dongd/.openclaw/workspace/MEMORY.md'
  ],
  
  // 项目信息
  project: {
    name: 'AImum',
    path: 'D:/openwork/00_active/aimum',
    github: 'https://github.com/ailovem/aimum'
  },
  
  // 会话恢复提示
  sessionReminder: `
═══════════════════════════════════════════════════════
         🦁 AImum 开发会话恢复
═══════════════════════════════════════════════════════

🎯 当前状态: Phase 1 - MVP 开发中
📊 当前进度: 16% (26h/200h)

📋 上次工作:
${getLastAction()}

📝 下一步行动:
${getNextActions()}

🔗 快速链接:
• PRD 文档: ${CONFIG.project.path}/PRD.md
• 进度追踪: ${CONFIG.project.path}/docs/TRACKER.md
• GitHub: ${CONFIG.project.github}

═══════════════════════════════════════════════════════
`
};

// 读取记忆文件
function readMemoryFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    console.error(`读取失败: ${filePath}`, error.message);
  }
  return null;
}

// 获取上次行动
function getLastAction() {
  const content = readMemoryFile(CONFIG.memoryFiles[1]);
  if (content) {
    const match = content.match(/lastAction.*?\n(.*?)\n/);
    if (match) return `• ${match[1].trim()}`;
  }
  return '• 继续开发 AImum';
}

// 获取下一步行动
function getNextActions() {
  const content = readMemoryFile(CONFIG.memoryFiles[1]);
  if (content) {
    const nextActions = content.match(/短期.*?\[ \].*?\n([\s\S]*?)(?=\n\n|$)/);
    if (nextActions) {
      return nextActions[1].replace(/^- \[ \]/gm, '○').trim();
    }
  }
  return '○ 推送代码到 GitHub\n○ 配置飞书 Webhook\n○ 继续开发功能';
}

// 生成会话报告
function generateSessionReport() {
  console.log(CONFIG.sessionReminder);
  
  // 提示用户确认
  console.log('\n💡 提示: 按 Enter 继续开发，或输入命令:');
  console.log('  status  - 查看详细进度');
  console.log('  tracker - 运行进度追踪');
  console.log('  deploy  - 部署项目');
  console.log('  quit    - 退出\n');
}

// 检查项目状态
function checkProjectStatus() {
  const projectPath = CONFIG.project.path;
  
  if (!fs.existsSync(projectPath)) {
    console.log(`❌ 项目不存在: ${projectPath}`);
    return false;
  }
  
  // 检查关键文件
  const keyFiles = [
    'PRD.md',
    'docs/TRACKER.md',
    'api/chat.js',
    'public/index.html'
  ];
  
  const missing = keyFiles.filter(file => 
    !fs.existsSync(path.join(projectPath, file))
  );
  
  if (missing.length > 0) {
    console.log(`⚠️ 缺失文件: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}

// 导出供其他模块使用
module.exports = {
  CONFIG,
  readMemoryFile,
  getLastAction,
  getNextActions,
  generateSessionReport,
  checkProjectStatus
};

// CLI 入口
if (require.main === module) {
  console.clear();
  
  console.log('🔍 检查项目状态...');
  const status = checkProjectStatus();
  
  if (status) {
    console.log('✅ 项目正常\n');
    generateSessionReport();
  } else {
    console.log('\n❌ 项目状态异常，请检查文件完整性');
    process.exit(1);
  }
}
