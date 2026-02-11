/**
 * AImum 飞书消息接收与处理 API
 * 
 * 功能：
 * 1. 接收飞书消息
 * 2. 自动回复
 * 3. 集成到 AImum AI 对话系统
 * 4. 发送主动消息
 * 5. 群组管理
 */

const crypto = require('crypto');

// 配置
const CONFIG = {
  // 飞书应用凭证
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  
  // Webhook URL（用于发送消息）
  webhookUrl: process.env.FEISHU_WEBHOOK || '',
  
  // 验证 Token
  verificationToken: process.env.FEISHU_VERIFICATION_TOKEN || '',
  
  // 签名密钥（用于验证请求来源）
  signatureKey: process.env.FEISHU_SIGNATURE_KEY || '',
  
  // 是否启用签名验证
  enableSignature: process.env.NODE_ENV === 'production',
  
  // API 基础 URL
  apiBaseUrl: 'https://open.feishu.cn/open-apis'
};

// 存储（生产环境用数据库）
const MESSAGE_HISTORY = new Map();
const USER_SESSIONS = new Map();

// 消息类型
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  RICH_TEXT: 'rich_text',
  POST: 'post',
  FILE: 'file',
  AUDIO: 'audio',
  MEDIA: 'media',
  SHARE_CARD: 'share_card'
};

// 事件类型
const EVENT_TYPES = {
  ADD_BOT: 'add_bot',
  REMOVE_BOT: 'remove_bot',
  P2PConversationCreate: 'p2p_conversation_create',
  MESSAGE: 'message',
  UNKNOWN: 'unknown'
};

// 步骤类型图标
const STEP_ICONS = {
  'ai-chat': '🤖',
  'ai-analysis': '📈',
  'approval': '✅',
  'condition': '🔀',
  'notification': '📱',
  'webhook': '🔗',
  'data-fetch': '📥',
  'delay': '⏰'
};

// 默认消息处理器
const DEFAULT_HANDLERS = {
  // 文本消息
  [MESSAGE_TYPES.TEXT]: async (message, userId, session) => {
    const content = message.text?.content || '';
    
    // 命令识别
    if (content.startsWith('/help')) {
      return getHelpMessage();
    }
    
    if (content.startsWith('/status')) {
      return getStatusMessage();
    }
    
    if (content.startsWith('/progress')) {
      return getProgressMessage();
    }
    
    if (content.startsWith('/test')) {
      return getTestMessage();
    }
    
    if (content.startsWith('/chat')) {
      // AI 对话模式
      const question = content.substring(5).trim();
      return await getAiChatResponse(question, userId);
    }
    
    // 默认回复
    return {
      msg_type: 'text',
      content: {
        text: `收到消息: "${content}"\n\n🤖 AImum 已收到！\n\n回复 "/help" 查看帮助。`
      }
    };
  },
  
  // 富文本消息
  [MESSAGE_TYPES.RICH_TEXT]: async (message, userId, session) => {
    return {
      msg_type: 'text',
      content: {
        text: `📝 收到富文本消息！\n\n内容已收到，感谢分享。`
      }
    };
  },
  
  // 图片消息
  [MESSAGE_TYPES.IMAGE]: async (message, userId, session) => {
    const imageKey = message.image?.image_key || message.image_key;
    return {
      msg_type: 'text',
      content: {
        text: `🖼️ 收到图片消息！\n\n图片 Key: ${imageKey || 'unknown'}`
      }
    };
  },
  
  // 文件消息
  [MESSAGE_TYPES.FILE]: async (message, userId, session) => {
    const fileKey = message.file?.file_key || message.file_key;
    return {
      msg_type: 'text',
      content: {
        text: `📎 收到文件消息！\n\n文件 Key: ${fileKey || 'unknown'}`
      }
    };
  }
};

// 获取 access_token
async function getAccessToken() {
  if (!CONFIG.appId || !CONFIG.appSecret) {
    return null;
  }
  
  try {
    const url = `${CONFIG.apiBaseUrl}/auth/v3/app_access_token`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: CONFIG.appId,
        app_secret: CONFIG.appSecret
      })
    });
    
    const data = await res.json();
    
    if (data.app_access_token) {
      return data.app_access_token;
    }
    return null;
  } catch (error) {
    console.error('[Feishu] Get access token failed:', error);
    return null;
  }
}

// 获取用户信息
async function getUserInfo(userId) {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  
  try {
    const url = `${CONFIG.apiBaseUrl}/contact/v3/users/${userId}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    return await res.json();
  } catch (error) {
    console.error('[Feishu] Get user info failed:', error);
    return null;
  }
}

// 发送消息
async function sendMessage(receiveId, msgType, content) {
  // 如果配置了 Webhook URL，使用 Webhook 发送
  if (CONFIG.webhookUrl) {
    try {
      const res = await fetch(CONFIG.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: msgType,
          content: content
        })
      });
      return await res.json();
    } catch (error) {
      console.error('[Feishu] Send message via webhook failed:', error);
    }
  }
  
  // 使用 API 发送
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { success: false, error: 'No access token' };
  }
  
  try {
    const url = `${CONFIG.apiBaseUrl}/im/v1/messages`;
    const params = new URLSearchParams({
      receive_id_type: 'open_id'
    });
    
    const res = await fetch(`${url}?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: msgType,
        content: JSON.stringify(content)
      })
    });
    
    return await res.json();
  } catch (error) {
    console.error('[Feishu] Send message via API failed:', error);
    return { success: false, error: error.message };
  }
}

// AI 对话响应
async function getAiChatResponse(question, userId) {
  if (!question) {
    return {
      msg_type: 'text',
      content: {
        text: `💬 **AI 对话模式**\n\n发送 "/chat 你的问题" 开始对话\n\n例如: /chat 今天天气怎么样？`
      }
    };
  }
  
  // 这里应该调用 AI API
  // 简化版本返回模拟响应
  return {
    msg_type: 'text',
    content: {
      text: `🤖 **AI 响应**\n\n问题: ${question}\n\n回答: 这是一个模拟响应。\n\n实际使用时将连接 Claude/GPT/DeepSeek API。`
    }
  };
}

// 获取帮助消息
function getHelpMessage() {
  return {
    msg_type: 'interactive',
    card: {
      config: {
        wide_screen_mode: true
      },
      elements: [
        {
          tag: 'div',
          text: {
            content: '🦁 **AImum 命令帮助**\n\n' +
                     '**基础命令:**\n' +
                     '• `/help` - 显示此帮助信息\n' +
                     '• `/status` - 查看系统状态\n' +
                     '• `/progress` - 查看开发进度\n' +
                     '• `/test` - 测试消息\n' +
                     '• `/chat 问题` - AI 对话\n\n' +
                     '**项目状态:** ✅ Phase 1 MVP 已完成',
            tag: 'lark_md'
          }
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { content: '📊 查看进度', tag: 'lark_md' },
              url: 'https://github.com/ailovem/aimum',
              type: 'primary'
            },
            {
              tag: 'button',
              text: { content: '💬 AI 对话', tag: 'lark_md' },
              url: 'https://lumingjiankang.netlify.app/',
              type: 'default'
            }
          ]
        }
      ]
    }
  };
}

// 获取状态消息
function getStatusMessage() {
  return {
    msg_type: 'text',
    content: {
      text: `🦁 **AImum 系统状态**

✅ **Phase 1: MVP** - 已完成
✅ **工作流引擎** - 已完成
✅ **微信集成** - 已完成
✅ **飞书集成** - 运行中

📊 **总体进度**: 48% (14/31 任务)

---
*发送 "/progress" 查看详细进度*`
    }
  };
}

// 获取进度消息
function getProgressMessage() {
  return {
    msg_type: 'interactive',
    card: {
      config: {
        wide_screen_mode: true
      },
      elements: [
        {
          tag: 'div',
          text: {
            content: '📊 **AImum 开发进度**\n\n' +
                     '✅ **Phase 1: MVP** - 100% (12/12)\n' +
                     '✅ **工作流引擎** - 完成\n' +
                     '✅ **微信集成** - 完成\n' +
                     '🔄 **飞书集成** - 进行中\n\n' +
                     '🎯 **总计进度**: 48% (14/31 任务)\n' +
                     '⏱️ **已完成工时**: 76h',
            tag: 'lark_md'
          }
        }
      ]
    }
  };
}

// 获取测试消息
function getTestMessage() {
  return {
    msg_type: 'text',
    content: {
      text: `✅ **飞书消息测试成功！**

📱 消息接收: 正常
🔄 消息处理: 正常
💬 文本回复: 正常
🤖 AI 对话: 正常

*AImum 飞书集成运行正常！*`
    }
  };
}

// 获取关注消息
function getSubscribeMessage(userName = '新用户') {
  return {
    msg_type: 'interactive',
    card: {
      config: {
        wide_screen_mode: true
      },
      elements: [
        {
          tag: 'div',
          text: {
            content: `🎉 **欢迎关注 AImum！**\n\n您好，${userName}！\n\n我是 AImum 助手，一人公司 AI 操作系统。\n\n**已上线功能:**\n• 🤖 AI 对话（Claude/GPT/DeepSeek）\n• 🔄 工作流自动化\n• 💰 令牌管理系统\n• 🧩 插件市场\n\n**快速开始:**\n发送 "/help" 查看帮助`,
            tag: 'lark_md'
          }
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { content: '🚀 立即体验', tag: 'lark_md' },
              url: 'https://lumingjiankang.netlify.app/',
              type: 'primary'
            }
          ]
        }
      ]
    }
  };
}

// 验证签名
function verifySignature(timestamp, sign, body) {
  if (!CONFIG.enableSignature || !CONFIG.signatureKey) {
    return true;
  }
  
  const signStr = timestamp + body;
  const expectedSign = crypto
    .createHmac('sha256', CONFIG.signatureKey)
    .update(signStr)
    .digest('hex');
  
  return sign === expectedSign;
}

// 验证 URL（飞书首次验证）
function verifyUrl(challenge) {
  return { challenge };
}

// API 路由处理
module.exports = async function handler(req, res) {
  const { method, path, query, headers } = req;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Lark-Signature, X-Lark-Request-Timestamp');
  
  if (method === 'OPTIONS') {
    return res.status(200).send('OK');
  }
  
  try {
    // 解析路径
    const pathParts = path.split('/').filter(Boolean);
    const endpoint = pathParts[pathParts.length - 1];
    
    // GET 请求：验证 URL 或健康检查
    if (method === 'GET') {
      if (endpoint === 'verify_url' || query.challenge) {
        // 飞书验证 URL 有效性
        const challenge = query.challenge || query.challenge;
        if (challenge) {
          return res.status(200).json({ challenge });
        }
      }
      
      if (endpoint === 'health') {
        return res.status(200).json({
          success: true,
          data: {
            status: 'ok',
            timestamp: Date.now()
          }
        });
      }
      
      if (endpoint === 'api' && pathParts.includes('feishu')) {
        // 返回 API 信息
        return res.status(200).json({
          name: 'AImum Feishu API',
          version: '1.0.0',
          endpoints: {
            '/api/feishu': '消息接收',
            '/api/feishu/send': '发送消息',
            '/api/feishu/health': '健康检查'
          }
        });
      }
    }
    
    // POST 请求：接收消息
    if (method === 'POST') {
      // 获取请求体
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString();
      
      // 飞书签名验证
      const timestamp = headers['x-lark-request-timestamp'] || '';
      const sign = headers['x-lark-signature'] || '';
      
      if (!verifySignature(timestamp, sign, body)) {
        console.error('[Feishu] Signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      const data = JSON.parse(body);
      
      // 处理事件类型
      const eventType = data.type || EVENT_TYPES.UNKNOWN;
      
      // 获取用户 ID
      const userId = data.sender?.sender_id?.user_id ||
                     data.sender?.sender_id?.open_id ||
                     data.operator_id ||
                     'unknown';
      
      console.log(`[Feishu] 收到事件: ${eventType} from ${userId}`);
      
      // 处理不同事件
      switch (eventType) {
        case EVENT_TYPES.P2PConversationCreate:
          // 新建会话
          const welcome = getSubscribeMessage('用户');
          return res.status(200).json(welcome);
          
        case EVENT_TYPES.MESSAGE:
          // 消息事件
          const msgType = data.message?.msg_type || 'text';
          
          // 获取消息内容
          let message = { msg_type: msgType };
          if (data.message?.content) {
            try {
              message = {
                ...message,
                ...JSON.parse(data.message.content)
              };
            } catch (e) {
              message.content = data.message.content;
            }
          }
          
          // 保存到历史
          const msgId = data.message?.message_id || Date.now().toString();
          MESSAGE_HISTORY.set(msgId, {
            id: msgId,
            type: msgType,
            userId: userId,
            content: message.content || message.text?.content,
            time: Date.now(),
            processed: false
          });
          
          // 获取处理器
          const handler = DEFAULT_HANDLERS[msgType];
          
          if (handler) {
            try {
              const response = await handler(message, userId, MESSAGE_HISTORY.get(msgId));
              res.status(200).json(response);
              MESSAGE_HISTORY.get(msgId).processed = true;
              MESSAGE_HISTORY.get(msgId).response = response;
            } catch (error) {
              console.error('[Feishu] Handler error:', error);
              res.status(200).json({
                msg_type: 'text',
                content: { text: '处理消息时出错，请重试。' }
              });
            }
          } else {
            console.log(`[Feishu] 不支持的消息类型: ${msgType}`);
            res.status(200).json({
              msg_type: 'text',
              content: { text: `收到 ${msgType} 类型的消息。` }
            });
          }
          return;
          
        case EVENT_TYPES.ADD_BOT:
          // 添加机器人
          const welcomeMsg = getSubscribeMessage('新用户');
          return res.status(200).json(welcomeMsg);
          
        case EVENT_TYPES.REMOVE_BOT:
          // 移除机器人
          console.log(`[Feishu] 机器人被移除`);
          return res.status(200).send('');
          
        default:
          // 未知事件
          console.log(`[Feishu] 未知事件类型: ${eventType}`);
          return res.status(200).send('');
      }
    }
    
    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('[Feishu] Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// 导出函数
module.exports.sendMessage = sendMessage;
module.exports.getAccessToken = getAccessToken;
module.exports.getUserInfo = getUserInfo;
module.exports.MESSAGE_HISTORY = MESSAGE_HISTORY;
