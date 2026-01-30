import type { ClawdbotPluginApi } from "moltbot-cn/plugin-sdk";
import { emptyPluginConfigSchema } from "moltbot-cn/plugin-sdk";

import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: ClawdbotPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;
