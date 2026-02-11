/**
 * AImum 工作流引擎 API
 * 
 * 功能：
 * 1. 工作流模板管理
 * 2. 步骤编排
 * 3. 条件判断
 * 4. 自动化执行
 * 5. 执行历史
 */

const crypto = require('crypto');

// 配置
const CONFIG = {
  // 最大执行步骤
  MAX_STEPS: 100,
  
  // 执行超时（秒）
  EXECUTION_TIMEOUT: 300,
  
  // 存储（生产环境用数据库）
  workflows: new Map(),      // workflowId -> workflow
  executions: new Map(),     // executionId -> execution
  templates: new Map()       // templateId -> template
};

// 内置工作流模板
const BUILTIN_TEMPLATES = [
  {
    id: 'content-publishing',
    name: '内容发布流程',
    description: '自动化的内容创作到发布流程',
    icon: '📝',
    category: 'productivity',
    steps: [
      {
        id: 'step-1',
        name: 'AI 创作',
        type: 'ai-chat',
        config: {
          prompt: '根据主题创作一篇优质文章',
          model: 'claude-sonnet-4-20250514'
        }
      },
      {
        id: 'step-2',
        name: '人工审核',
        type: 'approval',
        config: {
          approvers: ['user'],
          timeout: 86400
        }
      },
      {
        id: 'step-3',
        name: '格式优化',
        type: 'ai-chat',
        config: {
          prompt: '优化文章格式，添加标题、标签',
          model: 'claude-haiku-3-20250514'
        }
      },
      {
        id: 'step-4',
        name: '发布',
        type: 'webhook',
        config: {
          url: '/api/publish',
          method: 'POST'
        }
      }
    ],
    triggers: ['manual', 'schedule'],
    enabled: true
  },
  {
    id: 'lead-followup',
    name: '线索跟进',
    description: '自动化线索评分和跟进提醒',
    icon: '🎯',
    category: 'sales',
    steps: [
      {
        id: 'step-1',
        name: '线索评分',
        type: 'ai-analysis',
        config: {
          model: 'gpt-4o',
          criteria: ['来源', '行为', '互动']
        }
      },
      {
        id: 'step-2',
        name: '评分判断',
        type: 'condition',
        config: {
          conditions: [
            { field: 'score', operator: '>=', value: 80, nextStep: 'step-3' },
            { field: 'score', operator: '>=', value: 50, nextStep: 'step-4' },
            { field: 'score', operator: '<', value: 50, nextStep: 'end' }
          ]
        }
      },
      {
        id: 'step-3',
        name: '高优先级跟进',
        type: 'notification',
        config: {
          channel: 'immediate',
          template: 'high-priority'
        }
      },
      {
        id: 'step-4',
        name: '常规跟进',
        type: 'notification',
        config: {
          channel: 'daily',
          template: 'standard'
        }
      }
    ],
    triggers: ['new-lead'],
    enabled: true
  },
  {
    id: 'daily-report',
    name: '日报汇总',
    description: '自动汇总每日数据并发送报告',
    icon: '📊',
    category: 'productivity',
    steps: [
      {
        id: 'step-1',
        name: '收集数据',
        type: 'data-fetch',
        config: {
          sources: ['chat', 'tokens', 'users']
        }
      },
      {
        id: 'step-2',
        name: '生成报告',
        type: 'ai-chat',
        config: {
          prompt: '根据数据生成今日报告，包含关键指标和趋势分析',
          model: 'deepseek-chat'
        }
      },
      {
        id: 'step-3',
        name: '发送报告',
        type: 'notification',
        config: {
          channels: ['feishu', 'email']
        }
      }
    ],
    triggers: ['schedule'],
    enabled: true
  }
];

// 步骤类型定义
const STEP_TYPES = {
  'ai-chat': {
    name: 'AI 对话',
    icon: '🤖',
    description: '调用 AI 模型处理任务'
  },
  'ai-analysis': {
    name: 'AI 分析',
    icon: '📈',
    description: 'AI 数据分析和洞察'
  },
  'approval': {
    name: '人工审批',
    icon: '✅',
    description: '需要人工确认的步骤'
  },
  'condition': {
    name: '条件分支',
    icon: '🔀',
    description: '根据条件跳转到不同步骤'
  },
  'notification': {
    name: '发送通知',
    icon: '📱',
    description: '发送消息通知'
  },
  'webhook': {
    name: 'Webhook',
    icon: '🔗',
    description: '调用外部 API'
  },
  'data-fetch': {
    name: '获取数据',
    icon: '📥',
    description: '从数据源获取数据'
  },
  'delay': {
    name: '延时',
    icon: '⏰',
    description: '等待指定时间后继续'
  },
  'end': {
    name: '结束',
    icon: '🏁',
    description: '工作流结束'
  }
};

// 创建工作流
function createWorkflow(data) {
  const workflowId = 'wf_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  
  const workflow = {
    workflowId,
    name: data.name,
    description: data.description || '',
    icon: data.icon || '📋',
    category: data.category || 'custom',
    steps: data.steps || [],
    triggers: data.triggers || ['manual'],
    variables: data.variables || [],
    enabled: data.enabled !== false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: data.userId
  };
  
  CONFIG.workflows.set(workflowId, workflow);
  
  return { success: true, data: { workflowId } };
}

// 获取工作流
function getWorkflow(workflowId) {
  const workflow = CONFIG.workflows.get(workflowId);
  
  if (!workflow) {
    return { success: false, error: '工作流不存在' };
  }
  
  return { success: true, data: { workflow } };
}

// 更新工作流
function updateWorkflow(workflowId, updates) {
  const workflow = CONFIG.workflows.get(workflowId);
  
  if (!workflow) {
    return { success: false, error: '工作流不存在' };
  }
  
  Object.assign(workflow, updates, { updatedAt: Date.now() });
  
  return { success: true, data: { workflow } };
}

// 删除工作流
function deleteWorkflow(workflowId) {
  if (!CONFIG.workflows.has(workflowId)) {
    return { success: false, error: '工作流不存在' };
  }
  
  CONFIG.workflows.delete(workflowId);
  
  return { success: true };
}

// 列出工作流
function listWorkflows(filters = {}) {
  let workflows = Array.from(CONFIG.workflows.values());
  
  // 分类筛选
  if (filters.category && filters.category !== 'all') {
    workflows = workflows.filter(w => w.category === filters.category);
  }
  
  // 启用状态筛选
  if (filters.enabled !== undefined) {
    workflows = workflows.filter(w => w.enabled === filters.enabled);
  }
  
  // 搜索
  if (filters.search) {
    const search = filters.search.toLowerCase();
    workflows = workflows.filter(w => 
      w.name.toLowerCase().includes(search) ||
      w.description.toLowerCase().includes(search)
    );
  }
  
  // 排序
  workflows.sort((a, b) => b.updatedAt - a.updatedAt);
  
  return { success: true, data: { workflows } };
}

// 执行工作流
async function executeWorkflow(workflowId, input = {}, userId = 'system') {
  const workflow = CONFIG.workflows.get(workflowId);
  
  if (!workflow) {
    return { success: false, error: '工作流不存在' };
  }
  
  if (!workflow.enabled) {
    return { success: false, error: '工作流未启用' };
  }
  
  const executionId = 'exec_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  
  const execution = {
    executionId,
    workflowId,
    workflowName: workflow.name,
    status: 'running',
    currentStep: workflow.steps[0]?.id || null,
    stepIndex: 0,
    input,
    output: {},
    context: {
      ...input,
      startTime: Date.now(),
      userId,
      variables: {}
    },
    logs: [],
    createdAt: Date.now()
  };
  
  CONFIG.executions.set(executionId, execution);
  
  // 异步执行
  runExecution(executionId);
  
  return {
    success: true,
    data: {
      executionId,
      status: 'running',
      message: '工作流已开始执行'
    }
  };
}

// 执行工作流（异步）
async function runExecution(executionId) {
  const execution = CONFIG.executions.get(executionId);
  const workflow = CONFIG.workflows.get(execution.workflowId);
  
  if (!execution || !workflow) return;
  
  try {
    execution.logs.push({
      timestamp: Date.now(),
      type: 'info',
      message: '工作流开始执行'
    });
    
    // 逐步执行
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      execution.currentStep = step.id;
      execution.stepIndex = i;
      execution.status = 'running';
      execution.logs.push({
        timestamp: Date.now(),
        type: 'step-start',
        message: `开始步骤: ${step.name}`
      });
      
      // 执行步骤
      const stepResult = await executeStep(step, execution);
      
      execution.context.variables = {
        ...execution.context.variables,
        [step.id]: stepResult.output
      };
      
      execution.output[step.id] = stepResult.output;
      
      execution.logs.push({
        timestamp: Date.now(),
        type: 'step-complete',
        message: `步骤完成: ${step.name}`
      });
      
      // 检查条件分支
      if (step.type === 'condition' && stepResult.nextStep) {
        if (stepResult.nextStep === 'end') {
          break;
        }
        // 跳转到指定步骤
        const nextIndex = workflow.steps.findIndex(s => s.id === stepResult.nextStep);
        if (nextIndex >= 0) {
          i = nextIndex - 1; // -1 因为循环会+1
        }
      }
    }
    
    execution.status = 'completed';
    execution.completedAt = Date.now();
    execution.logs.push({
      timestamp: Date.now(),
      type: 'complete',
      message: '工作流执行完成'
    });
    
  } catch (error) {
    execution.status = 'failed';
    execution.error = error.message;
    execution.completedAt = Date.now();
    execution.logs.push({
      timestamp: Date.now(),
      type: 'error',
      message: `执行失败: ${error.message}`
    });
  }
}

// 执行单个步骤
async function executeStep(step, execution) {
  const stepType = STEP_TYPES[step.type];
  
  if (!stepType) {
    return { output: { error: '未知步骤类型' }, nextStep: null };
  }
  
  // 模拟步骤执行
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const output = {
    success: true,
    stepId: step.id,
    stepName: step.name,
    stepType: step.type,
    result: `步骤 "${step.name}" 执行完成`,
    timestamp: Date.now()
  };
  
  // 条件分支判断
  let nextStep = null;
  if (step.type === 'condition' && step.config?.conditions) {
    for (const condition of step.config.conditions) {
      if (evaluateCondition(condition, execution.context)) {
        nextStep = condition.nextStep;
        output.condition = condition;
        break;
      }
    }
  }
  
  return { output, nextStep };
}

// 评估条件
function evaluateCondition(condition, context) {
  const { field, operator, value } = condition;
  const fieldValue = context.variables[field] || context[field];
  
  switch (operator) {
    case '>=': return fieldValue >= value;
    case '<=': return fieldValue <= value;
    case '>': return fieldValue > value;
    case '<': return fieldValue < value;
    case '==': return fieldValue == value;
    case '!=': return fieldValue != value;
    default: return false;
  }
}

// 获取执行历史
function getExecutions(filters = {}) {
  let executions = Array.from(CONFIG.executions.values());
  
  if (filters.workflowId) {
    executions = executions.filter(e => e.workflowId === filters.workflowId);
  }
  
  if (filters.status) {
    executions = executions.filter(e => e.status === filters.status);
  }
  
  executions.sort((a, b) => b.createdAt - a.createdAt);
  
  // 限制数量
  const limit = filters.limit || 20;
  executions = executions.slice(0, limit);
  
  return { success: true, data: { executions } };
}

// 获取执行详情
function getExecution(executionId) {
  const execution = CONFIG.executions.get(executionId);
  
  if (!execution) {
    return { success: false, error: '执行记录不存在' };
  }
  
  return { success: true, data: { execution } };
}

// 获取模板列表
function getTemplates() {
  return { success: true, data: { templates: BUILTIN_TEMPLATES } };
}

// 从模板创建工作流
function createFromTemplate(templateId, overrides = {}) {
  const template = BUILTIN_TEMPLATES.find(t => t.id === templateId);
  
  if (!template) {
    return { success: false, error: '模板不存在' };
  }
  
  return createWorkflow({
    name: overrides.name || template.name,
    description: overrides.description || template.description,
    icon: overrides.icon || template.icon,
    category: overrides.category || template.category,
    steps: template.steps.map(s => ({ ...s })),
    triggers: template.triggers,
    variables: []
  });
}

// 获取步骤类型
function getStepTypes() {
  return { success: true, data: { types: STEP_TYPES } };
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
  
  const pathParts = pathname.split('/').filter(Boolean);
  const endpoint = pathParts[pathParts.length - 1];
  
  try {
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
    
    // 获取用户 ID（简化）
    const authHeader = req.headers.authorization;
    let userId = 'demo_user';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userId = authHeader.substring(7).split('_')[0] || userId;
    }
    
    switch (endpoint) {
      case 'workflows':
        if (method === 'GET') {
          const result = listWorkflows(body);
          return res.status(200).json(result);
        }
        if (method === 'POST') {
          const result = createWorkflow({ ...body, userId });
          return res.status(result.success ? 200 : 400).json(result);
        }
        break;
        
      case 'workflow':
        if (method === 'GET') {
          const { workflowId } = body;
          const result = getWorkflow(workflowId);
          return res.status(result.success ? 200 : 400).json(result);
        }
        if (method === 'PUT') {
          const { workflowId, ...updates } = body;
          const result = updateWorkflow(workflowId, updates);
          return res.status(result.success ? 200 : 400).json(result);
        }
        if (method === 'DELETE') {
          const { workflowId } = body;
          const result = deleteWorkflow(workflowId);
          return res.status(result.success ? 200 : 400).json(result);
        }
        break;
        
      case 'execute':
        if (method === 'POST') {
          const { workflowId, input } = body;
          const result = executeWorkflow(workflowId, input, userId);
          return res.status(result.success ? 200 : 400).json(result);
        }
        break;
        
      case 'executions':
        if (method === 'GET') {
          const result = getExecutions(body);
          return res.status(200).json(result);
        }
        break;
        
      case 'execution':
        if (method === 'GET') {
          const { executionId } = body;
          const result = getExecution(executionId);
          return res.status(result.success ? 200 : 400).json(result);
        }
        break;
        
      case 'templates':
        if (method === 'GET') {
          const result = getTemplates();
          return res.status(200).json(result);
        }
        break;
        
      case 'from-template':
        if (method === 'POST') {
          const { templateId, ...overrides } = body;
          const result = createFromTemplate(templateId, overrides);
          return res.status(result.success ? 200 : 400).json(result);
        }
        break;
        
      case 'step-types':
        if (method === 'GET') {
          const result = getStepTypes();
          return res.status(200).json(result);
        }
        break;
        
      case 'health':
        return res.status(200).json({
          success: true,
          data: {
            status: 'ok',
            workflows: CONFIG.workflows.size,
            executions: CONFIG.executions.size
          }
        });
    }
    
    return res.status(404).json({ success: false, error: '接口不存在' });
  } catch (error) {
    console.error('[Workflow API] Error:', error);
    return res.status(500).json({ success: false, error: '服务器错误' });
  }
};

// 导出
module.exports.createWorkflow = createWorkflow;
module.exports.getWorkflow = getWorkflow;
module.exports.executeWorkflow = executeWorkflow;
module.exports.getExecutions = getExecutions;
module.exports.getTemplates = getTemplates;
