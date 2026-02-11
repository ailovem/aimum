const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

const PORT = 3456;
const STATIC_DIR = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

// Windows 命令兼容
const WINDOWS_COMMANDS = {
  'pwd': 'cd',
  'clear': 'cls',
  'mkdir': 'mkdir',
  'rm': 'del /q',
  'rm -rf': 'rmdir /s /q',
  'cat': 'type',
  'ls': 'dir',
  'ls -la': 'dir /a',
  'touch': 'echo. >',
  'which': 'where',
  'ps aux': 'tasklist',
  'kill': 'taskkill /pid'
};

// 命令别名映射
const COMMAND_ALIASES = {
  // 基础命令（Windows兼容）
  '列出文件': 'dir',
  '列出目录': 'dir',
  '查看当前目录': 'cd',
  '查看文件内容': 'type',
  '创建文件夹': 'mkdir',
  '删除文件': 'del /q',
  '删除文件夹': 'rmdir /s /q',
  '复制文件': 'copy',
  '移动文件': 'move',
  '清除屏幕': 'cls',
  '查看进程': 'tasklist',
  
  // Node.js
  '查看node版本': 'node -v',
  '查看npm版本': 'npm -v',
  'node版本': 'node -v',
  'npm版本': 'npm -v',
  
  // 系统信息
  '查看系统信息': 'ver',
  '查看用户名': 'whoami',
  '当前用户': 'whoami',
  '查看IP地址': 'ipconfig',
  '本机IP': 'ipconfig',
  '查看磁盘空间': 'dir',
  
  // Git
  '查看git状态': 'git status',
  'git状态': 'git status',
  '查看git日志': 'git log --oneline -10',
  'git日志': 'git log --oneline -10',
  
  // 其他
  '当前时间': 'time /t',
  '日期': 'date /t'
};

// 危险命令黑名单
const DANGEROUS_COMMANDS = [
  'rm', 'del', 'format', 'mkfs', 'fdisk', 'dd',
  'shutdown', 'reboot', 'halt', 'poweroff',
  'chmod', 'chown', 'sudo', 'su',
  'nc', 'netcat', 'telnet',
  'curl', 'wget' // 限制网络请求
];

// Windows 命令兼容映射
function windowsCommand(cmd) {
  const parts = cmd.split(' ');
  const base = parts[0].toLowerCase();
  
  const WINDOWS_COMMANDS = {
    'pwd': 'cd',
    'clear': 'cls',
    'mkdir': 'mkdir',
    'rm': 'del /q',
    'rm -rf': 'rmdir /s /q',
    'cat': 'type',
    'ls': 'dir',
    'ls -la': 'dir /a',
    'touch': 'echo. >',
    'which': 'where',
    'ps aux': 'tasklist',
    'kill': 'taskkill /pid'
  };
  
  if (WINDOWS_COMMANDS[base]) {
    parts[0] = WINDOWS_COMMANDS[base];
    return parts.join(' ');
  }
  return cmd;
}

// 自然语言转 Shell 命令
function parseNaturalLanguage(input) {
  const desktopPath = '%USERPROFILE%\\Desktop';
  
  // ============ 基础命令 ============
  const lower = input.toLowerCase().trim();
  if (lower === 'node -v') return 'node -v';
  if (lower === 'npm -v') return 'npm -v';
  if (lower === 'pwd') return 'cd';
  if (lower === 'ls') return 'dir';
  if (lower === 'ls -la') return 'dir /a';
  if (lower === 'whoami') return 'whoami';
  if (lower === 'uname -a') return 'ver';
  if (lower === 'date') return 'date /t';
  if (lower === 'clear') return 'cls';
  
  // ============ 创建桌面文件夹 ============
  // "在桌面创建一个 xxx 文件夹"
  if (input.includes('在桌面') && input.includes('文件夹')) {
    // 提取文件夹名称：去掉"在桌面创建一个 "和" 文件夹"
    let name = input
      .replace('在桌面创建一个 ', '')
      .replace('在桌面创建一个', '')
      .replace('创建一个 ', '')
      .replace('创建一个', '')
      .replace(' 文件夹', '')
      .trim();
    
    if (name && name.length > 0) {
      return `mkdir "${desktopPath}\\${name}"`;
    }
  }
  
  // "在桌面上创建一个 xxx 文件夹"
  if (input.includes('在桌面上') && input.includes('文件夹')) {
    let name = input
      .replace('在桌面上创建一个 ', '')
      .replace('在桌面上创建', '')
      .replace(' 文件夹', '')
      .trim();
    
    if (name && name.length > 0) {
      return `mkdir "${desktopPath}\\${name}"`;
    }
  }
  
  // ============ 创建桌面文件 ============
  if (input.includes('在桌面') && input.includes('文件')) {
    let name = input
      .replace('在桌面创建一个 ', '')
      .replace('在桌面创建', '')
      .replace(' 文件', '')
      .replace('文件', '')
      .trim();
    
    if (name && name.length > 0) {
      if (!name.includes('.')) {
        name += '.txt';
      }
      return `echo. > "${desktopPath}\\${name}"`;
    }
  }
  
  return null;
}

// 解析自然语言命令
function parseCommand(input) {
  const trimmed = input.trim();
  
  // 1. 先尝试自然语言转换
  const naturalResult = parseNaturalLanguage(trimmed);
  if (naturalResult) {
    return naturalResult;
  }
  
  const lower = trimmed.toLowerCase();
  
  // 2. 检查是否匹配别名
  for (const [key, value] of Object.entries(COMMAND_ALIASES)) {
    if (lower.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // 3. Windows 原生命令直接返回
  const windowsCommands = ['dir', 'type', 'copy', 'move', 'del', 'mkdir', 'rd', 'cd', 'echo', 'cls', 'date', 'time', 'ver', 'vol', 'path', 'prompt', 'title', 'mode', 'color'];
  if (windowsCommands.includes(lower.split(' ')[0])) {
    return trimmed;
  }
  
  // 4. 如果是简单命令，直接返回
  if (/^[a-z][a-z0-9-]*(\s+[%a-z0-9\-_\\\/."]+)*$/i.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

// 执行 Shell 命令
function executeCommand(command, callback) {
  // 检查危险命令
  const cmdParts = command.split(' ');
  const baseCmd = cmdParts[0].toLowerCase();
  
  if (DANGEROUS_COMMANDS.includes(baseCmd)) {
    callback({ 
      success: false, 
      error: '⚠️ 安全限制：禁止执行危险命令',
      command: command
    });
    return;
  }
  
  // 限制命令长度
  if (command.length > 500) {
    callback({ 
      success: false, 
      error: '⚠️ 命令过长，请简化',
      command: command
    });
    return;
  }
  
  // Windows 命令兼容
  let windowsCmd = windowsCommand(command);
  
  // 设置超时
  const timeout = setTimeout(() => {
    callback({ 
      success: false, 
      error: '⏱️ 命令执行超时（30秒）',
      command: command
    });
  }, 30000);
  
  exec(windowsCmd, { 
    encoding: 'utf8',
    timeout: 25000,
    maxBuffer: 1024 * 1024 // 1MB 输出限制
  }, (error, stdout, stderr) => {
    clearTimeout(timeout);
    
    if (error) {
      if (error.killed) {
        callback({ 
          success: false, 
          error: '⏱️ 命令执行超时',
          command: command
        });
      } else {
        callback({ 
          success: false, 
          error: error.message,
          code: error.code,
          command: command,
          windowsCommand: windowsCmd
        });
      }
    } else {
      callback({
        success: true,
        output: stdout || stderr,
        command: command,
        windowsCommand: windowsCmd
      });
    }
  });
}

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // API 路由
  if (req.url.startsWith('/api/')) {
    const apiPath = req.url.slice(4);
    
    // 执行命令 API
    if (apiPath === '/execute' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const command = data.command || '';
          
          if (!command) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: '缺少命令参数' }));
            return;
          }
          
          // 先尝试解析自然语言
          let actualCommand = parseCommand(command);
          if (!actualCommand) {
            actualCommand = command;
          }
          
          executeCommand(actualCommand, (result) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ...result,
              parsedCommand: actualCommand,
              timestamp: new Date().toISOString()
            }));
          });
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: '请求格式错误' }));
        }
      });
      return;
    }
    
    // 获取命令历史
    if (apiPath === '/history' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        commands: COMMAND_ALIASES,
        dangerous: DANGEROUS_COMMANDS
      }));
      return;
    }
    
    // 未知 API
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'API 不存在' }));
    return;
  }
  
  // 静态文件服务
  let urlPath = req.url.split('?')[0];
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  filePath = path.join(STATIC_DIR, filePath);
  
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'text/plain';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found: ' + urlPath);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log('✅ AImum Server running!');
  console.log('📍 http://localhost:' + PORT + '/');
  console.log('🔧 Shell Execute API: POST /api/execute');
});
