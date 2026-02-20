# Product Requirements Document

## Overview
Enable optional mobile push notifications via the `ntfy-me-mcp` MCP server in the Kilo Code VS Code extension. Users can configure settings, bootstrap setup from the extension, and receive workflow status notifications on their phones. The feature must be optional and non-blocking if unavailable.

## Goals
- Allow users to enable ntfy notifications via VS Code settings.
- Provide a guided setup flow for first-time configuration.
- Integrate with existing MCP infrastructure to send notifications.
- Ensure failures do not interrupt autonomous workflows.

## Non-Goals
- Implement changes in the CLI or JetBrains plugin.
- Add new external dependencies beyond existing MCP capabilities.
- Provide a custom ntfy server implementation.

## Functional Requirements
1. **MCP Server Registry**
   - Add `ntfy-me-mcp` entry in `.kilo/mcp-servers-registry.json`.
   - Server command: `npx ntfy-me-mcp`.
   - Required env: `NTFY_TOPIC`.
   - Optional env: `NTFY_URL` (default `https://ntfy.sh`), `NTFY_TOKEN`.
   - Mark as optional dependency.

2. **Settings**
   - Add VS Code settings under `kilo.notifications.ntfy`:
     - `enabled`: boolean, default `false`.
     - `topic`: string (user topic).
     - `server`: string, default `https://ntfy.sh`.
     - `token`: string, optional.
   - Settings visible in VS Code Settings UI and stored in workspace/user settings.

3. **Notification Helper**
   - Add `src/services/notifications/ntfy-helper.ts` with `sendNtfyNotification(title, message, options)`.
   - If `enabled` is false or settings are incomplete, exit gracefully.
   - Use MCP tool `ntfy_me` with payload including title, message, priority, tags, attachments.
   - Handle errors without throwing; log or swallow safely to avoid breaking workflows.

4. **Bootstrap Setup**
   - Add `src/services/notifications/bootstrap.ts` with `setupNtfy()`.
   - If settings missing, prompt user via QuickPick to configure.
   - Suggest topic in format `kilo-{username}-{random}`.
   - Save configuration to workspace settings.
   - Send a test notification upon successful setup.

5. **Documentation**
   - Create `.framework/docs/notifications.md` describing:
     - Enabling ntfy notifications.
     - Installing ntfy app on iOS/Android.
     - Subscribing to a topic.
     - Example notification workflows.
     - Privacy considerations (topics unencrypted by default).

## User Experience
- Settings surfaced in VS Code Settings UI.
- Bootstrap flow guides the user when configuration is absent.
- Notification send is transparent; no blocking UI.

## Assumptions
- Existing MCP integration can register optional servers via `.kilo/mcp-servers-registry.json`.
- MCP tool `ntfy_me` is available when the server is running.
- Existing settings registration mechanism supports new `kilo.notifications.*` keys.

## Success Criteria
- User can enable notifications and configure topic/server/token.
- Bootstrap wizard configures settings and sends a test notification.
- Sending notifications does not break workflows if ntfy is unavailable.
- Documentation is discoverable in `.framework/docs/notifications.md`.

## Testing & Verification
- Manual test via command palette to trigger a test notification.
- Verify settings UI shows new ntfy options.
- Test with and without auth token.
- Confirm graceful failure when misconfigured.
