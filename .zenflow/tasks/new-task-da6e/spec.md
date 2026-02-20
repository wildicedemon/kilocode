# Technical Specification

## Technical Context
- **Language/Runtime**: TypeScript, Node 20, VS Code extension (workspace extension).
- **Package manager**: `pnpm` (monorepo with `src/` workspace for extension).
- **MCP integration**: `src/services/mcp/McpHub.ts` manages MCP servers and provides `callTool` for server tool invocations. Project MCP config is read from `.kilocode/mcp.json` (with fallbacks to `.cursor/mcp.json` and `.mcp.json`).
- **Settings schema**: Extension settings are declared in `src/package.json` under `contributes.configuration` and accessed via `vscode.workspace.getConfiguration(Package.name)`.
- **Commands**: Registered in `src/activate/registerCommands.ts` with IDs defined in `packages/types/src/vscode.ts` and contributed in `src/package.json`.

## Implementation Approach
1. **MCP server registry entry**
   - Create `.kilo/mcp-servers-registry.json` in the repo with an entry for `ntfy-me-mcp` (command `npx ntfy-me-mcp`, required env `NTFY_TOPIC`, optional `NTFY_URL`/`NTFY_TOKEN`).
   - Mark as optional dependency in the registry entry. This registry file is a source-of-truth for optional MCP server metadata used by the extension UI/registry loader (align with existing MCP marketplace conventions).

2. **Settings schema additions**
   - Extend `src/package.json` configuration with:
     - `kilo-code.notifications.ntfy.enabled` (boolean, default `false`)
     - `kilo-code.notifications.ntfy.topic` (string)
     - `kilo-code.notifications.ntfy.server` (string, default `https://ntfy.sh`)
     - `kilo-code.notifications.ntfy.token` (string, optional)
   - Add description entries in `src/package.nls.json` (and other locales if required by existing conventions).
   - If the settings need to flow through `RooCodeSettings` (webview or persisted state), extend `packages/types/src/global-settings.ts` to include a `notificationsNtfy` object or equivalent flattened keys and adjust any settings key lists or defaults (`EVALS_SETTINGS`) to keep types aligned.

3. **Notification helper utility**
   - Add `src/services/notifications/ntfy-helper.ts` exporting `sendNtfyNotification(title, message, options)`.
   - Use `vscode.workspace.getConfiguration(Package.name)` to read `notifications.ntfy.*` values.
   - Guard: if `enabled` is false or topic missing, return early.
   - Use `McpHub.callTool(serverName, "ntfy_me", payload)` where `serverName` matches the registry key and payload maps to ntfy tool contract (title/message + `priority`, `tags`, `attachments`).
   - Handle errors with `try/catch` and log via existing logging conventions; never throw to callers.

4. **Bootstrap setup helper**
   - Add `src/services/notifications/bootstrap.ts` with `setupNtfy()`.
   - Behavior:
     - Check current settings; if missing, use `vscode.window.showQuickPick` to prompt enabling and selecting/configuring topic/server/token.
     - Generate topic suggestion `kilo-{username}-{random}` (username from OS/env or VS Code API; random from `crypto`/`Math.random` as per existing utilities).
     - Persist configuration via `vscode.workspace.getConfiguration(Package.name).update("notifications.ntfy.<key>", value, vscode.ConfigurationTarget.Workspace)`.
     - After save, call `sendNtfyNotification` with a test message.

5. **Command surface for manual test**
   - Add a command ID (e.g., `ntfyTestNotification`) in `packages/types/src/vscode.ts`.
   - Contribute the command in `src/package.json` and register it in `src/activate/registerCommands.ts` to call `setupNtfy()` or send a test notification directly.

## Source Code Structure Changes
- **New**: `src/services/notifications/ntfy-helper.ts`
- **New**: `src/services/notifications/bootstrap.ts`
- **Update**: `src/package.json` (settings + command contribution)
- **Update**: `src/package.nls.json` (settings descriptions/command label)
- **Update**: `packages/types/src/vscode.ts` (command ID)
- **Update (if needed)**: `packages/types/src/global-settings.ts` (settings type), plus any state defaults consumed by `ContextProxy`.
- **New**: `.kilo/mcp-servers-registry.json`

## Data Model / API / Interface Changes
- **Settings** (VS Code): `kilo-code.notifications.ntfy.{enabled,topic,server,token}`.
- **MCP tool invocation**: `McpHub.callTool("ntfy-me-mcp", "ntfy_me", payload)` where payload includes title/message and optional options (priority/tags/attachments).
- **Command**: new command ID and registration for manual test.

## Delivery Phases
1. **Registry + settings schema**: add registry JSON, settings keys, and localization text; ensure config reads work.
2. **Notification helper**: implement `sendNtfyNotification` and integrate with MCP tool calling.
3. **Bootstrap + command**: implement setup flow and register command for manual test notifications.
4. **Wiring/QA**: verify settings state flows and graceful failure behavior.

## Verification Approach
- **Unit tests (vitest)**:
  - Add tests for `sendNtfyNotification` guarding behavior and MCP call invocation (mock `McpHub` and settings).
  - Add tests for `setupNtfy` configuration flow (mock `vscode` APIs).
  - Run from `src/` workspace: `pnpm test path/to/test-file`.
- **Manual**:
  - Use command palette to run test notification command; confirm message on device.
  - Validate settings appear in VS Code Settings UI.
  - Confirm no crashes when `ntfy` is disabled/misconfigured.
- **Lint/Typecheck**:
  - From repo root: `pnpm lint`, `pnpm check-types`.
