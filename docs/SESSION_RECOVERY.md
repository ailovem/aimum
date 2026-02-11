# AImum - 自动记忆恢复与会话续接系统

## 问题背景

AI 在每次新会话时会丢失上下文，导致开发不连贯、重复劳动。

## 解决方案架构

```
┌─────────────────────────────────────────────────────────┐
│                  会话开始                               │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              1. 自动检测触发                            │
│  • 用户说"开始开发 AImum"                              │
│  • 或手动运行 npm run session                          │
│  • 或双击桌面快捷方式                                  │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              2. 多层记忆读取（按优先级）                │
│                                                         │
│  1️⃣ PRD.md (完整项目文档)                             │
│     D:\openwork\00_active\aimum\PRD.md                  │
│                                                         │
│  2️⃣ AImum-MEMORY.md (快速恢复文件)                    │
│     D:\openwork\AIopenclaw\AImum-MEMORY.md              │
│                                                         │
│  3️⃣ MEMORY.md (OpenClaw 内置)                         │
│     C:\Users\dongd\.openclaw\workspace\MEMORY.md        │
│                                                         │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              3. 恢复上下文                              │
│                                                         │
│  • 当前进度: 16% (Phase 1 - MVP)                       │
│  • 已完成任务: PRD文档、技术架构、进度追踪             │
│  • 下一步行动: 推送代码、配置Webhook、开发功能         │
│                                                         │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              4. 用户确认                                │
│                                                         │
│  用户确认后继续开发                                     │
│  或者选择快捷操作:                                      │
│  • 查看详细进度 (npm run tracker)                      │
│  • 部署项目 (npm run deploy)                           │
│  • 运行测试 (npm run test)                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. 记忆文件 (3层备份)

| 文件 | 路径 | 用途 |
|------|------|------|
| PRD.md | `D:\openwork\00_active\aimum\PRD.md` | 完整项目文档 |
| AImum-MEMORY.md | `D:\openwork\AIopenclaw\AImum-MEMORY.md` | 桌面快速访问 |
| MEMORY.md | `C:\Users\dongd\.openclaw\workspace\MEMORY.md` | OpenClaw 内置 |

### 2. 启动脚本

| 脚本 | 路径 | 功能 |
|------|------|------|
| autostart.js | `D:\openwork\00_active\aimum\scripts\autostart.js` | 自动会话启动 |
| session-starter.js | `D:\openwork\00_active\aimum\scripts\session-starter.js` | 记忆恢复 |
| tracker.js | `D:\openwork\00_active\aimum\scripts\tracker.js` | 进度追踪 |

### 3. 快捷命令

```bash
# 会话启动
npm run session      # 恢复上下文，显示状态

# 进度追踪
npm run tracker      # 查看详细进度
npm run status       # 查看项目状态

# 开发
npm run dev          # 本地开发
npm run deploy       # 部署
```

### 4. 桌面快捷方式

| 文件 | 路径 | 功能 |
|------|------|------|
| AIopenclaw.html | `Desktop/AIopenclaw.html` | 总入口 |
| aimum-session.html | `D:\openwork\AIopenclaw\aimum-session.html` | 会话启动器 |

## 使用方式

### 方式 1: 桌面快捷方式

1. 双击 `Desktop/AIopenclaw.html`
2. 点击相应链接

### 方式 2: 命令行

```bash
cd D:\openwork\00_active\aimum
npm run session
```

### 方式 3: OpenClaw 技能

说 "开始开发 AImum" 或 "恢复 AImum 上下文"

### 方式 4: 手动恢复

1. 打开 `D:\openwork\AIopenclaw\AImum-MEMORY.md`
2. 查看当前状态
3. 继续开发

## 断篇恢复流程

```
新会话开始
    │
    ├─► 如果忘记项目状态
    │      │
    │      ├─► 1. 打开 Desktop/AImum-MEMORY.md
    │      │
    │      ├─► 2. 运行 npm run session
    │      │
    │      └─► 3. 查看 GitHub 最近提交
    │
    └─► 正常流程
           │
           ├─► 读取记忆文件
           │
           ├─► 显示当前进度 (16%)
           │
           ├─► 显示下一步行动
           │
           └─► 继续开发
```

## 确保不遗忘的规则

### ✅ 自动触发

1. **会话开始时** - 运行 `npm run session`
2. **任何时候** - 说 "AImum 项目状态"
3. **开发前** - 双击 `AIopenclaw.html`

### ✅ 手动检查

1. 打开 `Desktop/AImum-MEMORY.md`
2. 查看 PRD.md 的"下一步行动"部分
3. 检查 GitHub Actions 运行记录

### ✅ 备份机制

1. 本地 3 份记忆文件
2. GitHub 代码仓库
3. 飞书机器人推送

## 故障恢复

| 问题 | 解决方案 |
|------|----------|
| 忘记项目状态 | 双击 `Desktop/AImum-MEMORY.md` |
| 不知道在哪 | 运行 `npm run session` |
| 不知道下一步 | 查看 PRD.md "下一步行动" |
| 代码丢失 | 查看 GitHub 历史 |

## 重要文件索引

| 文件 | 路径 | 说明 |
|------|------|------|
| 会话启动器 | `D:\openwork\00_active\aimum\scripts\autostart.js` | 自动启动脚本 |
| 记忆恢复 | `D:\openwork\00_active\aimum\scripts\session-starter.js` | 恢复上下文 |
| 进度追踪 | `D:\openwork\00_active\aimum\scripts\tracker.js` | 进度显示 |
| 记忆文件 | `D:\openwork\AIopenclaw\AImum-MEMORY.md` | 桌面快速访问 |
| 项目文档 | `D:\openwork\00_active\aimum\PRD.md` | 完整文档 |

---

**💡 记住**: 任何时候忘记了，打开 `Desktop/AImum-MEMORY.md` 或运行 `npm run session` 就知道了！
