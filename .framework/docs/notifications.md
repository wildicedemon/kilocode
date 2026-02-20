# Ntfy Notifications

## Overview

Ntfy notifications provide optional mobile push updates for autonomous workflows through the `ntfy-me-mcp` server. When enabled, Kilo Code can send status updates, phase changes, and alerts to your phone without interrupting the workflow.

## Enablement

1. Open **VS Code Settings** and search for `Kilo Code Ntfy`.
2. Set `kilo-code.notifications.ntfy.enabled` to `true`.
3. Set `kilo-code.notifications.ntfy.topic` to a unique value, such as `kilo-<username>-<random>`.
4. Optional: set `kilo-code.notifications.ntfy.server` (defaults to `https://ntfy.sh`).
5. Optional: set `kilo-code.notifications.ntfy.token` for private topics.
6. Run the **Setup Ntfy** command from the Command Palette to validate configuration and send a test notification.

## Install the Mobile App

1. Install the **ntfy** app on your phone:
    - **iOS**: App Store
    - **Android**: Google Play
2. Open the app and allow notifications.

## Subscribe to a Topic

1. In the ntfy app, add a new subscription.
2. Enter your configured topic.
3. If you set a custom server, update the server URL to match `kilo-code.notifications.ntfy.server`.
4. Save the subscription and confirm the test notification arrives.

## Example Notification Workflows

- **Workflow started**: `Planning phase started for Task 42`
- **Phase completed**: `Verification phase completed successfully`
- **Attention needed**: `Blocked: missing API key for provider settings`
- **Completion**: `Task finished with all checks passing`

## Privacy Considerations

- **Topics are not encrypted**: anyone with the topic can read messages on public servers.
- **Use unique topics**: generate a hard-to-guess topic name.
- **Use tokens for private topics** when supported by your server.
- **Avoid sensitive data** in notification content.
- **Self-hosting**: run your own ntfy server if you need full control over data retention.
