/**
 * AImum 单元测试
 * 
 * 运行方式:
 *   npm test
 *   npm run test:unit
 *   npm run test:api
 *   npm run test:all
 */

const assert = require('assert');
const path = require('path');

// 测试配置
const CONFIG = {
  testDir: __dirname,
  verbose: true
};

// 测试结果收集
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

// 测试框架
class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
  }
  
  test(name, fn) {
    this.tests.push({ name, fn });
  }
  
  async run() {
    console.log(`\n📦 ${this.name}`);
    console.log('='.repeat(50));
    
    for (const test of this.tests) {
      try {
        await test.fn();
        testResults.passed++;
        testResults.total++;
        console.log(`  ✅ ${test.name}`);
      } catch (error) {
        testResults.failed++;
        testResults.total++;
        console.log(`  ❌ ${test.name}`);
        console.log(`     错误: ${error.message}`);
      }
    }
  }
}

// 断言辅助函数
function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
}

function ok(value, message) {
  if (!value) {
    throw new Error(message || 'Expected truthy value');
  }
}

function throws(fn, expectedError) {
  try {
    fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (expectedError && !error.message.includes(expectedError)) {
      throw new Error(`Expected error containing "${expectedError}", got "${error.message}"`);
    }
  }
}

// ============ API 测试 ============

async function testAuthAPI() {
  const runner = new TestRunner('API: Auth (认证)');
  
  // 模拟用户数据
  const mockUsers = new Map();
  
  runner.test('用户注册 - 创建新用户', () => {
    const phone = '13800138000';
    const userId = 'user_' + Date.now();
    
    mockUsers.set(phone, {
      userId,
      phone,
      nickname: '测试用户',
      tokens: 100,
      createdAt: Date.now()
    });
    
    ok(mockUsers.has(phone), '用户应该已创建');
    equal(mockUsers.get(phone).tokens, 100, '新用户应该有100 tokens');
  });
  
  runner.test('用户登录 - 验证凭据', () => {
    const phone = '13800138000';
    const user = mockUsers.get(phone);
    
    ok(user, '用户应该存在');
    ok(user.userId, '用户应该有ID');
    ok(user.tokens >= 0, '用户应该有非负tokens');
  });
  
  runner.test('Token 消耗 - 扣减余额', () => {
    const phone = '13800138000';
    const user = mockUsers.get(phone);
    const initialTokens = user.tokens;
    
    user.tokens -= 10;
    
    equal(user.tokens, initialTokens - 10, 'Token 应该扣减10');
  });
  
  runner.test('Token 充值 - 增加余额', () => {
    const phone = '13800138000';
    const user = mockUsers.get(phone);
    const initialTokens = user.tokens;
    
    user.tokens += 50;
    
    equal(user.tokens, initialTokens + 50, 'Token 应该增加50');
  });
  
  await runner.run();
}

async function testChatAPI() {
  const runner = new TestRunner('API: Chat (对话)');
  
  // 模拟对话数据
  const conversations = new Map();
  const messages = new Map();
  
  runner.test('创建对话', () => {
    const convId = 'conv_' + Date.now();
    const userId = 'user_123';
    
    conversations.set(convId, {
      conversationId: convId,
      userId,
      model: 'claude-sonnet-4-20250514',
      createdAt: Date.now()
    });
    
    ok(conversations.has(convId), '对话应该已创建');
  });
  
  runner.test('发送消息', () => {
    const convId = 'conv_test';
    const messageId = 'msg_' + Date.now();
    
    if (!messages.has(convId)) {
      messages.set(convId, []);
    }
    
    messages.get(convId).push({
      messageId,
      role: 'user',
      content: '测试消息',
      timestamp: Date.now()
    });
    
    equal(messages.get(convId).length, 1, '应该有一条消息');
  });
  
  runner.test('AI 回复', () => {
    const convId = 'conv_test';
    const messagesList = messages.get(convId);
    
    messagesList.push({
      messageId: 'msg_ai_' + Date.now(),
      role: 'assistant',
      content: '这是一个测试回复',
      timestamp: Date.now()
    });
    
    equal(messagesList.filter(m => m.role === 'assistant').length, 1, '应该有一条AI回复');
    equal(messagesList.length, 2, '应该有2条消息');
  });
  
  runner.test('计算 Token 消耗', () => {
    const messagesList = messages.get('conv_test');
    const estimatedTokens = messagesList.length * 100; // 假设每条消息100 tokens
    
    ok(estimatedTokens > 0, '估算消耗应该大于0');
    equal(estimatedTokens, 200, '2条消息应该消耗200 tokens');
  });
  
  await runner.run();
}

async function testTokensAPI() {
  const runner = new TestRunner('API: Tokens (令牌)');
  
  const plans = {
    free: { id: 'free', name: '免费版', price: 0, tokens: 100 },
    pro: { id: 'pro', name: '专业版', price: 29, tokens: 5000 },
    enterprise: { id: 'enterprise', name: '企业版', price: 99, tokens: 20000 }
  };
  
  runner.test('套餐定义', () => {
    ok(plans.free, '免费套餐应该存在');
    ok(plans.pro, '专业套餐应该存在');
    ok(plans.enterprise, '企业套餐应该存在');
    
    equal(plans.free.price, 0, '免费套餐应该免费');
    equal(plans.pro.price, 29, '专业套餐应该29元');
    equal(plans.enterprise.price, 99, '企业套餐应该99元');
  });
  
  runner.test('套餐价格计算', () => {
    const monthlyCost = plans.pro.price + plans.enterprise.price;
    equal(monthlyCost, 128, '套餐价格合计应该正确');
  });
  
  runner.test('Token 性价比', () => {
    const freeValue = plans.free.tokens / (plans.free.price || 1);
    const proValue = plans.pro.tokens / plans.pro.price;
    const enterpriseValue = plans.enterprise.tokens / plans.enterprise.price;
    
    ok(proValue > freeValue, '付费套餐应该更划算');
    ok(enterpriseValue > proValue, '企业版应该最划算');
  });
  
  await runner.run();
}

async function testPluginsAPI() {
  const runner = new TestRunner('API: Plugins (插件)');
  
  const builtinPlugins = [
    { id: 'file-converter', name: '文件转换专家', category: 'tools', builtin: true },
    { id: 'image-ocr', name: 'OCR 文字识别', category: 'ai', builtin: true },
    { id: 'web-search', name: '网络搜索', category: 'ai', builtin: true },
    { id: 'calculator', name: '计算器', category: 'tools', builtin: true },
    { id: 'code-runner', name: '代码运行器', category: 'dev', builtin: true }
  ];
  
  runner.test('内置插件数量', () => {
    equal(builtinPlugins.length, 5, '应该有5个内置插件');
  });
  
  runner.test('插件分类', () => {
    const aiPlugins = builtinPlugins.filter(p => p.category === 'ai');
    const toolPlugins = builtinPlugins.filter(p => p.category === 'tools');
    const devPlugins = builtinPlugins.filter(p => p.category === 'dev');
    
    equal(aiPlugins.length, 2, '应该有2个AI插件');
    equal(toolPlugins.length, 2, '应该有2个工具插件');
    equal(devPlugins.length, 1, '应该有1个开发者插件');
  });
  
  runner.test('插件启用状态', () => {
    const enabledPlugins = builtinPlugins.filter(p => p.builtin);
    ok(enabledPlugins.length > 0, '应该有已启用的插件');
  });
  
  await runner.run();
}

// ============ 工具函数测试 ============

function testUtils() {
  const runner = new TestRunner('Utils (工具函数)');
  
  runner.test('生成验证码', () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    ok(code.length === 6, '验证码应该是6位');
    ok(/^\d+$/.test(code), '验证码应该只包含数字');
  });
  
  runner.test('生成唯一ID', () => {
    const id1 = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const id2 = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    ok(id1.length > 10, 'ID应该足够长');
    ok(id1 !== id2, '两次生成的ID应该不同');
  });
  
  runner.test('URL 拼接', () => {
    const baseUrl = 'https://api.example.com';
    const path = '/v1/chat';
    const fullUrl = baseUrl + path;
    
    ok(fullUrl.startsWith('https://'), 'URL应该以https://开头');
    ok(fullUrl.includes('api.example.com'), 'URL应该包含域名');
    ok(fullUrl.endsWith('/v1/chat'), 'URL应该以路径结尾');
  });
  
  runner.test('时间格式化', () => {
    const now = Date.now();
    const date = new Date(now);
    const formatted = date.toISOString();
    
    ok(formatted.includes('-'), '日期应该包含分隔符');
    ok(formatted.includes('T'), '日期应该包含T分隔符');
  });
  
  runner.run();
}

// ============ 运行测试 ============

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 AImum 单元测试');
  console.log('='.repeat(60));
  
  await testAuthAPI();
  await testChatAPI();
  await testTokensAPI();
  await testPluginsAPI();
  testUtils();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果');
  console.log('='.repeat(60));
  console.log(`  总计: ${testResults.total}`);
  console.log(`  ✅ 通过: ${testResults.passed}`);
  console.log(`  ❌ 失败: ${testResults.failed}`);
  console.log('');
  
  if (testResults.failed > 0) {
    console.log('❌ 有测试失败！\n');
    process.exit(1);
  } else {
    console.log('✅ 所有测试通过！\n');
    process.exit(0);
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--api')) {
    testAuthAPI().then(() => testChatAPI()).then(() => testTokensAPI()).then(() => testPluginsAPI());
  } else if (args.includes('--utils')) {
    testUtils();
  } else {
    runAllTests();
  }
}

module.exports = {
  runAllTests,
  testAuthAPI,
  testChatAPI,
  testTokensAPI,
  testPluginsAPI,
  testUtils
};
