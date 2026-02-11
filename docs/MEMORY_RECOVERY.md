# AImum 自动记忆恢复系统

## 问题

AI 在每次新会话时会丢失上下文，导致：
- 忘记项目状态
- 不知道进行到哪一步
- 重复询问基本信息
- 开发中断不连贯

## 解决方案

### 1. 多层记忆备份

```
📁 记忆文件位置（按优先级）

1️⃣ D:/openwork/00_active/aimum/PRD.md
   → 最完整的项目文档
   
2️⃣ D:/openwork/AIopenclaw/AImum-MEMORY.md
   → 桌面快速访问的记忆恢复文件
   
3️⃣ C:/Users/dongd/.openclaw/workspace/MEMORY.md
   → OpenClaw 内置记忆系统
```

### 2. 自动会话启动器

**命令**: `npm run session`

```bash
# 查看会话恢复信息
npm run session

# 查看进度
npm run status
```

### 3. 续接机制

每次会话开始时：

```
1. 读取 PRD.md 获取项目状态
2. 读取 MEMORY.md 获取最近上下文
3. 显示当前进度和下一步行动
4. 提示用户确认
5. 继续开发
```

### 4. 使用方式

#### 方式 1: 手动触发

```bash
cd D:\openwork\00_active\aimum
npm run session
```

#### 方式 2: 集成到 OpenClaw

创建快捷命令：

```bash
# 在 OpenClaw 中添加 alias
alias aimum-session = "cd D:/openwork/00_active/aimum && npm run session"
```

#### 方式 3: 桌面快捷方式

双击 `D:\openwork\AIopenclaw\aimum.html`

### 5. 会话恢复流程

```
新会话开始
    ↓
读取记忆文件 (PRD.md → MEMORY.md)
    ↓
显示恢复信息
• 当前进度: 16%
• 上次行动: 创建开发文档
• 下一步: 推送代码到 GitHub
    ↓
用户确认 (Enter)
    ↓
继续开发
```

### 6. 确保不遗忘的规则

**❌ 之前的问题:**
- 聊天记录清除 → 上下文丢失
- 新会话开始 → 忘记项目状态
- 开发中断 → 不知道进行到哪

**✅ 解决方案:**
- 1. 每次会话开始自动读取记忆文件
- 2. 记忆文件本地 + 云端双重备份
- 3. 桌面快捷方式一键恢复
- 4. 进度追踪系统自动更新

### 7. 快速检查清单

开始新会话前，检查以下问题：

- [ ] 打开 `D:\openwork\AIopenclaw\AImum-MEMORY.md`
- [ ] 查看当前进度 (Phase 1 - 16%)
- [ ] 确认下一步行动
- [ ] 运行 `npm run session` 恢复上下文

### 8. 故障恢复

如果忘记了项目状态：

1. **检查桌面** → 双击 `AImum-MEMORY.md`
2. **检查项目** → 打开 `D:\openwork\00_active\aimum\PRD.md`
3. **检查进度** → 运行 `npm run tracker`
4. **检查 GitHub** → 查看最近提交记录

---

## 📞 重要链接

| 资源 | 路径 |
|------|------|
| 记忆恢复文件 | `D:\openwork\AIopenclaw\AImum-MEMORY.md` |
| PRD 文档 | `D:\openwork\00_active\aimum\PRD.md` |
| 项目根目录 | `D:\openwork\00_active\aimum` |
| GitHub | https://github.com/ailovem/aimum |

---

**💡 记住**: 任何时候忘记了，打开 `D:\openwork\AIopenclaw\AImum-MEMORY.md` 就知道了！
