#!/usr/bin/env node

/**
 * AImum 自动同步与记忆恢复系统
 * 
 * 功能：
 * 1. 自动检测 GitHub 连接
 * 2. 断网时自动保存进度
 * 3. 网络恢复后自动同步
 * 4. 会话开始时自动恢复上下文
 * 5. 定期保存记忆防止丢失
 */

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  projectPath: 'D:/openwork/00_active/aimum',
  memoryPath: 'D:/openwork/memory',
  githubRemote: 'origin',
  branch: 'master',
  syncInterval: 30000, // 30秒检查一次
  memoryInterval: 60000, // 60秒保存一次记忆
  maxRetries: 5,
  retryDelay: 5000 // 5秒重试
};

// 状态
let syncInProgress = false;
let lastSyncStatus = null;
let memoryLastSaved = Date.now();
let githubConnected = false;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(color, msg) {
  console.log(`${color}${msg}${colors.reset}`);
}

// 测试 GitHub 连接
function testGithubConnection() {
  try {
    execSync('git ls-remote --heads https://github.com/ailovem/aimum.git', {
      timeout: 10000,
      stdio: 'ignore'
    });
    return true;
  } catch (error) {
    return false;
  }
}

// 获取 Git 状态
function getGitStatus() {
  try {
    const status = execSync('git status --short', {
      cwd: CONFIG.projectPath,
      encoding: 'utf-8'
    }).trim();
    
    const ahead = execSync('git rev-list --count HEAD..origin/master', {
      cwd: CONFIG.projectPath,
      encoding: 'utf-8',
      stdio: 'ignore'
    }).trim();
    
    const behind = execSync('git rev-list --count origin/master..HEAD', {
      cwd: CONFIG.projectPath,
      encoding: 'utf-8',
      stdio: 'ignore'
    }).trim();
    
    return {
      hasChanges: status.length > 0,
      ahead: parseInt(ahead) || 0,
      behind: parseInt(behind) || 0,
      status
    };
  } catch (error) {
    return { error: error.message };
  }
}

// 保存记忆
function saveMemory() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const memoryFile = path.join(CONFIG.memoryPath, `${today}.md`);
  
  // 确保目录存在
  if (!fs.existsSync(CONFIG.memoryPath)) {
    fs.mkdirSync(CONFIG.memoryPath, { recursive: true });
  }
  
  // 获取 Git 状态
  const gitStatus = getGitStatus();
  
  // 记忆内容
  const memory = {
    timestamp: now.toISOString(),
    githubConnected,
    gitStatus,
    syncInProgress,
    lastSyncStatus
  };
  
  // 保存到文件
  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
  
  memoryLastSaved = Date.now();
  
  log(colors.cyan, `[记忆] 已保存到 ${memoryFile}`);
  
  return memory;
}

// 恢复记忆
function restoreMemory() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const memoryFile = path.join(CONFIG.memoryPath, `${today}.md`);
  
  if (fs.existsSync(memoryFile)) {
    try {
      const memory = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
      log(colors.green, '[恢复] 已从记忆恢复上下文');
      log(colors.cyan, `  - 上次 GitHub 连接: ${memory.githubConnected ? '✓' : '✗'}`);
      log(colors.cyan, `  - 本地领先: ${memory.gitStatus?.ahead || 0} commits`);
      return memory;
    } catch (error) {
      log(colors.red, '[恢复] 读取记忆失败:', error.message);
    }
  }
  
  return null;
}

// 同步代码
async function syncCode() {
  if (syncInProgress) {
    log(colors.yellow, '[同步] 同步已在进行中...');
    return;
  }
  
  syncInProgress = true;
  
  try {
    // 测试连接
    githubConnected = testGithubConnection();
    
    if (!githubConnected) {
      log(colors.red, '[同步] GitHub 不可达，保存记忆...');
      saveMemory();
      lastSyncStatus = { success: false, error: 'GitHub 不可达' };
      syncInProgress = false;
      return;
    }
    
    // 获取状态
    const status = getGitStatus();
    
    if (status.error) {
      log(colors.red, '[同步] 获取状态失败:', status.error);
      lastSyncStatus = { success: false, error: status.error };
      syncInProgress = false;
      return;
    }
    
    // 有未同步的提交
    if (status.ahead > 0) {
      log(colors.cyan, `[同步] 正在推送 ${status.ahead} 个提交...`);
      
      try {
        execSync('git push', {
          cwd: CONFIG.projectPath,
          timeout: 120000,
          stdio: 'inherit'
        });
        
        log(colors.green, '[同步] ✓ 推送成功！');
        lastSyncStatus = { success: true, commits: status.ahead };
      } catch (pushError) {
        log(colors.red, '[同步] ✗ 推送失败:', pushError.message);
        lastSyncStatus = { success: false, error: pushError.message };
        
        // 重试机制
        for (let i = 1; i <= CONFIG.maxRetries; i++) {
          log(colors.yellow, `[同步] 重试 ${i}/${CONFIG.maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
          
          try {
            execSync('git push', {
              cwd: CONFIG.projectPath,
              timeout: 120000,
              stdio: 'ignore'
            });
            log(colors.green, '[同步] ✓ 重试成功！');
            lastSyncStatus = { success: true, retries: i };
            break;
          } catch (retryError) {
            if (i === CONFIG.maxRetries) {
              log(colors.red, '[同步] ✗ 重试次数耗尽，保存记忆...');
              saveMemory();
            }
          }
        }
      }
    } else if (status.hasChanges) {
      log(colors.yellow, '[同步] 有未提交的更改，先提交...');
      
      try {
        execSync('git add -A', { cwd: CONFIG.projectPath, stdio: 'ignore' });
        execSync('git commit -m "Auto sync: 未命名更改"', {
          cwd: CONFIG.projectPath,
          stdio: 'ignore'
        });
        log(colors.green, '[同步] ✓ 提交成功');
      } catch (commitError) {
        log(colors.yellow, '[同步] 提交跳过（可能没有更改）');
      }
    } else {
      log(colors.cyan, '[同步] 代码已是最新');
      lastSyncStatus = { success: true, status: 'up-to-date' };
    }
    
  } catch (error) {
    log(colors.red, '[同步] 错误:', error.message);
    lastSyncStatus = { success: false, error: error.message };
  } finally {
    syncInProgress = false;
  }
}

// 自动同步循环
function startAutoSync() {
  log(colors.cyan, '\n🚀 启动自动同步系统...');
  log(colors.cyan, `   项目: ${CONFIG.projectPath}`);
  log(colors.cyan, `   同步间隔: ${CONFIG.syncInterval / 1000}秒`);
  log(colors.cyan, `   记忆保存间隔: ${CONFIG.memoryInterval / 1000}秒\n`);
  
  // 恢复记忆
  restoreMemory();
  
  // 立即同步一次
  syncCode();
  
  // 定时同步
  setInterval(() => {
    const now = Date.now();
    
    // 定期保存记忆
    if (now - memoryLastSaved > CONFIG.memoryInterval) {
      saveMemory();
    }
    
    // 同步代码
    syncCode();
    
  }, CONFIG.syncInterval);
}

// 手动触发同步
function manualSync() {
  log(colors.cyan, '\n🔄 手动触发同步...\n');
  syncCode();
}

// 导出状态
function getStatus() {
  return {
    githubConnected,
    syncInProgress,
    lastSyncStatus,
    memoryLastSaved,
    gitStatus: getGitStatus()
  };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'status') {
    const status = getStatus();
    console.log('\n📊 同步状态:');
    console.log(JSON.stringify(status, null, 2));
  } else if (args[0] === 'sync') {
    manualSync();
  } else if (args[0] === 'memory') {
    const memory = saveMemory();
    console.log('\n💾 记忆已保存:');
    console.log(JSON.stringify(memory, null, 2));
  } else if (args[0] === 'restore') {
    restoreMemory();
  } else {
    startAutoSync();
  }
}

module.exports = {
  syncCode,
  saveMemory,
  restoreMemory,
  getStatus,
  startAutoSync,
  manualSync
};
