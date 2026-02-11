// AImum API - Plugins List

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const plugins = [
    {
      id: 'wechat',
      name: '微信助手',
      icon: '💬',
      description: '自动回复、消息管理、客户跟进',
      price: 'free',
      category: 'sales',
      author: 'AImum Team',
      version: '1.0.0',
      installUrl: 'https://github.com/ailovem/aimum-plugins/wechat'
    },
    {
      id: 'content',
      name: '内容生成器',
      icon: '✍️',
      description: '小红书、抖音、公众号文案自动生成',
      price: '9.9',
      priceType: 'monthly',
      category: 'marketing',
      author: 'AImum Team',
      version: '1.0.0',
      installUrl: 'https://github.com/ailovem/aimum-plugins/content'
    },
    {
      id: 'calendar',
      name: '智能日历',
      icon: '📅',
      description: '自动排期、智能提醒、行程管理',
      price: 'free',
      category: 'admin',
      author: 'AImum Team',
      version: '1.0.0',
      installUrl: 'https://github.com/ailovem/aimum-plugins/calendar'
    },
    {
      id: 'invoice',
      name: '发票助手',
      icon: '🧾',
      description: '发票识别、智能记账、自动对账',
      price: '5',
      priceType: 'monthly',
      category: 'finance',
      author: 'AImum Team',
      version: '1.0.0',
      installUrl: 'https://github.com/ailovem/aimum-plugins/invoice'
    },
    {
      id: 'deploy',
      name: '一键部署',
      icon: '🚀',
      description: 'GitHub、Vercel、Netlify 自动化部署',
      price: '19',
      priceType: 'monthly',
      category: 'tech',
      author: 'AImum Team',
      version: '1.0.0',
      installUrl: 'https://github.com/ailovem/aimum-plugins/deploy'
    }
  ];
  
  return res.json({ plugins });
};
