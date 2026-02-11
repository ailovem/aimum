# AImum API Documentation

## Base URL

```
https://aimum.vercel.app/api
```

## Endpoints

### Chat

Send message to AI.

```
POST /chat
Content-Type: application/json

{
  "message": "你好",
  "model": "deepseek",  // optional: deepseek, minimax, claude
  "dept": "sales"       // optional: sales, marketing, finance, admin, tech
}
```

Response:
```json
{
  "reply": "我是 AImum 销售部助手...",
  "model": "deepseek"
}
```

---

### Plugins

Get all available plugins.

```
GET /plugins
```

Response:
```json
{
  "plugins": [
    {
      "id": "wechat",
      "name": "微信助手",
      "icon": "💬",
      "description": "自动回复、消息管理、客户跟进",
      "price": "free",
      "category": "sales"
    }
  ]
}
```

---

### Tokens (令狐充)

#### Get Balance

```
GET /tokens?action=balance&phone=13800138000
```

Response:
```json
{
  "phone": "13800138000",
  "balance": 20
}
```

#### Charge Tokens

```
POST /tokens?action=charge
Content-Type: application/json

{
  "phone": "13800138000",
  "amount": 50,
  "type": "日卡"
}
```

Response:
```json
{
  "success": true,
  "phone": "13800138000",
  "added": 50,
  "newBalance": 70,
  "message": "充值成功！令狐充诚不欺你 ⚡"
}
```

#### Consume Token

```
POST /tokens?action=consume
Content-Type: application/json

{
  "phone": "13800138000",
  "cost": 1
}
```

Response:
```json
{
  "success": true,
  "phone": "13800138000",
  "consumed": 1,
  "remaining": 69
}
```

---

## Pricing (令狐充)

| Package | Price | Tokens |
|---------|-------|--------|
| 体验令牌 | ¥9.9 | 20 |
| 日卡 | ¥5 | 50 |
| 周卡 | ¥29 | 500 |
| 月卡 | ¥99 | 3000 |
| 年卡 | ¥699 | 50000 |

---

## Models

| Model | Icon | Description |
|-------|------|-------------|
| DeepSeek | 🌊 | 通用对话 |
| MiniMax | ⚡ | 快速响应 |
| Claude | 🤖 | 高质量回答 |

---

## Departments

| Dept | Icon | Description |
|------|------|-------------|
| 销售部 | 💼 | 获客、跟进、转化 |
| 市场部 | 📢 | 内容、投放、品牌 |
| 财务部 | 💰 | 记账、报表、风控 |
| 行政部 | 📋 | 日程、提醒、协作 |
| 技术部 | 💻 | 开发、运维、部署 |
