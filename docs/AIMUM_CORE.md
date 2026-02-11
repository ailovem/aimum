# AImum 核心架构 - 目标驱动的任务自动化系统

## 战略定位

**愿景**：让一个人可以通过 AImum 真正做到全面自动化
- 调用各类插件 + API
- 自动管理电脑和手机桌面
- 托管式任务执行
- 交付结果和成果

**整合**：
- OpenClaw（多通道通信）
- Claude Cowork（AI 协作）
- AImum（原有功能）

---

## 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                      AImum 核心                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🎯 目标理解层                                               │
│     ├─ 自然语言理解                                          │
│     ├─ 意图识别                                             │
│     └─ 目标分解                                             │
│                                                             │
│  📋 任务管理层                                               │
│     ├─ 任务规划                                            │
│     ├─ 进度追踪                                             │
│     └─ 结果交付                                            │
│                                                             │
│  ⚡ 执行引擎层                                               │
│     ├─ 插件调度                                            │
│     ├─ API 调用                                            │
│     └─ 桌面自动化                                          │
│                                                             │
│  💬 交互层                                                  │
│     ├─ 文本对话                                            │
│     ├─ 语音交互                                            │
│     └─ 多通道通信                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心功能模块

### 1. 目标理解 (Goal Understanding)

```javascript
// 目标理解核心
const GoalUnderstanding = {
  // 自然语言理解
  understand(text) {
    // 1. 解析用户意图
    const intent = this.extractIntent(text);
    
    // 2. 提取目标
    const goal = this.extractGoal(text, intent);
    
    // 3. 识别约束
    const constraints = this.extractConstraints(text);
    
    // 4. 评估可行性
    const feasibility = this.assessFeasibility(goal, constraints);
    
    return { intent, goal, constraints, feasibility };
  },
  
  // 目标分解
  decompose(goal) {
    // 将大目标分解为可执行任务
    return this.createTaskPlan(goal);
  }
};
```

### 2. 任务管理 (Task Management)

```javascript
// 任务管理
const TaskManager = {
  // 创建任务
  createTask(goal, plan) {
    return {
      id: generateId(),
      goal,
      plan,
      status: 'pending',
      progress: 0,
      subtasks: [],
      results: [],
      createdAt: Date.now(),
      deadline: null
    };
  },
  
  // 执行任务
  async executeTask(task) {
    // 1. 按计划执行子任务
    for (const subtask of task.plan) {
      const result = await this.executeSubtask(subtask);
      task.results.push(result);
      task.progress = this.calculateProgress(task);
    }
    
    // 2. 汇总结果
    return this.deliverResults(task);
  },
  
  // 交付结果
  deliverResults(task) {
    return {
      summary: this.summarize(task.results),
      files: this.collectFiles(task.results),
      metrics: this.calculateMetrics(task.results)
    };
  }
};
```

### 3. 执行引擎 (Execution Engine)

```javascript
// 执行引擎
const ExecutionEngine = {
  // 插件调度
  async dispatchPlugin(pluginName, params) {
    const plugin = PluginManager.get(pluginName);
    return plugin.execute(params);
  },
  
  // API 调用
  async callApi(apiEndpoint, params) {
    return fetch(apiEndpoint, params);
  },
  
  // 桌面自动化
  async automateDesktop(action) {
    // 控制鼠标、键盘、文件等
    return DesktopAutomation.execute(action);
  },
  
  // 手机自动化（通过 API）
  async automateMobile(action) {
    // 通过接口控制手机
    return MobileAutomation.execute(action);
  }
};
```

### 4. 交互层 (Interaction Layer)

```javascript
// 交互层
const InteractionLayer = {
  // 文本对话
  async chat(message, context) {
    // 理解目标
    const understanding = GoalUnderstanding.understand(message);
    
    // 如果是可执行任务
    if (understanding.intent === 'task') {
      // 创建并执行任务
      const task = TaskManager.createTask(understanding.goal, understanding.plan);
      return TaskManager.executeTask(task);
    }
    
    // 普通对话
    return this.generateResponse(message, context);
  },
  
  // 语音交互
  async voice(input) {
    // 语音识别
    const text = await SpeechRecognition.recognize(input);
    
    // 处理文本
    return this.chat(text);
  },
  
  // 多通道
  async send(channel, message) {
    const channels = {
      webchat: WebChat.send,
      whatsapp: WhatsApp.send,
      telegram: Telegram.send,
      feishu: Feishu.send
    };
    
    return channels[channel]?.(message);
  }
};
```

---

## 集成 OpenClaw + Claude Cowork

### OpenClaw 集成

```javascript
// OpenClaw 多通道通信
const OpenClawIntegration = {
  // 消息接收
  async onMessage(channel, message) {
    return InteractionLayer.chat(message.content, {
      channel: channel.source,
      user: channel.user
    });
  },
  
  // 消息发送
  async sendMessage(channel, message) {
    return OpenClaw.send(channel, message);
  },
  
  // 通道列表
  getChannels() {
    return ['webchat', 'whatsapp', 'telegram', 'feishu'];
  }
};
```

### Claude Cowork 集成

```javascript
// Claude Cowork AI 协作
const ClaudeCoworkIntegration = {
  // 核心 AI
  async askClaude(prompt, context) {
    return fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        prompt: this.formatPrompt(prompt, context),
        max_tokens: 4096
      })
    });
  },
  
  // 任务规划
  async planTask(goal, constraints) {
    return this.askClaude(`规划任务: ${goal}`, { constraints });
  },
  
  // 结果总结
  async summarizeResults(results) {
    return this.askClaude('总结以下结果', { results });
  }
};
```

---

## 核心任务列表

### Phase 1: 基础架构 (已完成 ✅)

| 任务 | 状态 | 说明 |
|------|------|------|
| 项目初始化 | ✅ | Node.js + Vercel |
| 用户系统 | ✅ | JWT 认证 |
| AI 对话 | ✅ | 多模型切换 |
| 令牌系统 | ✅ | 充值消耗 |
| 插件市场 | ✅ | 5 个插件 |
| PWA | ✅ | 离线支持 |

### Phase 2: 核心功能 (进行中)

| 任务 | 状态 | 说明 |
|------|------|------|
| **目标理解** | 🔄 开发中 | 自然语言理解 |
| **任务管理** | ⏳ 待开始 | 任务规划执行 |
| **执行引擎** | ⏳ 待开始 | 插件+API调度 |
| **交互层** | ⏳ 待开始 | 文本+语音 |
| OpenClaw 集成 | ⏳ 待开始 | 多通道通信 |
| Claude Cowork | ⏳ 待开始 | AI 协作 |

### Phase 3: 桌面自动化 (待开始)

| 任务 | 状态 | 说明 |
|------|------|------|
| 桌面控制 | ⏳ | 鼠标/键盘/文件 |
| 手机控制 | ⏳ | 通过 API 控制 |
| 任务调度 | ⏳ | 定时任务 |
| 结果交付 | ⏳ | 文件/报告 |

---

## 快速开始

### 1. 对话示例

```
用户: "帮我整理桌面上的文件，按类型分类"

AImum: 
1. 理解目标：整理桌面文件
2. 分解任务：
   - 扫描桌面文件
   - 识别文件类型
   - 创建分类文件夹
   - 移动文件
3. 执行任务...
4. 交付结果：
   ✅ 整理完成！
   📁 创建文件夹: 文档、图片、音频、其他
   📄 移动了 25 个文件
```

### 2. 任务管理

```
用户: "明天上午10点提醒我开会"

AImum:
1. 创建定时任务
2. 设置提醒
3. 到点执行：
   - 发送提醒
   - 准备会议链接
```

### 3. 插件调用

```
用户: "用 DALL-E 生成一张产品图"

AImum:
1. 调用 DALL-E 插件
2. 生成图片
3. 保存到本地
4. 交付图片
```

---

## 文件结构

```
aimum/
├── api/
│   ├── chat.js          # AI 对话核心
│   ├── goal.js          # 目标理解
│   ├── task.js          # 任务管理
│   ├── execute.js       # 执行引擎
│   ├── voice.js         # 语音处理
│   ├── openclaw.js      # OpenClaw 集成
│   └── claude.js        # Claude Cowork
├── public/
│   ├── index.html       # 主界面
│   ├── chat.html        # AI 对话
│   ├── tasks.html       # 任务管理
│   └── voice.html       # 语音交互
└── scripts/
    ├── goal.js          # 目标理解脚本
    ├── task.js          # 任务执行脚本
    └── desktop.js       # 桌面自动化
```

---

## 下一步

1. 开发 `goal.js` - 目标理解核心
2. 开发 `task.js` - 任务管理
3. 开发 `execute.js` - 执行引擎
4. 集成 OpenClaw
5. 集成 Claude Cowork
