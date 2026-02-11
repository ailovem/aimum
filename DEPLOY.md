# AImum 部署指南

## 📦 本地开发

```bash
# 克隆项目
git clone https://github.com/ailovem/aimum.git
cd aimum

# 安装依赖
npm install

# 本地运行
npx vercel dev
```

访问 http://localhost:3000

---

## 🚀 部署到 Vercel（免费）

### 方式一：网页部署（推荐）

1. 打开：https://vercel.com
2. 用 GitHub 登录
3. 点击 **"Add New Project"**
4. 选择 `ailovem/aimum` 仓库
5. 点击 **"Deploy"**

### 方式二：命令行

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel

# 部署
vercel --prod
```

---

## 🔗 域名解析（阿里云）

部署完成后，Vercel 会给你一个域名，比如：
```
aimum.vercel.app
```

然后去阿里云控制台：

1. 登录 **阿里云域名控制台**
2. 进入 `ailovem.com` 域名
3. 添加 **CNAME 记录**：
   - 主机记录：`@`
   - 记录值：`cname.vercel-dns.com`
   - TTL：默认

4. 等待生效（通常几分钟）

---

## 🔐 配置环境变量

在 Vercel 后台添加：

```
DEEPSEEK_API_KEY = 你的DeepSeek API Key
```

获取 API Key：https://platform.deepseek.com

---

## 📱 PWA

项目已内置 PWA 支持，手机访问后添加到主屏幕即可。

---

## 🔄 自动部署

每次 push 到 main 分支，GitHub Actions 会自动部署到 Vercel。

---

## ❓ 常见问题

### 1. 部署后页面空白
- 检查浏览器控制台错误
- 确保所有文件都上传了

### 2. API 报错
- 添加了环境变量 DEEPSEEK_API_KEY 吗？
- API Key 是否有效？

### 3. 域名不生效
- CNAME 配置是否正确？
- 等待 DNS 生效（最长 24 小时）

---

## 📞 支持

有问题请提 Issue：https://github.com/ailovem/aimum/issues
