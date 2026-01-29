import * as Lark from "@larksuiteoapi/node-sdk";
import { getChildLogger } from "../logging.js";

const logger = getChildLogger({ module: "feishu-probe" });

export type FeishuProbe = {
  ok: boolean;
  error?: string | null;
  elapsedMs: number;
  bot?: {
    appId?: string | null;
    appName?: string | null;
    avatarUrl?: string | null;
  };
};

export async function probeFeishu(
  appId: string,
  appSecret: string,
  timeoutMs: number = 5000,
): Promise<FeishuProbe> {
  const started = Date.now();

  const result: FeishuProbe = {
    ok: false,
    error: null,
    elapsedMs: 0,
  };

  try {
    const client = new Lark.Client({
      appId,
      appSecret,
      disableTokenCache: true,
    });

    // Use a timeout wrapper
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Get bot info by calling the bot info API
      const res = await client.bot.botInfo.get();

      clearTimeout(timer);

      if (res.code !== 0) {
        result.error = res.msg ?? `API error: ${res.code}`;
        result.elapsedMs = Date.now() - started;
        return result;
      }

      result.ok = true;
      result.bot = {
        appId: res.data?.app_name ? appId : null,
        appName: res.data?.app_name ?? null,
        avatarUrl: res.data?.avatar_url ?? null,
      };
      result.elapsedMs = Date.now() - started;
      return result;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    logger.debug?.(`Feishu probe failed: ${err}`);
    return {
      ...result,
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - started,
    };
  }
}
