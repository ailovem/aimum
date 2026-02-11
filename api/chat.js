/**
 * AImum AI 对话核心 API
 * 
 * 功能：
 * 1. 多模型支持（Claude, GPT-4, DeepSeek 等）
 * 2. 角色配置
 * 3. Token 消耗统计
 * 4. 对话历史管理
 */

const axios = require('axios');
const crypto = require('crypto');

// 配置
const CONFIG = {
  // 默认模型配置
  MODELS: {
    'claude-sonnet-4-20250514': {
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      inputPrice: 3,    // 每 1M tokens 美元
      outputPrice: 15, // 每 1M tokens 美元
      maxTokens: 4096,
      contextWindow: 200000
    },
    'claude-haiku-3-20250514': {
      name: 'Claude Haiku 3',
      provider: 'anthropic',
      inputPrice: 0.25,
      outputPrice: 1.25,
      maxTokens: 4096,
      contextWindow: 200000
    },
    'gpt-4o': {
      name: 'GPT-4o',
      provider: 'openai',
      inputPrice: 5,
      outputPrice: 15,
      maxTokens: 4096,
      contextWindow: 128000
    },
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      provider: 'openai',
      inputPrice: 0.15,
      outputPrice: 0.6,
      maxTokens: 4096,
      contextWindow: 128000
    },
    'deepseek-chat': {
      name: 'DeepSeek Chat',
      provider: 'deepseek',
      inputPrice: 0.14,
      outputPrice: 0.28,
      maxTokens: 4096,
      contextWindow: 64000
    }
  },
  
  // API Keys（从环境变量读取）
  API_KEYS: {
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || '',
    deepseek: process.env.DEEPSEEK_API_KEY || ''
  },
  
  // 对话历史存储（生产环境用数据库）
  conversations: new Map(),
  messages: new Map() // conversationId -> messages[]
};

// 角色配置
const ROLES = {
  default: {
    name: '默认助手',
    model: 'claude-sonnet-4-20250514',
    systemPrompt: '你是一个有用的 AI 助手。'
  },
  coder: {
    name: '代码专家',
    model: 'deepseek-chat',
    systemPrompt: '你是一个专业的程序员，擅长编写、调试和优化各种代码。'
  },
  writer: {
    name: '写作助手',
    model: 'claude-haiku-3-20250514',
    systemPrompt: '你是一个专业的写作助手，擅长撰写文章、文案和内容创作。'
  },
  analyst: {
    name: '数据分析师',
    model: 'gpt-4o',
    systemPrompt: '你是一个专业的数据分析师，擅长数据分析、图表解读和洞察发现。'
  }
};

// 计算对话消耗
function calculateCost(messages, model) {
  // 简化计算：假设平均每条消息 100 tokens
  const totalTokens = messages.length * 100;
  const modelConfig = CONFIG.MODELS[model];
  
  if (!modelConfig) return 0;
  
  // 假设输入和输出各占一半
  const inputTokens = totalTokens / 2;
  const outputTokens = totalTokens / 2;
  
  const cost = (inputTokens / 1000000) * modelConfig.inputPrice +
                (outputTokens / 1000000) * modelConfig.outputPrice;
  
  return cost;
}

// 验证用户 Token
async function verifyUserToken(token) {
  // 这里应该调用 auth.js 的验证逻辑
  // 简化处理：假设 token 格式为 "userId_timestamp"
  try {
    const parts = token.split('_');
    if (parts.length !== 2) return null;
    
    return { userId: parts[0] };
  } catch (error) {
    return null;
  }
}

// 发送对话请求
async function sendMessage(userId, conversationId, message, options = {}) {
  const {
    model = 'claude-sonnet-4-20250514',
    role = 'default',
    stream = true
  } = options;
  
  // 获取或创建对话
  if (!CONFIG.conversations.has(conversationId)) {
    CONFIG.conversations.set(conversationId, {
      conversationId,
      userId,
      role,
      model,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    CONFIG.messages.set(conversationId, []);
  }
  
  const conversation = CONFIG.conversations.get(conversationId);
  const messages = CONFIG.messages.get(conversationId);
  
  // 添加用户消息
  messages.push({
    role: 'user',
    content: message,
    timestamp: Date.now()
  });
  
  // 准备 API 请求
  const modelConfig = CONFIG.MODELS[model];
  if (!modelConfig) {
    return { success: false, error: '模型不存在' };
  }
  
  // 构建消息历史
  const apiMessages = [];
  
  // 添加系统提示
  const roleConfig = ROLES[role] || ROLES.default;
  if (messages.filter(m => m.role !== 'system').length === 1) {
    apiMessages.push({
      role: 'system',
      content: roleConfig.systemPrompt
    });
  }
  
  // 添加历史消息（限制最近 20 条）
  const recentMessages = messages.slice(-20);
  recentMessages.forEach(msg => {
    apiMessages.push({
      role: msg.role,
      content: msg.content
    });
  });
  
  try {
    let response;
    
    // 根据模型提供商调用不同 API
    switch (modelConfig.provider) {
      case 'anthropic':
        response = await callAnthropic(apiMessages, model, stream);
        break;
      case 'openai':
        response = await callOpenAI(apiMessages, model, stream);
        break;
      case 'deepseek':
        response = await callDeepSeek(apiMessages, model, stream);
        break;
      default:
        return { success: false, error: '不支持的模型提供商' };
    }
    
    // 添加助手消息
    messages.push({
      role: 'assistant',
      content: response.content,
      timestamp: Date.now()
    });
    
    // 更新对话时间
    conversation.updatedAt = Date.now();
    
    // 计算消耗
    const cost = calculateCost(messages, model);
    
    return {
      success: true,
      data: {
        conversationId,
        message: {
          id: response.id,
          role: 'assistant',
          content: response.content,
          usage: response.usage
        },
        cost
      }
    };
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return { success: false, error: error.message };
  }
}

// Anthropic API 调用
async function callAnthropic(messages, model, stream) {
  const apiKey = CONFIG.API_KEYS.anthropic;
  
  if (!apiKey) {
    // 模拟返回（开发环境）
    return simulateResponse();
  }
  
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      messages: messages.filter(m => m.role !== 'system'),
      system: messages.find(m => m.role === 'system')?.content,
      max_tokens: 4096,
      stream
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    id: response.data.id,
    content: response.data.content[0].text,
    usage: response.data.usage
  };
}

// OpenAI API 调用
async function callOpenAI(messages, model, stream) {
  const apiKey = CONFIG.API_KEYS.openai;
  
  if (!apiKey) {
    return simulateResponse();
  }
  
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages,
      max_tokens: 4096,
      stream
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    id: response.data.id,
    content: response.data.choices[0].message.content,
    usage: response.data.usage
  };
}

// DeepSeek API 调用
async function callDeepSeek(messages, model, stream) {
  const apiKey = CONFIG.API_KEYS.deepseek;
  
  if (!apiKey) {
    return simulateResponse();
  }
  
  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model,
      messages,
      max_tokens: 4096,
      stream
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    id: response.data.id,
    content: response.data.choices[0].message.content,
    usage: response.data.usage
  };
}

// 模拟响应（开发环境）
function simulateResponse() {
  return {
    id: crypto.randomUUID(),
    content: '这是一条模拟回复。在生产环境中，请配置相应的 API Key。',
    usage: {
      input_tokens: 100,
      output_tokens: 50
    }
  };
}

// 获取对话历史
function getHistory(conversationId, limit = 50) {
  const messages = CONFIG.messages.get(conversationId) || [];
  return messages.slice(-limit);
}

// 清空对话
function clearConversation(conversationId) {
  CONFIG.messages.set(conversationId, []);
  CONFIG.conversations.delete(conversationId);
  return { success: true };
}

// 获取可用模型列表
function getModels() {
  return Object.entries(CONFIG.MODELS).map(([id, config]) => ({
    id,
    name: config.name,
    provider: config.provider,
    maxTokens: config.maxTokens
  }));
}

// 获取角色列表
function getRoles() {
  return Object.entries(ROLES).map(([id, config]) => ({
    id,
    name: config.name,
    model: config.model
  }));
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
    
    // 路由处理
    switch (endpoint) {
      // 发送消息
      case 'chat': {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ success: false, error: '未登录' });
        }
        
        const token = authHeader.substring(7);
        const user = await verifyUserToken(token);
        
        if (!user) {
          return res.status(401).json({ success: false, error: '无效的 Token' });
        }
        
        const { message, conversationId, model, role, stream } = body;
        
        if (!message) {
          return res.status(400).json({ success: false, error: '消息内容必填' });
        }
        
        const convId = conversationId || `conv_${Date.now()}`;
        const result = await sendMessage(user.userId, convId, message, {
          model,
          role,
          stream
        });
        
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 获取对话历史
      case 'history': {
        const { conversationId } = params;
        
        if (!conversationId) {
          return res.status(400).json({ success: false, error: '对话 ID 必填' });
        }
        
        const limit = parseInt(params.limit) || 50;
        const history = getHistory(conversationId, limit);
        
        return res.status(200).json({
          success: true,
          data: { history }
        });
      }
      
      // 清空对话
      case 'clear': {
        const { conversationId } = body;
        
        if (!conversationId) {
          return res.status(400).json({ success: false, error: '对话 ID 必填' });
        }
        
        const result = clearConversation(conversationId);
        return res.status(200).json(result);
      }
      
      // 获取可用模型
      case 'models': {
        const models = getModels();
        return res.status(200).json({
          success: true,
          data: { models }
        });
      }
      
      // 获取角色列表
      case 'roles': {
        const roles = getRoles();
        return res.status(200).json({
          success: true,
          data: { roles }
        });
      }
      
      // 健康检查
      case 'health': {
        return res.status(200).json({
          success: true,
          data: {
            status: 'ok',
            timestamp: Date.now(),
            models: Object.keys(CONFIG.MODELS).length,
            conversations: CONFIG.conversations.size
          }
        });
      }
      
      default:
        return res.status(404).json({ success: false, error: '接口不存在' });
    }
  } catch (error) {
    console.error('[AI Chat API] Error:', error);
    return res.status(500).json({ success: false, error: '服务器错误' });
  }
};

// 导出供测试
module.exports.sendMessage = sendMessage;
module.exports.getHistory = getHistory;
module.exports.getModels = getModels;
module.exports.getRoles = getRoles;
module.exports.clearConversation = clearConversation;
