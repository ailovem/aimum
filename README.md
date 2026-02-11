# AImum - AI Operating System for One-Person Companies

![AImum](https://via.placeholder.com/1200x600/667eea/ffffff?text=AImum+-+AI+Operating+System)

## 🎯 What is AImum?

AImum = OpenClaw + Claude Cowork

A minimalist AI operating system for one-person companies. Build your AI team with plug-and-play modules.

## 🏗️ Architecture

```
aimum/
├── public/             # Static files
├── api/                 # Serverless functions
├── plugins/            # Plugin marketplace
├── pages/              # Pages
├── docs/              # Documentation
└── vercel.json        # Vercel config
```

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/ailovem/aimum.git
cd aimum

# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Vercel
vercel
```

## 📱 Features

- 🤖 Multi-model AI (Claude, DeepSeek, MiniMax)
- 🎨 Plugin marketplace (build your own AI team)
- 💰 Token system (令狐充)
- 📱 PWA - works on mobile & desktop
- 🔌 Multi-channel (Web, WeChat, Feishu, WhatsApp)

## 🎯 For One-Person Companies

Build your AI team:
- 🤵 AI Sales Department
- 📢 AI Marketing Department  
- 💰 AI Finance Department
- 📋 AI Admin Department
- 💻 AI Tech Department

## 📦 Plugin Format

```json
{
  "id": "sales-assistant",
  "name": "Sales Assistant",
  "version": "1.0.0",
  "description": "Help you write sales scripts and manage customers",
  "author": "Developer Name",
  "permissions": ["conversation"],
  "actions": [
    {
      "name": "generate_script",
      "description": "Generate sales script based on customer profile"
    }
  ],
  "installUrl": "https://your-plugin-url/plugin.json"
}
```

## 💰 Token System (令狐充)

| Token Type | Price | Benefits |
|------------|-------|----------|
| 体验令牌 | ¥9.9/20个 | Try all features |
| 日卡 | ¥5/50个 | Unlimited for 1 day |
| 周卡 | ¥29/500个 | Unlimited for 1 week |
| 月卡 | ¥99/3000个 | Unlimited basic |

## 🛠️ Tech Stack

- **Frontend**: HTML + Vanilla JS (lightweight)
- **Backend**: Vercel Serverless
- **Database**: JSON files (simple)
- **AI**: OpenClaw Gateway
- **Deployment**: Vercel + 阿里云域名

## 📝 License

MIT License - Open Source

## 🤝 Contributing

Welcome! Please read our [Contributing Guide](docs/CONTRIBUTING.md) first.

## 📧 Contact

- Website: https://ailovem.com
- GitHub: https://github.com/ailovem/aimum

---

**AImum** - 让一个人活成一个团队 🦁
