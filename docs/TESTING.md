# AImum 页面测试指南

## 本地测试方法

由于没有运行本地服务器，你需要使用文件协议打开 HTML 页面。

### 方法 1：直接双击打开

双击以下文件进行测试：

| 页面 | 文件路径 | 功能 |
|------|----------|------|
| 🏠 首页 | `D:\openwork\00_active\aimum\public\index.html` | Dashboard 主界面 |
| 🔐 登录 | `D:\openwork\00_active\aimum\public\auth.html` | 手机号登录/注册 |
| 💬 AI 对话 | `D:\openwork\00_active\aimum\public\chat.html` | AI 对话界面 |
| 💎 Token | `D:\openwork\00_active\aimum\public\tokens.html` | Token 管理 |
| 🧩 插件 | `D:\openwork\00_active\aimum\public\plugins.html` | 插件市场 |
| 📊 进度 | `D:\openwork\00_active\aimum\public\progress.html` | 开发进度追踪 |

### 方法 2：使用 VS Code Live Server

如果你安装了 VS Code：

1. 打开文件夹 `D:\openwork\00_active\aimum`
2. 右键点击 `public/index.html`
3. 选择 **"Open with Live Server"**

### 方法 3：Python 简易服务器

```bash
cd D:\openwork\00_active\aimum\public
python -m http.server 8080
```

然后浏览器打开 http://localhost:8080

---

## 快速测试清单

### 1️⃣ 首页 (index.html)
- [ ] 侧边栏导航正常显示
- [ ] Token 余额显示
- [ ] 快速开始按钮可点击
- [ ] 精选插件展示

### 2️⃣ 登录页 (auth.html)
- [ ] 登录/注册标签切换
- [ ] 手机号输入
- [ ] 验证码发送（开发环境会显示验证码）
- [ ] 登录成功跳转到首页

### 3️⃣ AI 对话页 (chat.html)
- [ ] 侧边栏显示对话列表
- [ ] 模型选择器
- [ ] 角色选择
- [ ] 消息发送和接收（需要 API Key）

### 4️⃣ Token 管理页 (tokens.html)
- [ ] 余额显示
- [ ] 套餐卡片展示
- [ ] 充值按钮
- [ ] 消费记录

### 5️⃣ 插件市场 (plugins.html)
- [ ] 分类筛选
- [ ] 插件搜索
- [ ] 安装/卸载插件
- [ ] 已安装插件列表

### 6️⃣ 进度追踪 (progress.html)
- [ ] 整体进度条
- [ ] 阶段进度
- [ ] 任务打勾
- [ ] 时间线更新

---

## 当前功能状态

### ✅ 完全可测试
- 首页 UI
- 登录/注册 UI
- Token 管理 UI
- 插件市场 UI
- 进度追踪 UI

### ⚠️ 需要 API Key 才能完整测试
- AI 对话功能
  - Claude API Key
  - OpenAI API Key
  - DeepSeek API Key

### ✅ 不需要外部服务
- 所有 UI 界面
- 本地存储
- 离线功能（PWA）

---

## API Key 配置

如果需要测试 AI 对话功能，需要配置环境变量：

```bash
# 设置 API Keys
set ANTHROPIC_API_KEY=your-claude-key
set OPENAI_API_KEY=your-gpt-key
set DEEPSEEK_API_KEY=your-deepseek-key

# 启动服务
vercel dev
```

---

## GitHub 暂时无法访问

由于网络问题，GitHub 暂时无法连接。代码已经本地保存，稍后可以同步。

最新本地提交：Phase 1 MVP 完成

---

## 下一步

1. 测试各个页面 UI
2. 等待网络恢复后同步到 GitHub
3. 配置 API Keys
4. 部署到 Vercel
