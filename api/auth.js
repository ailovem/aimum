/**
 * AImum 用户认证 API
 * 
 * 功能：
 * 1. 用户注册/登录（手机号 + 验证码）
 * 2. JWT Token 发行
 * 3. 验证码发送
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// 配置
const CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'aimum-secret-key-2026',
  JWT_EXPIRES: process.env.JWT_EXPIRES || '7d',
  VERIFY_CODE_EXPIRES: 5 * 60 * 1000, // 5分钟
  
  // 验证码存储（生产环境用 Redis）
  verifyCodes: new Map(),
  
  // 用户存储（生产环境用数据库）
  users: new Map()
};

// 生成验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 生成 JWT Token
function generateToken(userId, phone) {
  const payload = {
    userId,
    phone,
    iat: Date.now()
  };
  
  return jwt.sign(payload, CONFIG.JWT_SECRET, {
    expiresIn: CONFIG.JWT_EXPIRES
  });
}

// 验证验证码
function verifyCode(phone, code) {
  const stored = CONFIG.verifyCodes.get(phone);
  
  if (!stored) {
    return { success: false, error: '验证码已过期或未发送' };
  }
  
  if (Date.now() > stored.expires) {
    CONFIG.verifyCodes.delete(phone);
    return { success: false, error: '验证码已过期' };
  }
  
  if (stored.code !== code) {
    return { success: false, error: '验证码错误' };
  }
  
  // 验证成功后删除验证码
  CONFIG.verifyCodes.delete(phone);
  
  return { success: true };
}

// 发送验证码（模拟发送）
async function sendVerifyCode(phone) {
  // 生成验证码
  const code = generateCode();
  
  // 存储验证码
  CONFIG.verifyCodes.set(phone, {
    code,
    expires: Date.now() + CONFIG.VERIFY_CODE_EXPIRES
  });
  
  // TODO: 集成实际短信服务
  // - Twilio (国际短信)
  // - 阿里云短信 (国内)
  // - 飞书消息
  
  console.log(`[短信] 发送验证码到 ${phone}: ${code}`);
  
  return {
    success: true,
    message: '验证码已发送',
    // 开发环境返回验证码
    code: process.env.NODE_ENV === 'development' ? code : undefined
  };
}

// 用户注册
async function register(phone, code, nickname) {
  // 验证验证码
  const verifyResult = verifyCode(phone, code);
  if (!verifyResult.success) {
    return verifyResult;
  }
  
  // 检查用户是否已存在
  if (CONFIG.users.has(phone)) {
    return { success: false, error: '用户已存在' };
  }
  
  // 创建用户
  const userId = crypto.randomUUID();
  const user = {
    userId,
    phone,
    nickname: nickname || `用户${phone.slice(-4)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tokens: 100, // 新用户送 100 tokens
    plan: 'free'
  };
  
  CONFIG.users.set(phone, user);
  
  // 生成 Token
  const token = generateToken(userId, phone);
  
  return {
    success: true,
    data: {
      user: {
        userId: user.userId,
        phone: user.phone,
        nickname: user.nickname,
        tokens: user.tokens,
        plan: user.plan
      },
      token
    }
  };
}

// 用户登录
async function login(phone, code) {
  // 验证验证码
  const verifyResult = verifyCode(phone, code);
  if (!verifyResult.success) {
    return verifyResult;
  }
  
  // 检查用户是否存在
  const user = CONFIG.users.get(phone);
  if (!user) {
    // 自动注册
    return register(phone, code, null);
  }
  
  // 更新登录时间
  user.lastLogin = Date.now();
  user.updatedAt = Date.now();
  
  // 生成 Token
  const token = generateToken(user.userId, phone);
  
  return {
    success: true,
    data: {
      user: {
        userId: user.userId,
        phone: user.phone,
        nickname: user.nickname,
        tokens: user.tokens,
        plan: user.plan
      },
      token
    }
  };
}

// 获取用户信息
async function getUserInfo(userId) {
  // 查找用户
  for (const [phone, user] of CONFIG.users) {
    if (user.userId === userId) {
      return {
        success: true,
        data: {
          userId: user.userId,
          phone: user.phone,
          nickname: user.nickname,
          tokens: user.tokens,
          plan: user.plan,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      };
    }
  }
  
  return { success: false, error: '用户不存在' };
}

// 验证 Token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, error: 'Token 无效' };
  }
}

// 消耗 Token
async function consumeTokens(userId, amount) {
  for (const [phone, user] of CONFIG.users) {
    if (user.userId === userId) {
      if (user.tokens < amount) {
        return { success: false, error: 'Token 不足' };
      }
      
      user.tokens -= amount;
      user.updatedAt = Date.now();
      
      return {
        success: true,
        data: {
          remainingTokens: user.tokens
        }
      };
    }
  }
  
  return { success: false, error: '用户不存在' };
}

// API 路由处理
module.exports = async function handler(req, res) {
  const { method, path } = req;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    return res.status(200).send('OK');
  }
  
  // 解析路径
  const pathParts = path.split('/').filter(Boolean);
  const endpoint = pathParts[pathParts.length - 1];
  
  try {
    // 获取请求体
    let body = {};
    if (method !== 'GET') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString());
    }
    
    // 路由处理
    switch (endpoint) {
      // 发送验证码
      case 'send-code': {
        const { phone } = body;
        
        if (!phone) {
          return res.status(400).json({ success: false, error: '手机号必填' });
        }
        
        // 验证手机号格式
        if (!/^1\d{10}$/.test(phone) && !/^\d{10,15}$/.test(phone)) {
          return res.status(400).json({ success: false, error: '手机号格式不正确' });
        }
        
        const result = await sendVerifyCode(phone);
        return res.status(200).json(result);
      }
      
      // 注册
      case 'register': {
        const { phone, code, nickname } = body;
        
        if (!phone || !code) {
          return res.status(400).json({ success: false, error: '参数不完整' });
        }
        
        const result = await register(phone, code, nickname);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 登录
      case 'login': {
        const { phone, code } = body;
        
        if (!phone || !code) {
          return res.status(400).json({ success: false, error: '参数不完整' });
        }
        
        const result = await login(phone, code);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 获取用户信息
      case 'me': {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const token = authHeader.substring(7);
        const verifyResult = verifyToken(token);
        
        if (!verifyResult.success) {
          return res.status(401).json(verifyResult);
        }
        
        const result = await getUserInfo(verifyResult.data.userId);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 消耗 Token
      case 'consume': {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const token = authHeader.substring(7);
        const verifyResult = verifyToken(token);
        
        if (!verifyResult.success) {
          return res.status(401).json(verifyResult);
        }
        
        const { amount } = body;
        
        if (!amount || amount <= 0) {
          return res.status(400).json({ success: false, error: '数量必须大于0' });
        }
        
        const result = await consumeTokens(verifyResult.data.userId, amount);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // Token 验证
      case 'verify': {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const token = authHeader.substring(7);
        const result = verifyToken(token);
        return res.status(result.success ? 200 : 401).json(result);
      }
      
      default:
        return res.status(404).json({ success: false, error: '接口不存在' });
    }
  } catch (error) {
    console.error('[Auth API] Error:', error);
    return res.status(500).json({ success: false, error: '服务器错误' });
  }
};

// 导出供测试
module.exports.verifyToken = verifyToken;
module.exports.sendVerifyCode = sendVerifyCode;
module.exports.login = login;
module.exports.register = register;
