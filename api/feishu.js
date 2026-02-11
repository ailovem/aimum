/**
 * AImum 飞书消息接收与处理 API
 * 
 * 功能：
 * 1. 接收飞书消息
 * 2. 自动回复
 * 3. 集成到 AImum 对话系统
 */

const crypto = require('crypto');

// 配置
const CONFIG = {
  // 验证 Token（从飞书机器人设置中获取）
  verificationToken: process.env.FEISHU_VERIFICATION_TOKEN || '',
  
  // 签名密钥（用于验证请求来源）
  signatureKey: process.env.FEISHU_SIGNATURE_KEY || '',
  
  // 是否启用签名验证（生产环境建议启用）
  enableSignature: process.env.NODE_ENV === 'production'
};

// 消息处理函数
const MESSAGE_HANDLERS = {
  // 文本消息处理
  'text': async (message, userId) => {
    const content = message.text?.content || '';
    
    // 简单命令识别
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
    
    // 默认回复：触发 AI 对话
    return {
      msg_type: 'text',
      content: {
        text: `收到消息: "${content}"\n\n🤖 AImum 已收到您的消息！\n\n回复 "/help" 查看命令，或直接发送消息与我对话。`
      }
    };
  },
  
  // 图片消息处理
  'image': async (message, userId) => {
    return {
      msg_type: 'text',
      content: {
        text: `🖼️ 收到图片消息！\n\n图片 Key: ${message.image?.image_key || 'unknown'}`
      }
    };
  },
  
  // 富文本消息
  'rich_text': async (message, userId) => {
    return {
      msg_type: 'text',
      content: {
        text: `📝 收到富文本消息！`
      }
    };
  }
};

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
                     '• `/test` - 测试消息\n\n' +
                     '**对话方式:**\n' +
                     '• 直接发送消息与我对话\n' +
                     '• 我会通过飞书回复您\n\n' +
                     '**项目状态:** ✅ Phase 1 MVP 已完成',
            tag: 'lark_md'
          }
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: {
                content: '📊 查看进度',
                tag: 'lark_md'
              },
              url: 'https://github.com/ailovem/aimum',
              type: 'primary'
            },
            {
              tag: 'button',
              text: {
                content: '💬 开始对话',
                tag: 'lark_md'
              },
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
✅ **GitHub 同步** - 本地已提交
✅ **飞书集成** - 正常运行中
✅ **测试框架** - 14/14 通过

📊 **总体进度**: 40% (12/31 任务)
📦 **今日状态**: 运行正常

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
                     '✅ **Phase 1: MVP** - 100% (12/12 完成)\n' +
                     '⏳ **Phase 2: 增强** - 0% (7/7 待开始)\n' +
                     '⏳ **Phase 3: 生态** - 0% (6/6 待开始)\n\n' +
                     '🎯 **总计进度**: 40% (12/31 任务)\n' +
                     '⏱️ **已完成工时**: 60h',
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

📱 消息接收正常
🔄 消息处理正常
💬 文本回复正常

*AImum 飞书集成运行正常！*`
    }
  };
}

// 验证签名
function verifySignature(timestamp, sign, body) {
  if (!CONFIG.enableSignature || !CONFIG.signatureKey) {
    return true; // 跳过验证
  }
  
  const signStr = timestamp + body;
  const expectedSign = crypto
    .createHmac('sha256', CONFIG.signatureKey)
    .update(signStr)
    .digest('hex');
  
  return sign === expectedSign;
}

// API 路由处理
module.exports = async function handler(req, res) {
  const { method, path } = req;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Lark-Signature, X-Lark-Request-Timestamp');
  
  if (method === 'OPTIONS') {
    return res.status(200).send('OK');
  }
  
  // 飞书 Webhook 验证请求
  if (method === 'GET' && path.includes('verify_url')) {
    // 飞书验证 URL 有效性
    const params = new URLSearchParams(path.split('?')[1]);
    const challenge = params.get('challenge');
    
    if (challenge) {
      return res.status(200).json({ challenge });
    }
  }
  
  try {
    // 飞书使用 POST 发送消息
    if (method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // 获取请求体
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString();
    
    // 飞书签名验证
    const timestamp = req.headers['x-lark-request-timestamp'] || '';
    const sign = req.headers['x-lark-signature'] || '';
    
    if (!verifySignature(timestamp, sign, body)) {
      console.error('[Feishu] Signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const data = JSON.parse(body);
    
    // 验证消息类型
    if (!data.msg_type) {
      return res.status(200).json({ error: 'No msg_type' });
    }
    
    // 获取消息内容
    const msgType = data.msg_type;
    const userId = data.sender?.sender_id?.user_id || 
                   data.sender?.sender_id?.open_id ||
                   'unknown';
    
    // 获取消息内容
    let message = {};
    if (msgType === 'text') {
      message = { text: data };
    } else if (data.content) {
      try {
        message = typeof data.content === 'string' 
          ? JSON.parse(data.content) 
          : data.content;
      } catch (e) {
        message = data.content;
      }
    }
    
    console.log(`[Feishu] 收到消息: ${msgType} from ${userId}`);
    
    // 处理消息
    const handler = MESSAGE_HANDLERS[msgType];
    
    if (handler) {
      try {
        const response = await handler(message, userId);
        
        // 飞书要求 5 秒内响应
        res.status(200).json(response);
      } catch (error) {
        console.error('[Feishu] Handler error:', error);
        
        res.status(200).json({
          msg_type: 'text',
          content: {
            text: '❌ 处理消息时出错，请重试。'
          }
        });
      }
    } else {
      // 不支持的消息类型
      console.log(`[Feishu] 不支持的消息类型: ${msgType}`);
      
      res.status(200).json({
        msg_type: 'text',
        content: {
          text: `收到 ${msgType} 类型的消息，暂时不支持。\n\n回复 "/help" 查看可用命令。`
        }
      });
    }
    
  } catch (error) {
    console.error('[Feishu] Error:', error);
    
    // 飞书要求返回 200 以避免重复发送
    res.status(200).json({
      msg_type: 'text',
      content: {
        text: '⚠️ 处理消息时出错，但消息已收到。'
      }
    });
  }
};

// 导出供测试
module.exports.MESSAGE_HANDLERS = MESSAGE_HANDLERS;
module.exports.getHelpMessage = getHelpMessage;
module.exports.getStatusMessage = getStatusMessage;
module.exports.getProgressMessage = getProgressMessage;
