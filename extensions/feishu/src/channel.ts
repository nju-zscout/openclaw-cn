import {
  feishuOutbound,
  normalizeFeishuTarget,
  resolveFeishuAccount,
  listFeishuAccountIds,
  resolveDefaultFeishuAccountId,
  getChatChannelMeta,
  buildChannelConfigSchema,
} from "clawdbot/plugin-sdk";
import type { ChannelPlugin } from "../../../src/channels/plugins/types.plugin.js";
import type { ResolvedFeishuAccount } from "../../../src/feishu/accounts.js";
import type { ClawdbotConfig } from "../../../src/config/config.js";
import { createFeishuBot, startFeishuBot } from "../../../src/feishu/bot.js";
import { feishuOnboardingAdapter } from "./onboarding.js";
import { FeishuAccountSchema } from "./config-schema.js";

const meta = getChatChannelMeta("feishu");

export const feishuPlugin: ChannelPlugin<ResolvedFeishuAccount> = {
  id: "feishu",
  meta: {
      ...meta,
      quickstartAllowFrom: true,
  },
  capabilities: {
      chatTypes: ["direct", "group"],
      media: true,
  },
  onboarding: feishuOnboardingAdapter,
  outbound: feishuOutbound as any,
  messaging: {
      normalizeTarget: normalizeFeishuTarget,
  },
  configSchema: buildChannelConfigSchema(FeishuAccountSchema),
  config: {
      listAccountIds: (cfg: ClawdbotConfig) => listFeishuAccountIds(cfg),
      resolveAccount: (cfg: ClawdbotConfig, accountId?: string | null) => resolveFeishuAccount({ cfg, accountId: accountId ?? undefined }) as ResolvedFeishuAccount,
      defaultAccountId: (cfg: ClawdbotConfig) => resolveDefaultFeishuAccountId(cfg),
      isConfigured: (account: ResolvedFeishuAccount) => (account as any).tokenSource !== "none",
  },
  status: {
    defaultRuntime: {
        accountId: "",
        connected: false,
        lastInboundAt: null,
        lastOutboundAt: null,
        lastError: null,
    },
    collectStatusIssues: (accounts) => [],
    buildChannelSummary: async ({ snapshot }) => ({
        active: snapshot.connected ? 1 : 0,
        configured: 1,
        issues: 0,
    }),
  },
  gateway: {
      startAccount: async (ctx) => {
          const { account, log } = ctx;
          log?.info(`Starting Feishu bot for account ${account.accountId}`);
          const config = (account as any).config;
          const bot = createFeishuBot({
              appId: config.appId,
              appSecret: config.appSecret
          });
          await startFeishuBot(bot);
      }
  }
};
