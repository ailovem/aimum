// AImum API - AI Chat Endpoint

const axios = require('axios');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { message, model = 'deepseek', dept } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // 根据部门构建 system prompt
    const systemPrompts = {
      sales: '你是 AImum 销售部助手，擅长客户沟通、销售话术、转化提升。',
      marketing: '你是 AImum 市场部助手，擅长内容创作、营销策略、品牌推广。',
      finance: '你是 AImum 财务部助手，擅长记账、报表、税务规划。',
      admin: '你是 AImum 行政部助手，擅长日程管理、任务协调、效率提升。',
      tech: '你是 AImum 技术部助手，擅长开发、运维、技术咨询。',
      general: '你是 AImum，一个 AI 助手，帮助一人公司提高效率。'
    };
    
    const systemPrompt = systemPrompts[dept] || systemPrompts.general;
    
    // 调用 DeepSeek API（示例）
    const apiKey = process.env.DEEPSEEK_API_KEY || '';
    
    if (apiKey && model === 'deepseek') {
      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const reply = response.data.choices[0].message.content;
      return res.json({ reply, model: 'deepseek' });
    }
    
    // 默认返回模拟回复（后续接入真实 API）
    const mockReplies = {
      sales: `作为销售部助手，我建议：\n\n1. 了解客户痛点\n2. 突出产品价值\n3. 提供案例证明\n4. 限时优惠促成\n\n需要我帮你写具体话术吗？`,
      
      marketing: `市场部建议：\n\n• 短视频：15-30秒，突出卖点\n• 小红书：种草+实用结合\n• 公众号：深度内容+互动\n\n想先做哪个平台的内容？`,
      
      finance: `财务部提醒：\n\n• 收支要记录\n• 发票要归档\n• 报表要定期\n\n需要帮忙整理哪方面？`,
      
      admin: `行政部服务中：\n\n• 日程已记录\n• 提醒已设置\n• 任务已分配\n\n还有什么要帮忙？`,
      
      tech: `技术部在线：\n\n• 代码审查 OK\n• 部署已完成\n• Bug 已修复\n\n技术支持，随时待命！`,
      
      general: `我是 AImum 🦁\n\n选择上方的部门开始工作，或者直接问我问题。\n\n一人公司，一个 AI 团队！`
    };
    
    const reply = mockReplies[dept] || mockReplies.general;
    
    return res.json({ reply, model: 'mock' });
    
  } catch (error) {
    console.error('API Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
