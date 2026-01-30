---
summary: "CLI reference for `moltbot-cn plugins` (list, install, enable/disable, doctor)"
read_when:
  - You want to install or manage in-process Gateway plugins
  - You want to debug plugin load failures
---

# `moltbot-cn plugins`

Manage Gateway plugins/extensions (loaded in-process).

Related:
- Plugin system: [Plugins](/plugin)
- Plugin manifest + schema: [Plugin manifest](/plugins/manifest)
- Security hardening: [Security](/gateway/security)

## Commands

```bash
moltbot-cn plugins list
moltbot-cn plugins info <id>
moltbot-cn plugins enable <id>
moltbot-cn plugins disable <id>
moltbot-cn plugins doctor
moltbot-cn plugins update <id>
moltbot-cn plugins update --all
```

Bundled plugins ship with Clawdbot but start disabled. Use `plugins enable` to
activate them.

All plugins must ship a `clawdbot.plugin.json` file with an inline JSON Schema
(`configSchema`, even if empty). Missing/invalid manifests or schemas prevent
the plugin from loading and fail config validation.

### Install

```bash
moltbot-cn plugins install <path-or-spec>
```

Security note: treat plugin installs like running code. Prefer pinned versions.

Supported archives: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Use `--link` to avoid copying a local directory (adds to `plugins.load.paths`):

```bash
moltbot-cn plugins install -l ./my-plugin
```

### Update

```bash
moltbot-cn plugins update <id>
moltbot-cn plugins update --all
moltbot-cn plugins update <id> --dry-run
```

Updates only apply to plugins installed from npm (tracked in `plugins.installs`).
