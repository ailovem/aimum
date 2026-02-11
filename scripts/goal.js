/**
 * AImum 目标理解引擎
 * 
 * 功能：
 * 1. 自然语言理解 (NLU)
 * 2. 意图识别
 * 3. 目标提取
 * 4. 约束识别
 * 5. 目标分解
 */

const crypto = require('crypto');

// 配置
const CONFIG = {
  // AI 模型配置
  models: {
    primary: 'claude-sonnet-4-20250514',
    fallback: 'deepseek-chat',
    fast: 'claude-haiku-3-20250514'
  },
  
  // 意图类型
  INTENT_TYPES: {
    TASK: 'task',           // 执行任务
    QUERY: 'query',         // 查询信息
    CHAT: 'chat',           // 普通对话
    PLANNING: 'planning',   // 任务规划
    MANAGEMENT: 'management', // 管理操作
    UNKNOWN: 'unknown'
  },
  
  // 任务类型
  TASK_TYPES: {
    ORGANIZE: 'organize',       // 整理类
    CREATE: 'create',           // 创建类
    SEARCH: 'search',           // 搜索类
    ANALYZE: 'analyze',         // 分析类
    COMMUNICATE: 'communicate', // 沟通类
    AUTOMATE: 'automate',       // 自动化类
    MONITOR: 'monitor',         // 监控类
    REPORT: 'report'           // 报告类
  },
  
  // 优先级
  PRIORITIES: {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4
  }
};

// 意图关键词
const INTENT_KEYWORDS = {
  [CONFIG.INTENT_TYPES.TASK]: [
    '帮我', '帮我做', '请帮我', '帮我完成',
    '整理', '分类', '清理', '组织',
    '创建', '生成', '制作', '写',
    '查找', '搜索', '找', '搜索',
    '分析', '研究', '调研',
    '发送', '通知', '提醒'
  ],
  [CONFIG.INTENT_TYPES.QUERY]: [
    '是什么', '什么是', '解释', '说明',
    '怎么', '如何', '怎样',
    '为什么', '原因', '理由',
    '多少', '几个', '几个',
    '查看', '看看'
  ],
  [CONFIG.INTENT_TYPES.PLANNING]: [
    '计划', '安排', '日程',
    '明天', '后天', '下周', '日程表',
    '提醒', '定时', '什么时候'
  ],
  [CONFIG.INTENT_TYPES.MANAGEMENT]: [
    '管理', '控制', '设置', '配置',
    '更新', '修改', '删除', '取消',
    '启用', '禁用', '开关'
  ]
};

// 时间表达识别
const TIME_PATTERNS = [
  { pattern: /今天/i, value: 'today' },
  { pattern: /明天/i, value: 'tomorrow' },
  { pattern: /后天/i, value: 'day_after_tomorrow' },
  { pattern: /下周/i, value: 'next_week' },
  { pattern: /下周[一二三四五六日天]/i, value: 'next_week_specific' },
  { pattern: /(\d+)点/i, value: 'time_specific', group: 1 },
  { pattern: /(\d+)点(\d+)分/i, value: 'datetime_specific', groups: [1, 2] },
  { pattern: /上午/i, value: 'morning' },
  { pattern: /下午/i, value: 'afternoon' },
  { pattern: /晚上/i, value: 'evening' }
];

// 数量表达识别
const QUANTITY_PATTERNS = [
  { pattern: /(\d+)个/i, value: 'count', group: 1 },
  { pattern: /(\d+)份/i, value: 'count', group: 1 },
  { pattern: /(\d+)张/i, value: 'count', group: 1 },
  { pattern: /全部/i, value: 'all' },
  { pattern: /所有/i, value: 'all' }
];

// 核心类
class GoalUnderstanding {
  constructor(options = {}) {
    this.model = options.model || CONFIG.models.primary;
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    this.apiUrl = options.apiUrl || 'https://api.anthropic.com/v1/complete';
  }
  
  // 主入口：理解用户输入
  async understand(input, context = {}) {
    // 1. 预处理
    const cleanedInput = this.preprocess(input);
    
    // 2. 意图识别
    const intent = this.recognizeIntent(cleanedInput);
    
    // 3. 目标提取
    const goal = this.extractGoal(cleanedInput, intent);
    
    // 4. 约束识别
    const constraints = this.extractConstraints(cleanedInput, context);
    
    // 5. 时间要求
    const timeRequirements = this.extractTimeRequirements(cleanedInput);
    
    // 6. 优先级评估
    const priority = this.assessPriority(cleanedInput, constraints);
    
    // 7. 可行性评估
    const feasibility = this.assessFeasibility(goal, constraints);
    
    return {
      originalInput: input,
      cleanedInput,
      intent,
      goal,
      constraints,
      timeRequirements,
      priority,
      feasibility,
      timestamp: Date.now()
    };
  }
  
  // 预处理
  preprocess(input) {
    return input
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[""'']/g, '')
      .trim();
  }
  
  // 意图识别
  recognizeIntent(input) {
    let bestMatch = { type: CONFIG.INTENT_TYPES.UNKNOWN, score: 0 };
    
    for (const [type, keywords] of Object.entries(INTENT_KEYWORDS)) {
      let score = 0;
      
      for (const keyword of keywords) {
        if (input.includes(keyword)) {
          score++;
        }
      }
      
      if (score > bestMatch.score) {
        bestMatch = { type, score };
      }
    }
    
    // 如果是普通对话（未匹配到明确意图）
    if (bestMatch.type === CONFIG.INTENT_TYPES.UNKNOWN || bestMatch.score === 0) {
      // 检查是否包含问号
      if (input.includes('?')) {
        return { type: CONFIG.INTENT_TYPES.QUERY, score: 0.8 };
      }
      // 默认认为是普通对话
      return { type: CONFIG.INTENT_TYPES.CHAT, score: 0.5 };
    }
    
    return bestMatch;
  }
  
  // 目标提取
  extractGoal(input, intent) {
    // 移除意图词
    let goalText = input;
    
    const intentWords = [
      '帮我', '请帮我', '帮我做',
      '是什么', '什么是',
      '怎么', '如何', '怎样',
      '为什么',
      '帮我整理', '帮我创建'
    ];
    
    for (const word of intentWords) {
      goalText = goalText.replace(word, '');
    }
    
    goalText = goalText.trim();
    
    // 移除标点
    goalText = goalText.replace(/[。，！？、；：""'']/g, '');
    
    // 分类任务类型
    const taskType = this.classifyTaskType(goalText);
    
    return {
      text: goalText,
      type: taskType,
      originalInput: input,
      summary: this.summarizeGoal(goalText)
    };
  }
  
  // 任务类型分类
  classifyTaskType(goalText) {
    const lowerGoal = goalText.toLowerCase();
    
    const typeKeywords = {
      [CONFIG.TASK_TYPES.ORGANIZE]: ['整理', '分类', '清理', '组织', '管理'],
      [CONFIG.TASK_TYPES.CREATE]: ['创建', '生成', '制作', '写', '新建'],
      [CONFIG.TASK_TYPES.SEARCH]: ['查找', '搜索', '找', '搜索'],
      [CONFIG.TASK_TYPES.ANALYZE]: ['分析', '研究', '调研', '评估'],
      [CONFIG.TASK_TYPES.COMMUNICATE]: ['发送', '通知', '提醒', '告诉'],
      [CONFIG.TASK_TYPES.AUTOMATE]: ['自动', '定时', '批量'],
      [CONFIG.TASK_TYPES.MONITOR]: ['监控', '监测', '跟踪'],
      [CONFIG.TASK_TYPES.REPORT]: ['报告', '总结', '汇总']
    };
    
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      for (const keyword of keywords) {
        if (lowerGoal.includes(keyword)) {
          return type;
        }
      }
    }
    
    return CONFIG.TASK_TYPES.CREATE; // 默认创建类
  }
  
  // 总结目标
  summarizeGoal(goalText) {
    // 截取前 50 个字符
    return goalText.length > 50 
      ? goalText.substring(0, 50) + '...' 
      : goalText;
  }
  
  // 约束识别
  extractConstraints(input, context = {}) {
    const constraints = {
      location: [],      // 位置约束
      time: null,        // 时间约束
      quality: [],      // 质量要求
      format: [],        // 格式要求
      quantity: null,    // 数量要求
      resources: [],    // 资源限制
      dependencies: []  // 依赖项
    };
    
    // 识别位置
    const locationKeywords = ['桌面', '文件夹', '目录', '文件', '图片', '文档'];
    for (const keyword of locationKeywords) {
      if (input.includes(keyword)) {
        constraints.location.push(keyword);
      }
    }
    
    // 识别格式
    const formatKeywords = ['PDF', 'Word', 'Excel', 'PPT', 'Markdown', 'JSON', '图片'];
    for (const keyword of formatKeywords) {
      if (input.toUpperCase().includes(keyword)) {
        constraints.format.push(keyword.toLowerCase());
      }
    }
    
    // 识别数量
    for (const pattern of QUANTITY_PATTERNS) {
      const match = input.match(pattern.pattern);
      if (match) {
        if (pattern.group !== undefined) {
          constraints.quantity = { type: pattern.value, value: parseInt(match[pattern.group]) };
        } else {
          constraints.quantity = { type: pattern.value };
        }
      }
    }
    
    return constraints;
  }
  
  // 时间要求提取
  extractTimeRequirements(input) {
    const requirements = {
      hasDeadline: false,
      deadline: null,
      urgency: 'normal',
      schedule: null
    };
    
    for (const pattern of TIME_PATTERNS) {
      const match = input.match(pattern.pattern);
      if (match) {
        requirements.hasDeadline = true;
        
        switch (pattern.value) {
          case 'today':
            requirements.deadline = this.getTodayEnd();
            break;
          case 'tomorrow':
            requirements.deadline = this.getTomorrowEnd();
            break;
          case 'time_specific':
            requirements.deadline = this.getTodayAt(match[1]);
            break;
          case 'datetime_specific':
            requirements.deadline = this.getTodayAt(match[1], match[2]);
            break;
        }
      }
    }
    
    // 识别紧急程度
    if (input.includes('紧急') || input.includes('马上') || input.includes('立刻')) {
      requirements.urgency = 'urgent';
    } else if (input.includes('不急') || input.includes('慢慢')) {
      requirements.urgency = 'low';
    }
    
    return requirements;
  }
  
  // 优先级评估
  assessPriority(input, constraints) {
    let priority = CONFIG.PRIORITIES.MEDIUM;
    
    if (constraints.time?.urgency === 'urgent') {
      priority = CONFIG.PRIORITIES.HIGH;
    }
    
    if (input.includes('紧急') || input.includes('马上')) {
      priority = CONFIG.PRIORITIES.CRITICAL;
    }
    
    if (input.includes('不急') || input.includes('有时间')) {
      priority = CONFIG.PRIORITIES.LOW;
    }
    
    return priority;
  }
  
  // 可行性评估
  assessFeasibility(goal, constraints) {
    const feasibility = {
      possible: true,
      confidence: 0.9,
      risks: [],
      requirements: []
    };
    
    // 检查是否需要外部 API
    if (this.requiresExternalApi(goal.text)) {
      feasibility.requirements.push('external_api');
    }
    
    // 检查是否需要文件访问
    if (constraints.location.length > 0) {
      feasibility.requirements.push('file_access');
    }
    
    // 检查是否需要用户确认
    if (feasibility.risks.length > 0) {
      feasibility.confidence = 0.7;
    }
    
    return feasibility;
  }
  
  // 检查是否需要外部 API
  requiresExternalApi(goalText) {
    const apiKeywords = ['发送邮件', '发送短信', '打电话', '上传', '下载'];
    return apiKeywords.some(keyword => goalText.includes(keyword));
  }
  
  // 目标分解（核心功能）
  async decompose(goal, options = {}) {
    // 使用 AI 进行智能分解
    if (this.apiKey) {
      return await this.aiDecompose(goal, options);
    }
    
    // 简单规则分解
    return this.ruleBasedDecompose(goal, options);
  }
  
  // AI 辅助分解
  async aiDecompose(goal, options = {}) {
    const prompt = `请将以下目标分解为可执行的任务步骤：

目标: ${goal.text}
任务类型: ${goal.type}
约束条件: ${JSON.stringify(options.constraints || {})}

请以 JSON 格式返回任务列表：
{
  "steps": [
    {
      "id": "step_1",
      "name": "步骤名称",
      "description": "详细描述",
      "type": "create/search/organize...",
      "action": "具体操作",
      "estimatedTime": "预计时间",
      "dependsOn": []
    }
  ],
  "totalEstimate": "总预计时间",
  "parallelizable": []
}`;

    try {
      const response = await this.callAI(prompt);
      return this.parseDecompositionResponse(response);
    } catch (error) {
      console.error('[Goal] AI decomposition failed:', error);
      return this.ruleBasedDecompose(goal, options);
    }
  }
  
  // 基于规则的分解
  ruleBasedDecompose(goal, options = {}) {
    const steps = [];
    let stepId = 1;
    
    // 根据任务类型生成不同步骤
    switch (goal.type) {
      case CONFIG.TASK_TYPES.ORGANIZE:
        steps.push(
          { id: `step_${stepId++}`, name: '扫描目标位置', description: '查找需要整理的文件', action: 'scan', estimatedTime: '1-5分钟' },
          { id: `step_${stepId++}`, name: '分类整理', description: '按类型分组', action: 'classify', estimatedTime: '5-30分钟' },
          { id: `step_${stepId++}`, name: '完成整理', description: '确认整理结果', action: 'complete', estimatedTime: '1分钟' }
        );
        break;
        
      case CONFIG.TASK_TYPES.CREATE:
        steps.push(
          { id: `step_${stepId++}`, name: '准备创建', description: '确定创建内容', action: 'prepare', estimatedTime: '2-5分钟' },
          { id: `step_${stepId++}`, name: '创建内容', description: '生成目标内容', action: 'create', estimatedTime: '5-30分钟' },
          { id: `step_${stepId++}`, name: '保存结果', description: '保存到指定位置', action: 'save', estimatedTime: '1-2分钟' }
        );
        break;
        
      case CONFIG.TASK_TYPES.SEARCH:
        steps.push(
          { id: `step_${stepId++}`, name: '分析搜索需求', description: '理解搜索目标', action: 'analyze', estimatedTime: '1-2分钟' },
          { id: `step_${stepId++}`, name: '执行搜索', description: '搜索相关内容', action: 'search', estimatedTime: '5-15分钟' },
          { id: `step_${stepId++}`, name: '整理结果', description: '筛选和整理搜索结果', action: 'organize', estimatedTime: '5-10分钟' }
        );
        break;
        
      default:
        steps.push(
          { id: `step_${stepId++}`, name: '准备', description: '理解任务需求', action: 'prepare', estimatedTime: '2-5分钟' },
          { id: `step_${stepId++}`, name: '执行', description: '完成主要任务', action: 'execute', estimatedTime: '10-30分钟' },
          { id: `step_${stepId++}`, name: '交付', description: '提供结果', action: 'deliver', estimatedTime: '2-5分钟' }
        );
    }
    
    return {
      goal,
      steps,
      totalEstimate: this.estimateTotalTime(steps),
      parallelizable: [],
      timestamp: Date.now()
    };
  }
  
  // 估算总时间
  estimateTotalTime(steps) {
    const times = steps.map(s => this.parseTime(s.estimatedTime));
    const total = times.reduce((a, b) => a + b, 0);
    
    if (total < 60) return `${total}分钟`;
    return `${Math.floor(total / 60)}小时${total % 60 > 0 ? total % 60 + '分钟' : ''}`;
  }
  
  // 解析时间字符串
  parseTime(timeStr) {
    const match = timeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 5;
  }
  
  // 辅助时间计算
  getTodayEnd() {
    const now = new Date();
    return new Date(now.setHours(23, 59, 59, 999)).getTime();
  }
  
  getTomorrowEnd() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(tomorrow.setHours(23, 59, 59, 999)).getTime();
  }
  
  getTodayAt(hour, minute = 0) {
    const today = new Date();
    return new Date(today.setHours(parseInt(hour), parseInt(minute), 0, 0)).getTime();
  }
  
  // 调用 AI
  async callAI(prompt) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        max_tokens_to_sample: 2000,
        temperature: 0.3
      })
    });
    
    const data = await response.json();
    return data.completion || data.content || '';
  }
  
  // 解析 AI 分解响应
  parseDecompositionResponse(response) {
    try {
      // 尝试提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[Goal] Failed to parse AI response:', error);
    }
    
    return null;
  }
}

// 导出
module.exports = GoalUnderstanding;
module.exports.CONFIG = CONFIG;
