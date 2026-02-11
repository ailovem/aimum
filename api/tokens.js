/**
 * AImum 令牌系统 API
 * 
 * 功能：
 * 1. Token 余额查询
 * 2. Token 消耗记录
 * 3. 充值系统
 * 4. 套餐管理
 */

const crypto = require('crypto');

// 配置
const CONFIG = {
  // 套餐配置
  PLANS: {
    free: {
      id: 'free',
      name: '免费版',
      price: 0,
      tokens: 100,
      period: 'once',
      features: ['基础对话', '有限次数']
    },
    pro: {
      id: 'pro',
      name: '专业版',
      price: 29,
      currency: 'CNY',
      tokens: 5000,
      period: 'month',
      features: ['无限对话', '优先响应', '更多模型']
    },
    enterprise: {
      id: 'enterprise',
      name: '企业版',
      price: 99,
      currency: 'CNY',
      tokens: 20000,
      period: 'month',
      features: ['无限对话', '优先响应', '全部模型', 'API 访问', '专属客服']
    }
  },
  
  // Token 消耗配置
  CONSUMPTION: {
    per_message: 10, // 每条消息消耗
    per_model_switch: 5, // 切换模型消耗
    per_plugin_use: 20 // 使用插件消耗
  },
  
  // 支付配置
  PAYMENT: {
    // 支付方式配置
    methods: ['wise', 'stripe', 'alipay', 'wechat']
  },
  
  // 存储（生产环境用数据库）
  users: new Map(),      // userId -> user data
  transactions: new Map(), // transactionId -> transaction
  consumptions: new Map() // consumptionId -> consumption record
};

// 初始化用户
function initUser(userId, phone) {
  if (!CONFIG.users.has(userId)) {
    CONFIG.users.set(userId, {
      userId,
      phone,
      balance: 100, // 新用户送 100 tokens
      totalConsumed: 0,
      plan: 'free',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  return CONFIG.users.get(userId);
}

// 获取用户信息
async function getUserInfo(userId) {
  const user = CONFIG.users.get(userId);
  
  if (!user) {
    return { success: false, error: '用户不存在' };
  }
  
  return {
    success: true,
    data: {
      userId: user.userId,
      phone: user.phone,
      balance: user.balance,
      totalConsumed: user.totalConsumed,
      plan: user.plan,
      createdAt: user.createdAt
    }
  };
}

// 消耗 Token
async function consume(userId, amount, description = '') {
  const user = CONFIG.users.get(userId);
  
  if (!user) {
    return { success: false, error: '用户不存在' };
  }
  
  if (user.balance < amount) {
    return { 
      success: false, 
      error: 'Token 不足',
      required: amount,
      current: user.balance
    };
  }
  
  // 扣除 Token
  user.balance -= amount;
  user.totalConsumed += amount;
  user.updatedAt = Date.now();
  
  // 记录消耗
  const consumptionId = crypto.randomUUID();
  const consumption = {
    consumptionId,
    userId,
    amount,
    description,
    remaining: user.balance,
    createdAt: Date.now()
  };
  CONFIG.consumptions.set(consumptionId, consumption);
  
  return {
    success: true,
    data: {
      consumptionId,
      amount,
      remaining: user.balance,
      totalConsumed: user.totalConsumed
    }
  };
}

// 充值 Token
async function recharge(userId, planId, paymentMethod = 'manual') {
  const plan = CONFIG.PLANS[planId];
  
  if (!plan) {
    return { success: false, error: '套餐不存在' };
  }
  
  const user = CONFIG.users.get(userId);
  if (!user) {
    return { success: false, error: '用户不存在' };
  }
  
  // 创建交易记录
  const transactionId = crypto.randomUUID();
  const transaction = {
    transactionId,
    userId,
    planId,
    amount: plan.tokens,
    price: plan.price,
    currency: plan.currency || 'tokens',
    paymentMethod,
    status: 'pending',
    createdAt: Date.now()
  };
  CONFIG.transactions.set(transactionId, transaction);
  
  // 如果是免费套餐，直接充值
  if (plan.price === 0) {
    await completeTransaction(transactionId);
    
    return {
      success: true,
      data: {
        transactionId,
        status: 'completed',
        amount: plan.tokens,
        message: '充值成功'
      }
    };
  }
  
  // 生成支付链接
  const paymentLink = await generatePaymentLink(transactionId, paymentMethod);
  
  return {
    success: true,
    data: {
      transactionId,
      status: 'pending',
      amount: plan.tokens,
      price: plan.price,
      currency: plan.currency || 'CNY',
      paymentLink,
      message: '请完成支付'
    }
  };
}

// 生成支付链接
async function generatePaymentLink(transactionId, method) {
  const transaction = CONFIG.transactions.get(transactionId);
  
  if (!transaction) {
    return null;
  }
  
  // 不同的支付方式生成不同的链接
  switch (method) {
    case 'wise':
      // Wise 收款链接
      return `https://wise.com/pay/me/s7zc2uc?amount=${transaction.price}&note=AImum-${transactionId.slice(0, 8)}`;
    
    case 'stripe':
      // Stripe 支付链接
      return `https://buy.stripe.com/test_${transactionId.slice(0, 8)}`;
    
    default:
      // 默认返回交易 ID
      return `?transactionId=${transactionId}`;
  }
}

// 完成交易
async function completeTransaction(transactionId) {
  const transaction = CONFIG.transactions.get(transactionId);
  
  if (!transaction) {
    return { success: false, error: '交易不存在' };
  }
  
  const user = CONFIG.users.get(transaction.userId);
  if (!user) {
    return { success: false, error: '用户不存在' };
  }
  
  // 更新用户 Token
  user.balance += transaction.amount;
  user.updatedAt = Date.now();
  
  // 更新交易状态
  transaction.status = 'completed';
  transaction.completedAt = Date.now();
  
  return {
    success: true,
    data: {
      transactionId,
      status: 'completed',
      amount: transaction.amount,
      newBalance: user.balance
    }
  };
}

// 获取消耗记录
async function getConsumptions(userId, limit = 50) {
  const records = [];
  
  for (const [id, record] of CONFIG.consumptions) {
    if (record.userId === userId) {
      records.push(record);
    }
  }
  
  // 按时间倒序
  records.sort((a, b) => b.createdAt - a.createdAt);
  
  return {
    success: true,
    data: {
      consumptions: records.slice(0, limit),
      total: records.length
    }
  };
}

// 获取交易记录
async function getTransactions(userId, limit = 20) {
  const records = [];
  
  for (const [id, record] of CONFIG.transactions) {
    if (record.userId === userId) {
      records.push(record);
    }
  }
  
  // 按时间倒序
  records.sort((a, b) => b.createdAt - a.createdAt);
  
  return {
    success: true,
    data: {
      transactions: records.slice(0, limit),
      total: records.length
    }
  };
}

// 获取套餐列表
function getPlans() {
  return Object.values(CONFIG.PLANS);
}

// 获取套餐详情
function getPlan(planId) {
  return CONFIG.PLANS[planId];
}

// 升级套餐
async function upgradePlan(userId, planId) {
  const plan = CONFIG.PLANS[planId];
  
  if (!plan) {
    return { success: false, error: '套餐不存在' };
  }
  
  const user = CONFIG.users.get(userId);
  if (!user) {
    return { success: false, error: '用户不存在' };
  }
  
  // 更新用户套餐
  user.plan = planId;
  user.updatedAt = Date.now();
  
  // 赠送 Token
  user.balance += plan.tokens;
  
  return {
    success: true,
    data: {
      plan: planId,
      balance: user.balance,
      message: `已升级到 ${plan.name}`
    }
  };
}

// 估算消息消耗
function estimateMessageCost(model, messageLength = 100) {
  // 简化计算：每 100 字符消耗 1 token
  const tokens = Math.ceil(messageLength / 100);
  return tokens;
}

// 获取消耗统计
async function getStats(userId) {
  const user = CONFIG.users.get(userId);
  
  if (!user) {
    return { success: false, error: '用户不存在' };
  }
  
  // 获取今日消耗
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  let todayConsumed = 0;
  for (const [id, record] of CONFIG.consumptions) {
    if (record.userId === userId && record.createdAt >= todayStart.getTime()) {
      todayConsumed += record.amount;
    }
  }
  
  return {
    success: true,
    data: {
      balance: user.balance,
      totalConsumed: user.totalConsumed,
      todayConsumed,
      plan: user.plan
    }
  };
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
  
  // 解析路径和查询参数
  const [pathname, queryString] = path.split('?');
  const pathParts = pathname.split('/').filter(Boolean);
  const endpoint = pathParts[pathParts.length - 1];
  
  // 解析查询参数
  const params = {};
  if (queryString) {
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params[key] = decodeURIComponent(value);
    });
  }
  
  try {
    // 获取请求体
    let body = {};
    if (method !== 'GET') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      if (chunks.length > 0) {
        body = JSON.parse(Buffer.concat(chunks).toString());
      }
    }
    
    // 验证用户（简化处理）
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // 简化：token 格式为 userId_timestamp
      const parts = token.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        // 确保用户存在
        initUser(userId, parts[1] || '');
      }
    }
    
    // 路由处理
    switch (endpoint) {
      // 获取用户信息
      case 'me': {
        if (!userId) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const result = await getUserInfo(userId);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 消耗 Token
      case 'consume': {
        if (!userId) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const { amount, description } = body;
        
        if (!amount || amount <= 0) {
          return res.status(400).json({ success: false, error: '数量必须大于0' });
        }
        
        const result = await consume(userId, amount, description);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 充值
      case 'recharge': {
        if (!userId) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const { planId, paymentMethod } = body;
        
        if (!planId) {
          return res.status(400).json({ success: false, error: '套餐必填' });
        }
        
        const result = await recharge(userId, planId, paymentMethod);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 获取消耗记录
      case 'consumptions': {
        if (!userId) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const limit = parseInt(params.limit) || 50;
        const result = await getConsumptions(userId, limit);
        return res.status(200).json(result);
      }
      
      // 获取交易记录
      case 'transactions': {
        if (!userId) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const limit = parseInt(params.limit) || 20;
        const result = await getTransactions(userId, limit);
        return res.status(200).json(result);
      }
      
      // 获取套餐列表
      case 'plans': {
        const plans = getPlans();
        return res.status(200).json({
          success: true,
          data: { plans }
        });
      }
      
      // 获取套餐详情
      case 'plan': {
        const { planId } = params;
        const plan = getPlan(planId);
        
        if (!plan) {
          return res.status(404).json({ success: false, error: '套餐不存在' });
        }
        
        return res.status(200).json({
          success: true,
          data: { plan }
        });
      }
      
      // 升级套餐
      case 'upgrade': {
        if (!userId) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const { planId } = body;
        
        if (!planId) {
          return res.status(400).json({ success: false, error: '套餐必填' });
        }
        
        const result = await upgradePlan(userId, planId);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 获取统计数据
      case 'stats': {
        if (!userId) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const result = await getStats(userId);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 完成交易（Webhook 回调）
      case 'webhook': {
        const { transactionId, status } = body;
        
        if (status === 'completed') {
          await completeTransaction(transactionId);
        }
        
        return res.status(200).json({ success: true });
      }
      
      // 健康检查
      case 'health': {
        return res.status(200).json({
          success: true,
          data: {
            status: 'ok',
            timestamp: Date.now()
          }
        });
      }
      
      default:
        return res.status(404).json({ success: false, error: '接口不存在' });
    }
  } catch (error) {
    console.error('[Tokens API] Error:', error);
    return res.status(500).json({ success: false, error: '服务器错误' });
  }
};

// 导出供测试
module.exports.getUserInfo = getUserInfo;
module.exports.consume = consume;
module.exports.recharge = recharge;
module.exports.getPlans = getPlans;
module.exports.getStats = getStats;
