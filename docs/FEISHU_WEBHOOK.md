# AImum 飞书 Webhook 配置

## 获取飞书 Webhook URL

### 方法 1：在飞书群组中添加机器人

1. **打开飞书**，进入你想要接收通知的群组
2. 点击群组设置（右上角三个点）
3. 选择 **"群机器人"**
4. 点击 **"添加机器人"**
5. 搜索 **"自定义机器人"** 或 **"Webhook"**
6. 点击 **"添加"**
7. 复制 **Webhook URL**
8. 启用安全设置（推荐）

### 方法 2：通过飞书开放平台创建

1. 访问 https://open.feishu.cn/
2. 创建应用或使用现有应用
3. 在应用中添加 **"机器人"** 能力
4. 配置 Webhook 地址
5. 获取 App ID 和 App Secret

---

## 配置方式

### 方式 1：环境变量

```bash
export FEISHU_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 方式 2：Vercel 环境变量

1. 打开 https://vercel.com/dashboard
2. 进入 AImum 项目
3. 点击 **Settings** → **Environment Variables**
4. 添加：
   - Name: `FEISHU_WEBHOOK`
   - Value: 你的 Webhook URL
5. 点击 **Add**

### 方式 3：本地 .env 文件

在项目根目录创建 `.env.local`：

```env
FEISHU_WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 测试 Webhook

运行命令测试：

```bash
node scripts/tracker.js notify "测试消息"
```

成功会看到：
```
[飞书通知] 发送成功
```

---

## 飞书机器人权限

确保机器人有以下权限：

- `im:message:send_as_bot` - 发送消息
- `im:message:send_multi_users` - 群发消息

---

## 故障排除

### 问题：Webhook 无效

**解决方法**：
1. 检查 URL 是否完整
2. 确认机器人还在群组中
3. 尝试重新添加机器人

### 问题：消息发送失败

**解决方法**：
1. 检查网络连接
2. 确认 Webhook URL 格式正确
3. 查看错误日志

### 问题：没有 im:message 权限

**解决方法**：
1. 在飞书开放平台检查应用权限
2. 添加所需权限后重新发布

---

## 通知示例

配置成功后，你会收到类似消息：

```
🎉 AImum 进度更新!

✅ 任务完成: 推送代码到GitHub

📊 当前进度: 20%
```

---

## Webhook 安全

### 启用签名校验（推荐）

在飞书机器人设置中启用签名校验，然后更新配置：

```env
FEISHU_WEBHOOK=https://...
FEISHU_SIGNATURE_KEY=your-signature-key
```

---

## 获取帮助

- 飞书文档: https://open.feishu.cn/document/server-docs/im/bot-overview
- Webhook 文档: https://open.feishu.cn/document/server-docs/im/bot/implementation
