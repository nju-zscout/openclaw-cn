---
summary: "多代理路由：隔离代理、频道账户和绑定"
title: 多代理路由
read_when: "您希望在一个网关进程中运行多个隔离代理（工作区 + 认证）。"
status: active
---

# 多代理路由

目标：多个 *隔离* 代理（独立工作区 + `agentDir` + 会话），加上多个频道账户（例如两个 WhatsApp）在一个运行的网关中。入站消息通过绑定路由到代理。

## 什么是"一个代理"？

一个 **代理** 是一个完全作用域的大脑，拥有自己的：

- **工作区**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、人格规则）。
- **状态目录**（`agentDir`）用于认证配置文件、模型注册表和每个代理的配置。
- **会话存储**（聊天历史 + 路由状态）位于 `~/.openclaw/agents/<agentId>/sessions` 下。

认证配置文件是 **每个代理** 的。每个代理从自己的位置读取：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

主代理凭证 **不会** 自动共享。切勿在代理之间重用 `agentDir`
（会导致认证/会话冲突）。如果您想共享凭证，
请将 `auth-profiles.json` 复制到其他代理的 `agentDir` 中。

技能通过每个工作区的 `skills/` 文件夹实现每个代理，共享技能
可从 `~/.openclaw/skills` 获得。参见 [技能：每个代理 vs 共享](/tools/skills#per-agent-vs-shared-skills)。

网关可以托管 **一个代理**（默认）或 **多个代理** 并排运行。

**工作区说明：** 每个代理的工作区是 **默认 cwd**，不是硬沙盒。
相对路径在工作区内解析，但绝对路径可以
到达其他主机位置，除非启用了沙盒。参见
[沙盒](/gateway/sandboxing)。

## 路径（快速映射）

- Config: `~/.openclaw/openclaw.json` (or `OPENCLAW_CONFIG_PATH`)
- State dir: `~/.openclaw` (or `OPENCLAW_STATE_DIR`)
- Workspace: `~/clawd` (or `~/clawd-<agentId>`)
- Agent dir: `~/.openclaw/agents/<agentId>/agent` (or `agents.list[].agentDir`)
- Sessions: `~/.openclaw/agents/<agentId>/sessions`

### 单代理模式（默认）

如果您什么都不做，Clawdbot 运行单个代理：

- `agentId` 默认为 **`main`**。
- 会话键为 `agent:main:<mainKey>`。
- 工作区默认为 `~/clawd`（或当设置 `OPENCLAW_PROFILE` 时为 `~/clawd-<profile>`）。
- 状态默认为 `~/.openclaw/agents/main/agent`。

## 代理助手

使用代理向导添加新的隔离代理：

```bash
clawdbot agents add work
```

然后添加 `bindings`（或让向导来做）来路由入站消息。

Verify with:

```bash
clawdbot agents list --bindings
```

## 多个代理 = 多个人，多种人格

使用 **多个代理**，每个 `agentId` 成为一个 **完全隔离的人格**：

- **不同的电话号码/账户**（每个频道 `accountId`）。
- **不同的人格**（每个代理的工作区文件如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的认证 + 会话**（除非明确启用，否则无交叉通信）。

这使得 **多个人** 可以共享一个网关服务器，同时保持他们的 AI "大脑" 和数据隔离。

## 一个 WhatsApp 号码，多个人（DM 分割）

您可以将 **不同的 WhatsApp DM** 路由到不同的代理，同时保持在 **一个 WhatsApp 账户** 上。匹配发送者的 E.164（如 `+15551234567`）与 `peer.kind: "dm"`。回复仍来自同一个 WhatsApp 号码（无每个代理的发送者身份）。

重要细节：直接聊天折叠到代理的 **主会话键**，因此真正的隔离需要 **每人一个代理**。

Example:

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/clawd-alex" },
      { id: "mia", workspace: "~/clawd-mia" }
    ]
  },
  bindings: [
    { agentId: "alex", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551230001" } } },
    { agentId: "mia",  match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551230002" } } }
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"]
    }
  }
}
```

注意事项：
- DM 访问控制是 **每个 WhatsApp 账户全局** 的（配对/允许列表），而不是每个代理。
- 对于共享群组，将群组绑定到一个代理或使用 [广播群组](/broadcast-groups)。

## 路由规则（消息如何选择代理）

绑定是 **确定性的**，**最具体者获胜**：

1. `peer` 匹配（精确的 DM/群组/频道 ID）
2. `guildId`（Discord）
3. `teamId`（Slack）
4. 频道的 `accountId` 匹配
5. 频道级别匹配（`accountId: "*"`）
6. 回退到默认代理（`agents.list[].default`，否则列表第一项，默认：`main`）

## 多个账户 / 电话号码

支持 **多个账户** 的频道（例如 WhatsApp）使用 `accountId` 来识别
每个登录。每个 `accountId` 可以路由到不同的代理，因此一台服务器可以托管
多个电话号码而不会混合会话。

## 概念

- `agentId`：一个 "大脑"（工作区、每个代理的认证、每个代理的会话存储）。
- `accountId`：一个频道账户实例（例如 WhatsApp 账户 `"personal"` vs `"biz"`）。
- `binding`：通过 `(channel, accountId, peer)` 和可选的公会/团队 ID 将入站消息路由到 `agentId`。
- 直接聊天折叠到 `agent:<agentId>:<mainKey>`（每个代理的 "main"；`session.mainKey`）。

## 示例：两个 WhatsApp → 两个代理

`~/.openclaw/openclaw.json` (JSON5):

```js
{
  agents: {
    list: [
      {
        id: "home",
        default: true,
        name: "Home",
        workspace: "~/clawd-home",
        agentDir: "~/.openclaw/agents/home/agent",
      },
      {
        id: "work",
        name: "Work",
        workspace: "~/clawd-work",
        agentDir: "~/.openclaw/agents/work/agent",
      },
    ],
  },

  // Deterministic routing: first match wins (most-specific first).
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

    // Optional per-peer override (example: send a specific group to work agent).
    {
      agentId: "work",
      match: {
        channel: "whatsapp",
        accountId: "personal",
        peer: { kind: "group", id: "1203630...@g.us" },
      },
    },
  ],

  // Off by default: agent-to-agent messaging must be explicitly enabled + allowlisted.
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },

  channels: {
    whatsapp: {
      accounts: {
        personal: {
          // Optional override. Default: ~/.openclaw/credentials/whatsapp/personal
          // authDir: "~/.openclaw/credentials/whatsapp/personal",
        },
        biz: {
          // Optional override. Default: ~/.openclaw/credentials/whatsapp/biz
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

## 示例：WhatsApp 日常聊天 + Telegram 深度工作

按频道分割：将 WhatsApp 路由到快速日常代理，Telegram 路由到 Opus 代理。

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/clawd-chat",
        model: "anthropic/claude-sonnet-4-5"
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/clawd-opus",
        model: "anthropic/claude-opus-4-5"
      }
    ]
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } }
  ]
}
```

注意事项：
- 如果您有频道的多个账户，请在绑定中添加 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 要将单个 DM/群组路由到 Opus，同时保持其余部分在聊天中，请为该对等方添加 `match.peer` 绑定；对等匹配总是胜过频道范围的规则。

## 示例：同一频道，一个对等方到 Opus

保持 WhatsApp 在快速代理上，但将一个 DM 路由到 Opus：

```json5
{
  agents: {
    list: [
      { id: "chat", name: "Everyday", workspace: "~/clawd-chat", model: "anthropic/claude-sonnet-4-5" },
      { id: "opus", name: "Deep Work", workspace: "~/clawd-opus", model: "anthropic/claude-opus-4-5" }
    ]
  },
  bindings: [
    { agentId: "opus", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551234567" } } },
    { agentId: "chat", match: { channel: "whatsapp" } }
  ]
}
```

对等绑定总是获胜，所以将它们放在频道范围规则之上。

## 绑定到 WhatsApp 群组的家庭代理

将专用家庭代理绑定到单个 WhatsApp 群组，带有提及门控
和更严格的工具策略：

```json5
{
  agents: {
    list: [
      {
        id: "family",
        name: "Family",
        workspace: "~/clawd-family",
        identity: { name: "Family Bot" },
        groupChat: {
          mentionPatterns: ["@family", "@familybot", "@Family Bot"]
        },
        sandbox: {
          mode: "all",
          scope: "agent"
        },
        tools: {
          allow: ["exec", "read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"]
        }
      }
    ]
  },
  bindings: [
    {
      agentId: "family",
      match: {
        channel: "whatsapp",
        peer: { kind: "group", id: "120363999999999999@g.us" }
      }
    }
  ]
}
```

注意事项：
- 工具允许/拒绝列表是 **工具**，不是技能。如果技能需要运行
  二进制文件，请确保允许 `exec` 并且二进制文件存在于沙盒中。
- 对于更严格的门控，设置 `agents.list[].groupChat.mentionPatterns` 并保持
  频道的群组允许列表启用。

## 每个代理的沙盒和工具配置

从 v2026.1.6 开始，每个代理可以有自己的沙盒和工具限制：

```js
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/clawd-personal",
        sandbox: {
          mode: "off",  // No sandbox for personal agent
        },
        // No tool restrictions - all tools available
      },
      {
        id: "family",
        workspace: "~/clawd-family",
        sandbox: {
          mode: "all",     // Always sandboxed
          scope: "agent",  // One container per agent
          docker: {
            // Optional one-time setup after container creation
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // Only read tool
          deny: ["exec", "write", "edit", "apply_patch"],    // Deny others
        },
      },
    ],
  },
}
```

注意：`setupCommand` 位于 `sandbox.docker` 下，在容器创建时运行一次。
当解析的作用域为 `"shared"` 时，每个代理的 `sandbox.docker.*` 覆盖被忽略。

**好处：**
- **安全隔离**：限制不可信代理的工具
- **资源控制**：沙盒特定代理，同时让其他代理在主机上运行
- **灵活策略**：每个代理的不同权限

注意：`tools.elevated` 是 **全局** 的且基于发送者；它不能按代理配置。
如果您需要每个代理的边界，请使用 `agents.list[].tools` 来拒绝 `exec`。
对于群组定位，使用 `agents.list[].groupChat.mentionPatterns`，这样 @提及可以清晰地映射到目标代理。

有关详细示例，请参见 [多代理沙盒和工具](/multi-agent-sandbox-tools)。
