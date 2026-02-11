/**
 * AImum 微信消息接收与处理 API
 * 
 * 功能：
 * 1. 接收微信消息
 * 2. 自动回复
 * 3. 集成到 AImum 对话系统
 */

const crypto = require('crypto');

// 配置
const CONFIG = {
  // 微信 Token（从微信公众平台获取）
  token: process.env.WECHAT_TOKEN || 'aimum2024',
  
  // 微信 AppID 和 AppSecret
  appId: process.env.WECHAT_APP_ID || '',
  appSecret: process.env.WECHAT_APP_SECRET || '',
  
  // 微信 API 基础 URL
  apiBaseUrl: 'https://api.weixin.qq.com',
  
  // 消息处理函数映射
  handlers: new Map()
};

// 消息类型定义
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VOICE: 'voice',
  VIDEO: 'video',
  SHORTVIDEO: 'shortvideo',
  LOCATION: 'location',
  LINK: 'link',
  EVENT: 'event'
};

// 事件类型
const EVENT_TYPES = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  SCAN: 'SCAN',
  LOCATION: 'LOCATION',
  CLICK: 'CLICK',
  VIEW: 'VIEW'
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
  // 文本消息处理
  [MESSAGE_TYPES.TEXT]: async (message, req) => {
    const content = message.content.trim();
    
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
    
    // 默认为 AI 对话
    return {
      msgType: 'text',
      content: {
        text: `收到消息: "${content}"\n\n🤖 AImum 已收到！\n\n回复 "/help" 查看帮助。`
      }
    };
  },
  
  // 图片消息处理
  [MESSAGE_TYPES.IMAGE]: async (message, req) => {
    return {
      msgType: 'text',
      content: {
        text: `🖼️ 收到图片消息！\n\n图片 MediaId: ${message.mediaId || 'unknown'}`
      }
    };
  },
  
  // 语音消息处理
  [MESSAGE_TYPES.VOICE]: async (message, req) => {
    return {
      msgType: 'text',
      content: {
        text: `🎤 收到语音消息！\n\n语音 MediaId: ${message.mediaId || 'unknown'}`
      }
    };
  },
  
  // 事件处理
  [MESSAGE_TYPES.EVENT]: async (message, req) => {
    const event = message.event;
    
    switch (event) {
      case EVENT_TYPES.SUBSCRIBE:
        return getSubscribeMessage();
        
      case EVENT_TYPES.UNSUBSCRIBE:
        console.log(`[WeChat] 用户取消关注: ${message.fromUserName}`);
        return null;
        
      case EVENT_TYPES.CLICK:
        return getClickMessage(message.eventKey);
        
      case EVENT_TYPES.LOCATION:
        return null; // 静默处理
        
      default:
        return {
          msgType: 'text',
          content: {
            text: `收到事件: ${event}`
          }
        };
    }
  }
};

// 生成微信消息响应
function createWeChatResponse(toUser, fromUser, msgType, content) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  let contentXml = '';
  
  switch (msgType) {
    case 'text':
      contentXml = `<Content><![CDATA[${content.text}]]></Content>`;
      break;
      
    case 'image':
      contentXml = `<Image><MediaId><![CDATA[${content.mediaId}]]></MediaId></Image>`;
      break;
      
    case 'voice':
      contentXml = `<Voice><MediaId><![CDATA[${content.mediaId}]]></MediaId></Voice>`;
      break;
      
    case 'video':
      contentXml = `<Video>
        <MediaId><![CDATA[${content.mediaId}]]></MediaId>
        <Title><![CDATA[${content.title || ''}]]></Title>
        <Description><![CDATA[${content.description || ''}]]></Description>
      </Video>`;
      break;
      
    case 'news':
      const articles = content.articles || [];
      const itemsXml = articles.map(article => `
        <item>
          <Title><![CDATA[${article.title}]]></Title>
          <Description><![CDATA[${article.description || ''}]]></Description>
          <PicUrl><![CDATA[${article.picUrl || ''}]]></PicUrl>
          <Url><![CDATA[${article.url || ''}]]></Url>
        </item>
      `).join('');
      contentXml = `<News><Count>${articles.length}</Count><Articles>${itemsXml}</Articles></News>`;
      break;
      
    default:
      contentXml = `<Content><![CDATA[不支持的消息类型]]></Content>`;
      msgType = 'text';
  }
  
  return `<xml>
    <ToUserName><![CDATA[${toUser}]]></ToUserName>
    <FromUserName><![CDATA[${fromUser}]]></FromUserName>
    <CreateTime>${timestamp}</CreateTime>
    <MsgType><![CDATA[${msgType}]]></MsgType>
    ${contentXml}
  </xml>`;
}

// 解析微信消息
function parseWeChatMessage(body) {
  const xml2js = require('xml2js');
  const parser = new xml2js.Parser({ explicitArray: false });
  
  return new Promise((resolve, reject) => {
    parser.parseString(body, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      
      const msg = result.xml;
      resolve({
        toUserName: msg.ToUserName,
        fromUserName: msg.FromUserName,
        createTime: msg.CreateTime,
        msgType: msg.MsgType,
        content: msg.Content,
        mediaId: msg.MediaId,
        picUrl: msg.PicUrl,
        format: msg.Format,
        recognition: msg.Recognition,
        thumbMediaId: msg.ThumbMediaId,
        locationX: msg.Location_X,
        locationY: msg.Location_Y,
        scale: msg.Scale,
        label: msg.Label,
        title: msg.Title,
        description: msg.Description,
        url: msg.Url,
        event: msg.Event,
        eventKey: msg.EventKey
      });
    });
  });
}

// 验证签名
function verifySignature(token, timestamp, nonce, signature) {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join('');
  const hash = crypto.createHash('sha1');
  const expected = hash.update(str).digest('hex');
  
  return expected === signature;
}

// 获取帮助消息
function getHelpMessage() {
  return {
    msgType: 'news',
    articles: [
      {
        title: '🦁 AImum 微信助手',
        description: '一人公司 AI 操作系统 - 微信集成',
        picUrl: '',
        url: ''
      },
      {
        title: '📋 命令帮助',
        description: '/help - 显示帮助\n/status - 系统状态\n/progress - 开发进度\n/test - 测试消息',
        picUrl: '',
        url: ''
      },
      {
        title: '📊 项目进度',
        description: 'Phase 1 MVP 已完成 100%',
        picUrl: '',
        url: ''
      }
    ]
  };
}

// 获取状态消息
function getStatusMessage() {
  return {
    msgType: 'text',
    content: {
      text: `🦁 **AImum 系统状态**

✅ **Phase 1: MVP** - 已完成
✅ **工作流引擎** - 已完成
✅ **飞书集成** - 已完成
✅ **GitHub 同步** - 正常

📊 **总体进度**: 42% (13/31 任务)

---
发送 "/progress" 查看详细进度`
    }
  };
}

// 获取进度消息
function getProgressMessage() {
  return {
    msgType: 'text',
    content: {
      text: `📊 **AImum 开发进度**

✅ **Phase 1: MVP** - 100% (12/12)
✅ **工作流引擎** - 刚完成
⏳ **Phase 2** - 7/56 完成

**下一步任务:**
• 微信集成 ⏳
• 飞书深度集成 ⏳
• 桌面客户端 ⏳

🎯 **总体进度**: 42% (13/31)`
    }
  };
}

// 获取测试消息
function getTestMessage() {
  return {
    msgType: 'text',
    content: {
      text: `✅ **微信消息测试成功！**

📱 消息接收: 正常
🔄 消息处理: 正常
💬 自动回复: 正常

*AImum 微信集成运行正常！*`
    }
  };
}

// 获取关注消息
function getSubscribeMessage() {
  return {
    msgType: 'news',
    articles: [
      {
        title: '🎉 欢迎关注 AImum！',
        description: '一人公司 AI 操作系统已上线！\n\n发送 "/help" 查看帮助',
        picUrl: '',
        url: ''
      },
      {
        title: '🚀 Phase 1 已完成',
        description: 'MVP 开发完成，包括 AI 对话、令牌系统、插件市场等',
        picUrl: '',
        url: ''
      }
    ]
  };
}

// 获取点击菜单消息
function getClickMessage(eventKey) {
  switch (eventKey) {
    case 'V1001_STATUS':
      return getStatusMessage();
    case 'V1002_HELP':
      return getHelpMessage();
    default:
      return {
        msgType: 'text',
        content: {
          text: `收到菜单点击: ${eventKey}`
        }
      };
  }
}

// 获取 access_token
async function getAccessToken() {
  if (!CONFIG.appId || !CONFIG.appSecret) {
    return null;
  }
  
  try {
    const url = `${CONFIG.apiBaseUrl}/cgi-bin/token?grant_type=client_credential&appid=${CONFIG.appId}&secret=${CONFIG.appSecret}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.access_token) {
      return data.access_token;
    }
    return null;
  } catch (error) {
    console.error('[WeChat] Get access token failed:', error);
    return null;
  }
}

// 获取用户信息
async function getUserInfo(openid) {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  
  try {
    const url = `${CONFIG.apiBaseUrl}/cgi-bin/user/info?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;
    const res = await fetch(url);
    return await res.json();
  } catch (error) {
    console.error('[WeChat] Get user info failed:', error);
    return null;
  }
}

// 发送模板消息
async function sendTemplateMessage(openid, templateId, data, url = '') {
  const accessToken = await getAccessToken();
  if (!accessToken) return { success: false, error: 'No access token' };
  
  try {
    const body = {
      touser: openid,
      template_id: templateId,
      url: url,
      data: data
    };
    
    const res = await fetch(`${CONFIG.apiBaseUrl}/cgi-bin/message/template/send?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    return await res.json();
  } catch (error) {
    console.error('[WeChat] Send template message failed:', error);
    return { success: false, error: error.message };
  }
}

// API 路由处理
module.exports = async function handler(req, res) {
  const { method, query } = req;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    return res.status(200).send('OK');
  }
  
  try {
    // GET 请求：验证 URL 有效性
    if (method === 'GET') {
      const { signature, timestamp, nonce, echostr } = query;
      
      // 验证签名
      if (verifySignature(CONFIG.token, timestamp, nonce, signature)) {
        return res.status(200).send(echostr || '');
      } else {
        return res.status(401).send('Signature verification failed');
      }
    }
    
    // POST 请求：接收消息
    if (method === 'POST') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString();
      
      // 解析消息
      const message = await parseWeChatMessage(body);
      const fromUser = message.fromUserName;
      const toUser = message.toUserName;
      const msgType = message.msgType;
      
      console.log(`[WeChat] 收到消息: ${msgType} from ${fromUser}`);
      
      // 获取处理器
      let handler = DEFAULT_HANDLERS[msgType];
      
      if (!handler) {
        console.log(`[WeChat] 不支持的消息类型: ${msgType}`);
        return res.status(200).send('');
      }
      
      // 处理消息
      try {
        const response = await handler(message, req);
        
        if (!response) {
          return res.status(200).send('');
        }
        
        // 发送响应
        const xmlResponse = createWeChatResponse(fromUser, toUser, response.msgType, response.content);
        return res.status(200).send(xmlResponse);
      } catch (error) {
        console.error('[WeChat] Handler error:', error);
        const errorResponse = createWeChatResponse(fromUser, toUser, 'text', { text: '处理消息时出错，请重试。' });
        return res.status(200).send(errorResponse);
      }
    }
    
    return res.status(405).send('Method not allowed');
  } catch (error) {
    console.error('[WeChat] Error:', error);
    return res.status(500).send('Server error');
  }
};

// 导出函数
module.exports.verifySignature = verifySignature;
module.exports.sendTemplateMessage = sendTemplateMessage;
module.exports.getUserInfo = getUserInfo;
module.exports.getAccessToken = getAccessToken;
