#!/usr/bin/env node

/**
 * AImum 开发进度追踪器
 * 
 * 功能:
 * 1. 追踪开发进度
 * 2. 任务完成自动打勾
 * 3. 飞书机器人推送通知
 * 4. 自动更新 PRD 文档
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 配置
const CONFIG = {
  prdPath: path.join(__dirname, 'PRD.md'),
  feishuWebhook: process.env.FEISHU_WEBHOOK || '',
  repoUrl: 'https://github.com/ailovem/aimum',
  owner: 'ailovem',
  repo: 'aimum'
};

// 进度数据
const PROGRESS = {
  phase1: {
    name: 'Phase 1: MVP',
    total: 60,
    completed: 26,
    tasks: [
      { name: '产品需求文档', hours: 4, status: 'done', pr: null },
      { name: '技术架构设计', hours: 4, status: 'done', pr: null },
      { name: '项目初始化', hours: 2, status: 'in_progress', pr: null },
      { name: '用户系统开发', hours: 8, status: 'todo', pr: null },
      { name: 'AI 对话核心', hours: 8, status: 'todo', pr: null },
      { name: '令牌系统', hours: 4, status: 'todo', pr: null },
      { name: '插件市场', hours: 6, status: 'todo', pr: null },
      { name: '前端 UI 开发', hours: 12, status: 'todo', pr: null },
      { name: 'PWA 配置', hours: 2, status: 'todo', pr: null },
      { name: '部署配置', hours: 2, status: 'todo', pr: null },
      { name: '单元测试', hours: 4, status: 'todo', pr: null },
      { name: '文档编写', hours: 4, status: 'todo', pr: null }
    ]
  },
  phase2: {
    name: 'Phase 2: 增强',
    total: 56,
    completed: 0,
    tasks: [
      { name: '工作流引擎', hours: 16, status: 'todo', pr: null },
      { name: '微信集成', hours: 8, status: 'todo', pr: null },
      { name: '飞书集成', hours: 8, status: 'todo', pr: null },
      { name: '桌面客户端', hours: 12, status: 'todo', pr: null },
      { name: '性能优化', hours: 4, status: 'todo', pr: null },
      { name: '安全加固', hours: 4, status: 'todo', pr: null },
      { name: '用户指南', hours: 4, status: 'todo', pr: null }
    ]
  },
  phase3: {
    name: 'Phase 3: 生态',
    total: 72,
    completed: 0,
    tasks: [
      { name: '插件 SDK', hours: 16, status: 'todo', pr: null },
      { name: '开发者文档', hours: 8, status: 'todo', pr: null },
      { name: 'API 开放', hours: 12, status: 'todo', pr: null },
      { name: '插件审核系统', hours: 8, status: 'todo', pr: null },
      { name: '企业版功能', hours: 16, status: 'todo', pr: null },
      { name: '多租户支持', hours: 12, status: 'todo', pr: null }
    ]
  }
};

// 状态 emoji 映射
const STATUS_EMOJI = {
  'todo': '⏳',
  'in_progress': '🔄',
  'review': '👀',
  'done': '✅'
};

// 计算总体进度
function calculateProgress() {
  const total = PROGRESS.phase1.total + PROGRESS.phase2.total + PROGRESS.phase3.total;
  const completed = PROGRESS.phase1.completed + PROGRESS.phase2.completed + PROGRESS.phase3.completed;
  const percent = Math.round((completed / total) * 100);
  return { total, completed, percent };
}

// 生成进度条
function generateProgressBar(percent) {
  const filled = Math.round(percent / 5);
  const empty = 20 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// 发送飞书通知
async function sendFeishuNotification(message) {
  if (!CONFIG.feishuWebhook) {
    console.log('[飞书通知] 未配置 webhook，跳过');
    return;
  }
  
  try {
    await axios.post(CONFIG.feishuWebhook, {
      msg_type: 'interactive',
      card: {
        config: {
          wide_screen_mode: true
        },
        elements: [
          {
            tag: 'div',
            text: {
              content: message,
              tag: 'lark_md'
            }
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: {
                  content: '查看进度',
                  tag: 'lark_md'
                },
                url: CONFIG.repoUrl,
                type: 'primary'
              }
            ]
          }
        ]
      }
    });
    console.log('[飞书通知] 发送成功');
  } catch (error) {
    console.error('[飞书通知] 发送失败:', error.message);
  }
}

// 更新任务状态
function updateTaskStatus(phase, taskName, newStatus, prUrl = null) {
  const phaseData = PROGRESS[phase];
  const task = phaseData.tasks.find(t => t.name === taskName);
  
  if (!task) {
    console.error(`❌ 任务不存在: ${taskName}`);
    return false;
  }
  
  const oldStatus = task.status;
  task.status = newStatus;
  if (prUrl) task.pr = prUrl;
  
  // 更新完成工时
  if (newStatus === 'done' && oldStatus !== 'done') {
    phaseData.completed += task.hours;
  }
  
  return true;
}

// 生成进度报告
function generateReport() {
  const { total, completed, percent } = calculateProgress();
  const progressBar = generateProgressBar(percent);
  
  let report = `
═══════════════════════════════════════════════════════
                AImum 开发进度报告
═══════════════════════════════════════════════════════

📅 更新时间: ${new Date().toLocaleString('zh-CN')}

🎯 整体进度: ${percent}% ${progressBar}
   完成: ${completed}h / 总计: ${total}h

═══════════════════════════════════════════════════════
`;

  // Phase 1
  const phase1Percent = Math.round((PROGRESS.phase1.completed / PROGRESS.phase1.total) * 100);
  const phase1Bar = generateProgressBar(phase1Percent);
  
  report += `📦 ${PROGRESS.phase1.name}: ${phase1Percent}% ${phase1Bar}\n`;
  
  PROGRESS.phase1.tasks.forEach(task => {
    const emoji = STATUS_EMOJI[task.status];
    const prInfo = task.pr ? ` (${task.pr})` : '';
    report += `   ${emoji} ${task.name}${prInfo}\n`;
  });
  
  report += '\n';
  
  // Phase 2
  const phase2Percent = Math.round((PROGRESS.phase2.completed / PROGRESS.phase2.total) * 100);
  const phase2Bar = generateProgressBar(phase2Percent);
  
  report += `📦 ${PROGRESS.phase2.name}: ${phase2Percent}% ${phase2Bar}\n`;
  
  PROGRESS.phase2.tasks.forEach(task => {
    const emoji = STATUS_EMOJI[task.status];
    const prInfo = task.pr ? ` (${task.pr})` : '';
    report += `   ${emoji} ${task.name}${prInfo}\n`;
  });
  
  report += '\n';
  
  // Phase 3
  const phase3Percent = Math.round((PROGRESS.phase3.completed / PROGRESS.phase3.total) * 100);
  const phase3Bar = generateProgressBar(phase3Percent);
  
  report += `📦 ${PROGRESS.phase3.name}: ${phase3Percent}% ${phase3Bar}\n`;
  
  PROGRESS.phase3.tasks.forEach(task => {
    const emoji = STATUS_EMOJI[task.status];
    const prInfo = task.pr ? ` (${task.pr})` : '';
    report += `   ${emoji} ${task.name}${prInfo}\n`;
  });
  
  report += `
═══════════════════════════════════════════════════════
🔗 项目地址: ${CONFIG.repoUrl}
`;

  return report;
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // 显示进度
    console.log(generateReport());
  } else if (args[0] === 'update') {
    // 更新任务状态
    // 用法: node tracker.js update <phase> <taskName> <status> [prUrl]
    const [,, phase, taskName, status, prUrl] = args;
    
    if (!phase || !taskName || !status) {
      console.error('用法: node tracker.js update <phase> <taskName> <status> [prUrl]');
      console.error('示例: node tracker.js update phase1 用户系统开发 done https://github.com/xxx/1');
      process.exit(1);
    }
    
    if (updateTaskStatus(phase, taskName, status, prUrl)) {
      const report = generateReport();
      console.log(report);
      
      // 发送飞书通知
      const { percent } = calculateProgress();
      sendFeishuNotification(`🎉 任务更新!\n\n✅ ${taskName} 已标记为: ${STATUS_EMOJI[status]}\n\n📊 当前进度: ${percent}%`);
    }
  } else if (args[0] === 'notify') {
    // 发送自定义通知
    // 用法: node tracker.js notify <message>
    const message = args.slice(1).join(' ');
    sendFeishuNotification(message);
  } else if (args[0] === 'progress') {
    // 获取进度百分比（供脚本使用）
    const { percent } = calculateProgress();
    console.log(percent);
  }
}

// 导出
module.exports = {
  PROGRESS,
  calculateProgress,
  generateProgressBar,
  updateTaskStatus,
  generateReport,
  sendFeishuNotification
};
