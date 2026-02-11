// AImum API - Token System (令狐充)

// 模拟数据库
const users = new Map();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'balance':
        return handleBalance(req, res);
      case 'charge':
        return handleCharge(req, res);
      case 'consume':
        return handleConsume(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

function handleBalance(req, res) {
  const { phone } = req.query;
  
  if (!phone) {
    return res.status(400).json({ error: 'Phone is required' });
  }
  
  // 从数据库获取
  const user = users.get(phone) || { phone, tokens: 20 };
  return res.json({ 
    phone, 
    balance: user.tokens 
  });
}

function handleCharge(req, res) {
  const { phone, amount, type } = req.body;
  
  if (!phone || !amount) {
    return res.status(400).json({ error: 'Phone and amount are required' });
  }
  
  // 令狐充：手动发码
  // 后续接入支付宝/微信支付
  
  // 更新余额
  const user = users.get(phone) || { phone, tokens: 0 };
  user.tokens += parseInt(amount);
  users.set(phone, user);
  
  return res.json({
    success: true,
    phone,
    added: parseInt(amount),
    newBalance: user.tokens,
    message: '充值成功！令狐充诚不欺你 ⚡'
  });
}

function handleConsume(req, res) {
  const { phone, cost = 1 } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: 'Phone is required' });
  }
  
  const user = users.get(phone);
  
  if (!user || user.tokens < cost) {
    return res.status(400).json({ 
      error: 'Insufficient tokens',
      current: user?.tokens || 0,
      required: cost 
    });
  }
  
  user.tokens -= cost;
  users.set(phone, user);
  
  return res.json({
    success: true,
    phone,
    consumed: cost,
    remaining: user.tokens
  });
}

// 定价配置
const PRICING = {
 体验令牌: { price: 9.9, tokens: 20 },
  日卡: { price: 5, tokens: 50 },
  周卡: { price: 29, tokens: 500 },
  月卡: { price: 99, tokens: 3000 },
  年卡: { price: 699, tokens: 50000 }
};

module.exports.PRICING = PRICING;
