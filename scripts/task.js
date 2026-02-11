/**
 * AImum 任务管理系统
 * 
 * 功能：
 * 1. 任务创建与管理
 * 2. 任务执行调度
 * 3. 进度追踪
 * 4. 结果交付
 */

const crypto = require('crypto');

// 配置
const CONFIG = {
  // 任务状态
  TASK_STATUS: {
    PENDING: 'pending',         // 待执行
    PLANNING: 'planning',       // 规划中
    SCHEDULED: 'scheduled',     // 已安排
    RUNNING: 'running',         // 执行中
    WAITING: 'waiting',         // 等待中
    COMPLETED: 'completed',     // 已完成
    FAILED: 'failed',           // 失败
    CANCELLED: 'cancelled',     // 已取消
    PAUSED: 'paused'           // 已暂停
  },
  
  // 任务优先级
  PRIORITY: {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4
  },
  
  // 执行模式
  EXECUTION_MODE: {
    SEQUENTIAL: 'sequential',   // 顺序执行
    PARALLEL: 'parallel',       // 并行执行
    SMART: 'smart'             // 智能选择
  }
};

// 存储
const TASK_STORE = new Map();
const SUBTASK_STORE = new Map();
const RESULT_STORE = new Map();

// 核心类
class TaskManager {
  constructor(options = {}) {
    this.storage = options.storage || TASK_STORE;
    this.subtaskStorage = options.subtaskStorage || SUBTASK_STORE;
    this.resultStorage = options.resultStorage || RESULT_STORE;
  }
  
  // 创建任务
  createTask(goalData, decomposition = null, options = {}) {
    const taskId = this.generateId('task');
    
    const task = {
      id: taskId,
      
      // 目标信息
      goal: {
        text: goalData.text,
        type: goalData.type,
        summary: goalData.summary
      },
      
      // 任务计划
      plan: decomposition?.steps || [],
      
      // 状态
      status: CONFIG.TASK_STATUS.PENDING,
      
      // 优先级
      priority: options.priority || CONFIG.PRIORITY.MEDIUM,
      
      // 进度
      progress: 0,
      completedSteps: 0,
      totalSteps: decomposition?.steps?.length || 0,
      
      // 时间
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      deadline: options.deadline || null,
      estimatedDuration: decomposition?.totalEstimate || '未知',
      
      // 约束
      constraints: goalData.constraints || {},
      timeRequirements: goalData.timeRequirements || {},
      
      // 依赖
      dependencies: options.dependencies || [],
      parentTaskId: options.parentTaskId || null,
      
      // 执行上下文
      context: {
        userId: options.userId || 'default',
        channel: options.channel || 'web',
        sessionId: options.sessionId || null
      },
      
      // 结果
      results: [],
      output: null,
      error: null,
      
      // 元数据
      tags: options.tags || [],
      metadata: options.metadata || {},
      
      updatedAt: Date.now()
    };
    
    this.storage.set(taskId, task);
    
    return {
      success: true,
      taskId,
      task
    };
  }
  
  // 开始任务
  async startTask(taskId, options = {}) {
    const task = this.storage.get(taskId);
    
    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    
    if (task.status !== CONFIG.TASK_STATUS.PENDING && 
        task.status !== CONFIG.TASK_STATUS.SCHEDULED) {
      return { success: false, error: '任务状态不允许开始' };
    }
    
    task.status = CONFIG.TASK_STATUS.RUNNING;
    task.startedAt = Date.now();
    task.updatedAt = Date.now();
    
    // 如果有子任务，标记第一个为执行中
    if (task.plan.length > 0) {
      task.plan[0].status = CONFIG.TASK_STATUS.RUNNING;
      task.plan[0].startedAt = Date.now();
    }
    
    return {
      success: true,
      task
    };
  }
  
  // 执行任务
  async executeTask(taskId, executor) {
    const task = this.storage.get(taskId);
    
    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    
    // 开始任务
    const startResult = await this.startTask(taskId);
    if (!startResult.success) {
      return startResult;
    }
    
    try {
      // 按计划执行
      for (let i = 0; i < task.plan.length; i++) {
        const step = task.plan[i];
        
        // 检查依赖
        if (step.dependsOn && step.dependsOn.length > 0) {
          const depsCompleted = step.dependsOn.every(depId => {
            const depStep = task.plan.find(s => s.id === depId);
            return depStep?.status === CONFIG.TASK_STATUS.COMPLETED;
          });
          
          if (!depsCompleted) {
            step.status = CONFIG.TASK_STATUS.WAITING;
            continue;
          }
        }
        
        // 执行步骤
        step.status = CONFIG.TASK_STATUS.RUNNING;
        step.startedAt = Date.now();
        
        const result = await this.executeStep(taskId, step.id, executor);
        
        if (result.success) {
          step.status = CONFIG.TASK_STATUS.COMPLETED;
          step.completedAt = Date.now();
          step.result = result.output;
          
          task.completedSteps++;
          task.progress = Math.round((task.completedSteps / task.totalSteps) * 100);
          
          // 保存步骤结果
          this.saveStepResult(taskId, step.id, result);
        } else {
          step.status = CONFIG.TASK_STATUS.FAILED;
          step.error = result.error;
          
          // 如果步骤失败，问用户是否继续
          task.status = CONFIG.TASK_STATUS.PAUSED;
          return {
            success: false,
            task,
            error: result.error,
            step,
            userDecision: 'required'
          };
        }
        
        task.updatedAt = Date.now();
      }
      
      // 任务完成
      task.status = CONFIG.TASK_STATUS.COMPLETED;
      task.completedAt = Date.now();
      task.progress = 100;
      
      // 汇总结果
      task.output = this.summarizeResults(task);
      
      return {
        success: true,
        task,
        output: task.output
      };
      
    } catch (error) {
      task.status = CONFIG.TASK_STATUS.FAILED;
      task.error = error.message;
      task.completedAt = Date.now();
      
      return {
        success: false,
        task,
        error: error.message
      };
    }
  }
  
  // 执行单个步骤
  async executeStep(taskId, stepId, executor) {
    const task = this.storage.get(taskId);
    const step = task?.plan.find(s => s.id === stepId);
    
    if (!step) {
      return { success: false, error: '步骤不存在' };
    }
    
    try {
      // 使用执行器执行
      if (executor && typeof executor === 'function') {
        const result = await executor(task, step);
        return result;
      }
      
      // 默认返回成功
      return {
        success: true,
        output: {
          message: `步骤 "${step.name}" 已完成`,
          stepId: step.id,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 汇总结果
  summarizeResults(task) {
    const results = task.plan
      .filter(step => step.status === CONFIG.TASK_STATUS.COMPLETED)
      .map(step => step.result || {});
    
    return {
      taskId: task.id,
      goal: task.goal.text,
      summary: this.generateSummary(results),
      files: this.collectFiles(results),
      metrics: this.calculateMetrics(task),
      completedSteps: task.completedSteps,
      totalSteps: task.totalSteps,
      duration: task.startedAt ? 
        Math.round((task.completedAt - task.startedAt) / 1000) : null,
      timestamp: Date.now()
    };
  }
  
  // 生成总结
  generateSummary(results) {
    const completedCount = results.filter(r => r && r.success).length;
    
    return {
      total: results.length,
      completed: completedCount,
      text: `任务完成！共 ${results.length} 个步骤，成功完成 ${completedCount} 个。`
    };
  }
  
  // 收集文件
  collectFiles(results) {
    const files = [];
    
    for (const result of results) {
      if (result?.files) {
        files.push(...result.files);
      }
    }
    
    return files;
  }
  
  // 计算指标
  calculateMetrics(task) {
    return {
      progressPercent: task.progress,
      completedSteps: task.completedSteps,
      totalSteps: task.totalSteps,
      successRate: task.totalSteps > 0 ? 
        Math.round((task.completedSteps / task.totalSteps) * 100) : 0,
      duration: task.startedAt && task.completedAt ?
        Math.round((task.completedAt - task.startedAt) / 1000) : 0
    };
  }
  
  // 保存步骤结果
  saveStepResult(taskId, stepId, result) {
    const key = `${taskId}_${stepId}`;
    const stepResult = {
      taskId,
      stepId,
      result,
      savedAt: Date.now()
    };
    
    this.resultStorage.set(key, stepResult);
  }
  
  // 获取任务
  getTask(taskId) {
    return this.storage.get(taskId);
  }
  
  // 列出任务
  listTasks(filters = {}) {
    let tasks = Array.from(this.storage.values());
    
    // 状态筛选
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        tasks = tasks.filter(t => filters.status.includes(t.status));
      } else {
        tasks = tasks.filter(t => t.status === filters.status);
      }
    }
    
    // 用户筛选
    if (filters.userId) {
      tasks = tasks.filter(t => t.context.userId === filters.userId);
    }
    
    // 优先级筛选
    if (filters.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }
    
    // 时间筛选
    if (filters.from) {
      tasks = tasks.filter(t => t.createdAt >= filters.from);
    }
    if (filters.to) {
      tasks = tasks.filter(t => t.createdAt <= filters.to);
    }
    
    // 排序
    tasks.sort((a, b) => {
      // 按优先级
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // 按创建时间
      return b.createdAt - a.createdAt;
    });
    
    // 限制数量
    if (filters.limit) {
      tasks = tasks.slice(0, filters.limit);
    }
    
    return tasks;
  }
  
  // 更新任务
  updateTask(taskId, updates) {
    const task = this.storage.get(taskId);
    
    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    
    Object.assign(task, updates, { updatedAt: Date.now() });
    
    return {
      success: true,
      task
    };
  }
  
  // 取消任务
  cancelTask(taskId, reason = '') {
    const task = this.storage.get(taskId);
    
    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    
    if (task.status === CONFIG.TASK_STATUS.COMPLETED) {
      return { success: false, error: '已完成的任务无法取消' };
    }
    
    task.status = CONFIG.TASK_STATUS.CANCELLED;
    task.cancelledAt = Date.now();
    task.cancelReason = reason;
    task.updatedAt = Date.now();
    
    // 取消所有子任务
    task.plan.forEach(step => {
      if (step.status !== CONFIG.TASK_STATUS.COMPLETED) {
        step.status = CONFIG.TASK_STATUS.CANCELLED;
      }
    });
    
    return {
      success: true,
      task
    };
  }
  
  // 重试任务
  retryTask(taskId) {
    const task = this.storage.get(taskId);
    
    if (!task) {
      return { success: false, error: '任务不存在' };
    }
    
    if (task.status !== CONFIG.TASK_STATUS.FAILED &&
        task.status !== CONFIG.TASK_STATUS.CANCELLED) {
      return { success: false, error: '只能重试失败或取消的任务' };
    }
    
    // 重置任务状态
    task.status = CONFIG.TASK_STATUS.PENDING;
    task.startedAt = null;
    task.completedAt = null;
    task.error = null;
    
    // 重置所有步骤
    task.plan.forEach(step => {
      step.status = CONFIG.TASK_STATUS.PENDING;
      step.startedAt = null;
      step.completedAt = null;
      step.result = null;
      step.error = null;
    });
    
    task.completedSteps = 0;
    task.progress = 0;
    task.updatedAt = Date.now();
    
    return {
      success: true,
      task
    };
  }
  
  // 删除任务
  deleteTask(taskId) {
    if (!this.storage.has(taskId)) {
      return { success: false, error: '任务不存在' };
    }
    
    this.storage.delete(taskId);
    
    // 删除相关结果
    for (const [key] of this.resultStorage) {
      if (key.startsWith(`${taskId}_`)) {
        this.resultStorage.delete(key);
      }
    }
    
    return { success: true };
  }
  
  // 获取统计
  getStatistics(userId = null) {
    let tasks = Array.from(this.storage.values());
    
    if (userId) {
      tasks = tasks.filter(t => t.context.userId === userId);
    }
    
    const stats = {
      total: tasks.length,
      byStatus: {},
      byPriority: {},
      completedToday: 0,
      averageDuration: 0,
      successRate: 0
    };
    
    // 按状态统计
    for (const status of Object.values(CONFIG.TASK_STATUS)) {
      stats.byStatus[status] = tasks.filter(t => t.status === status).length;
    }
    
    // 按优先级统计
    for (const priority of Object.values(CONFIG.PRIORITY)) {
      stats.byPriority[priority] = tasks.filter(t => t.priority === priority).length;
    }
    
    // 今日完成
    const today = new Date().setHours(0, 0, 0, 0);
    stats.completedToday = tasks.filter(t => 
      t.status === CONFIG.TASK_STATUS.COMPLETED && 
      t.completedAt >= today
    ).length;
    
    // 平均时长
    const completedWithDuration = tasks.filter(t => 
      t.status === CONFIG.TASK_STATUS.COMPLETED && 
      t.startedAt && 
      t.completedAt
    );
    
    if (completedWithDuration.length > 0) {
      const totalDuration = completedWithDuration.reduce((sum, t) => 
        sum + (t.completedAt - t.startedAt), 0
      );
      stats.averageDuration = Math.round(totalDuration / completedWithDuration.length / 1000);
    }
    
    // 成功率
    const completed = tasks.filter(t => t.status === CONFIG.TASK_STATUS.COMPLETED).length;
    const failed = tasks.filter(t => t.status === CONFIG.TASK_STATUS.FAILED).length;
    stats.successRate = (completed + failed) > 0 ? 
      Math.round((completed / (completed + failed)) * 100) : 0;
    
    return stats;
  }
  
  // 生成 ID
  generateId(prefix = 'task') {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }
}

// 导出
module.exports = TaskManager;
module.exports.CONFIG = CONFIG;
