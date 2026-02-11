/**
 * AImum 插件市场 API
 * 
 * 功能：
 * 1. 插件列表管理
 * 2. 插件安装/卸载
 * 3. 插件启用/禁用
 * 4. 插件搜索和分类
 */

const crypto = require('crypto');

// 配置
const CONFIG = {
  // 内置插件
  BUILTIN_PLUGINS: [
    {
      id: 'file-converter',
      name: '文件转换专家',
      description: '支持 PDF、Word、Excel、图片等格式互转',
      icon: '📄',
      category: 'tools',
      version: '1.0.0',
      author: 'AImum',
      builtin: true,
      enabled: true,
      price: 0,
      permissions: ['file.read', 'file.write'],
      tags: ['文件', '转换', '工具']
    },
    {
      id: 'image-ocr',
      name: 'OCR 文字识别',
      description: '图片文字提取，支持多种语言',
      icon: '🔍',
      category: 'ai',
      version: '1.0.0',
      author: 'AImum',
      builtin: true,
      enabled: true,
      price: 0,
      permissions: ['image.read'],
      tags: ['OCR', '文字识别', '图片']
    },
    {
      id: 'web-search',
      name: '网络搜索',
      description: '实时网络搜索，获取最新信息',
      icon: '🌐',
      category: 'ai',
      version: '1.0.0',
      author: 'AImum',
      builtin: true,
      enabled: true,
      price: 5, // 每次消耗 5 tokens
      permissions: ['network.request'],
      tags: ['搜索', '网络', '实时']
    },
    {
      id: 'calculator',
      name: '计算器',
      description: '数学计算、汇率换算、单位转换',
      icon: '🧮',
      category: 'tools',
      version: '1.0.0',
      author: 'AImum',
      builtin: true,
      enabled: true,
      price: 0,
      permissions: [],
      tags: ['计算', '数学', '工具']
    },
    {
      id: 'code-runner',
      name: '代码运行器',
      description: '支持 Python、JavaScript、Node.js 等语言',
      icon: '👨‍💻',
      category: 'dev',
      version: '1.0.0',
      author: 'AImum',
      builtin: true,
      enabled: false,
      price: 10,
      permissions: ['execute.code'],
      tags: ['代码', '编程', '开发']
    }
  ],
  
  // 插件分类
  CATEGORIES: {
    all: { name: '全部', icon: '📦' },
    ai: { name: 'AI 能力', icon: '🤖' },
    tools: { name: '工具', icon: '🔧' },
    dev: { name: '开发者', icon: '👨‍💻' },
    productivity: { name: '效率', icon: '⚡' },
    integration: { name: '集成', icon: '🔗' }
  },
  
  // 用户安装的插件
  installedPlugins: new Map(), // userId -> { pluginId: installed }
  pluginSettings: new Map()   // userId_pluginId -> settings
};

// 获取插件列表
function getPlugins(filters = {}) {
  let plugins = [...CONFIG.BUILTIN_PLUGINS];
  
  // 分类筛选
  if (filters.category && filters.category !== 'all') {
    plugins = plugins.filter(p => p.category === filters.category);
  }
  
  // 搜索
  if (filters.search) {
    const search = filters.search.toLowerCase();
    plugins = plugins.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search) ||
      p.tags.some(t => t.toLowerCase().includes(search))
    );
  }
  
  // 排序
  if (filters.sort === 'popular') {
    plugins.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  } else if (filters.sort === 'newest') {
    plugins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (filters.sort === 'price') {
    plugins.sort((a, b) => a.price - b.price);
  }
  
  return plugins;
}

// 获取插件详情
function getPlugin(pluginId) {
  return CONFIG.BUILTIN_PLUGINS.find(p => p.id === pluginId);
}

// 安装插件
async function installPlugin(userId, pluginId) {
  const plugin = getPlugin(pluginId);
  
  if (!plugin) {
    return { success: false, error: '插件不存在' };
  }
  
  // 初始化用户插件
  if (!CONFIG.installedPlugins.has(userId)) {
    CONFIG.installedPlugins.set(userId, new Map());
  }
  
  const installed = CONFIG.installedPlugins.get(userId);
  
  if (installed.has(pluginId)) {
    return { success: false, error: '插件已安装' };
  }
  
  // 安装插件
  installed.set(pluginId, {
    installedAt: Date.now(),
    enabled: true,
    version: plugin.version
  });
  
  return {
    success: true,
    data: {
      pluginId,
      message: '插件安装成功'
    }
  };
}

// 卸载插件
async function uninstallPlugin(userId, pluginId) {
  const plugin = getPlugin(pluginId);
  
  if (!plugin) {
    return { success: false, error: '插件不存在' };
  }
  
  if (plugin.builtin) {
    return { success: false, error: '内置插件无法卸载' };
  }
  
  const installed = CONFIG.installedPlugins.get(userId);
  
  if (!installed || !installed.has(pluginId)) {
    return { success: false, error: '插件未安装' };
  }
  
  installed.delete(pluginId);
  
  return {
    success: true,
    data: {
      pluginId,
      message: '插件卸载成功'
    }
  };
}

// 启用/禁用插件
async function togglePlugin(userId, pluginId, enabled) {
  const plugin = getPlugin(pluginId);
  
  if (!plugin) {
    return { success: false, error: '插件不存在' };
  }
  
  const installed = CONFIG.installedPlugins.get(userId);
  
  if (!installed || !installed.has(pluginId)) {
    return { success: false, error: '插件未安装' };
  }
  
  const info = installed.get(pluginId);
  info.enabled = enabled;
  
  return {
    success: true,
    data: {
      pluginId,
      enabled,
      message: enabled ? '插件已启用' : '插件已禁用'
    }
  };
}

// 获取已安装插件
function getInstalledPlugins(userId) {
  const installed = CONFIG.installedPlugins.get(userId) || new Map();
  
  const plugins = [];
  
  for (const [pluginId, info] of installed) {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      plugins.push({
        ...plugin,
        installedAt: info.installedAt,
        enabled: info.enabled
      });
    }
  }
  
  return plugins;
}

// 获取可用插件（未安装的）
function getAvailablePlugins(userId) {
  const installed = CONFIG.installedPlugins.get(userId) || new Map();
  
  return CONFIG.BUILTIN_PLUGINS.filter(p => !installed.has(p.id));
}

// 执行插件
async function executePlugin(userId, pluginId, action, params = {}) {
  const plugin = getPlugin(pluginId);
  
  if (!plugin) {
    return { success: false, error: '插件不存在' };
  }
  
  const installed = CONFIG.installedPlugins.get(userId);
  
  if (!installed || !installed.has(pluginId)) {
    return { success: false, error: '插件未安装' };
  }
  
  const info = installed.get(pluginId);
  
  if (!info.enabled) {
    return { success: false, error: '插件已禁用' };
  }
  
  // 检查权限
  for (const permission of plugin.permissions) {
    if (!hasPermission(userId, permission)) {
      return { success: false, error: '权限不足' };
    }
  }
  
  // 执行插件逻辑
  try {
    const result = await runPluginLogic(pluginId, action, params);
    return {
      success: true,
      data: {
        pluginId,
        result
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 检查权限
function hasPermission(userId, permission) {
  // TODO: 实现权限检查逻辑
  return true;
}

// 插件逻辑（简化版）
async function runPluginLogic(pluginId, action, params) {
  switch (pluginId) {
    case 'file-converter':
      return { message: '文件转换插件（请配置 CloudConvert API）' };
    
    case 'image-ocr':
      return { message: 'OCR 插件（请配置 OCR 服务）' };
    
    case 'web-search':
      return { message: '网络搜索插件', results: [] };
    
    case 'calculator':
      return { result: calculate(params.expression) };
    
    case 'code-runner':
      return { message: '代码运行插件（请配置运行环境）' };
    
    default:
      return { message: '未知插件' };
  }
}

// 简单计算器
function calculate(expression) {
  try {
    // 安全计算（只允许数字和运算符）
    const safe = expression.replace(/[^0-9+\-*/().\s]/g, '');
    return { result: eval(safe) };
  } catch (error) {
    throw new Error('计算表达式无效');
  }
}

// 获取分类列表
function getCategories() {
  return Object.entries(CONFIG.CATEGORIES).map(([id, cat]) => ({
    id,
    ...cat,
    count: id === 'all' 
      ? CONFIG.BUILTIN_PLUGINS.length 
      : CONFIG.BUILTIN_PLUGINS.filter(p => p.category === id).length
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
    
    // 验证用户（简化处理）
    const authHeader = req.headers.authorization;
    let userId = 'demo_user'; // 默认 demo 用户
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const parts = token.split('_');
      if (parts.length >= 1) {
        userId = parts[0];
      }
    }
    
    // 路由处理
    switch (endpoint) {
      // 获取插件列表
      case 'plugins': {
        const filters = {
          category: params.category || 'all',
          search: params.search || '',
          sort: params.sort || 'popular'
        };
        
        const plugins = getPlugins(filters);
        
        return res.status(200).json({
          success: true,
          data: { plugins }
        });
      }
      
      // 获取插件详情
      case 'plugin': {
        const { pluginId } = params;
        
        if (!pluginId) {
          return res.status(400).json({ success: false, error: '插件 ID 必填' });
        }
        
        const plugin = getPlugin(pluginId);
        
        if (!plugin) {
          return res.status(404).json({ success: false, error: '插件不存在' });
        }
        
        return res.status(200).json({
          success: true,
          data: { plugin }
        });
      }
      
      // 安装插件
      case 'install': {
        const { pluginId } = body;
        
        if (!pluginId) {
          return res.status(400).json({ success: false, error: '插件 ID 必填' });
        }
        
        const result = await installPlugin(userId, pluginId);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 卸载插件
      case 'uninstall': {
        const { pluginId } = body;
        
        if (!pluginId) {
          return res.status(400).json({ success: false, error: '插件 ID 必填' });
        }
        
        const result = await uninstallPlugin(userId, pluginId);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 切换插件状态
      case 'toggle': {
        const { pluginId, enabled } = body;
        
        if (!pluginId) {
          return res.status(400).json({ success: false, error: '插件 ID 必填' });
        }
        
        const result = await togglePlugin(userId, pluginId, enabled);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 获取已安装插件
      case 'installed': {
        const plugins = getInstalledPlugins(userId);
        
        return res.status(200).json({
          success: true,
          data: { plugins }
        });
      }
      
      // 获取可用插件
      case 'available': {
        const plugins = getAvailablePlugins(userId);
        
        return res.status(200).json({
          success: true,
          data: { plugins }
        });
      }
      
      // 执行插件
      case 'execute': {
        const { pluginId, action, params } = body;
        
        if (!pluginId) {
          return res.status(400).json({ success: false, error: '插件 ID 必填' });
        }
        
        const result = await executePlugin(userId, pluginId, action, params);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // 获取分类列表
      case 'categories': {
        const categories = getCategories();
        
        return res.status(200).json({
          success: true,
          data: { categories }
        });
      }
      
      // 健康检查
      case 'health': {
        return res.status(200).json({
          success: true,
          data: {
            status: 'ok',
            timestamp: Date.now(),
            totalPlugins: CONFIG.BUILTIN_PLUGINS.length,
            categories: Object.keys(CONFIG.CATEGORIES).length
          }
        });
      }
      
      default:
        return res.status(404).json({ success: false, error: '接口不存在' });
    }
  } catch (error) {
    console.error('[Plugins API] Error:', error);
    return res.status(500).json({ success: false, error: '服务器错误' });
  }
};

// 导出供测试
module.exports.getPlugins = getPlugins;
module.exports.getPlugin = getPlugin;
module.exports.installPlugin = installPlugin;
module.exports.uninstallPlugin = uninstallPlugin;
module.exports.getInstalledPlugins = getInstalledPlugins;
module.exports.getCategories = getCategories;
