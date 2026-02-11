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

// 危险命令黑名单
const DANGEROUS_COMMANDS = [
  'rm', 'del', 'format', 'mkfs', 'fdisk', 'dd',
  'shutdown', 'reboot', 'halt', 'poweroff',
  'chmod', 'chown', 'sudo', 'su',
  'nc', 'netcat', 'telnet',
  'curl', 'wget' // 限制网络请求
];

// 命令别名映射
const COMMAND_ALIASES = {
  '列出文件': 'ls',
  '列出目录': 'ls -la',
  '查看当前目录': 'pwd',
  '查看文件内容': 'cat',
  '创建文件夹': 'mkdir',
  '删除文件': 'rm',
  '复制文件': 'cp',
  '移动文件': 'mv',
  '查看目录结构': 'tree',
  '查找文件': 'find',
  '查看进程': 'ps',
  '查看网络状态': 'netstat',
  '测试网络连通': 'ping',
  '查看系统信息': 'uname -a',
  '查看磁盘空间': 'df -h',
  '查看内存使用': 'free -h'
};

// 解析自然语言命令
function parseCommand(input) {
  const lower = input.toLowerCase().trim();
  
  // 检查是否匹配别名
  for (const [key, value] of Object.entries(COMMAND_ALIASES)) {
    if (lower.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // 如果是简单命令，直接返回
  if (/^[a-z][a-z0-9-]*$/.test(lower)) {
    return lower;
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
  
  // 设置超时
  const timeout = setTimeout(() => {
    callback({ 
      success: false, 
      error: '⏱️ 命令执行超时（30秒）',
      command: command
    });
  }, 30000);
  
  exec(command, { 
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
          command: command
        });
      }
    } else {
      callback({
        success: true,
        output: stdout || stderr,
        command: command
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
