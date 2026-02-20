// kilocode_change - new file
import * as vscode from "vscode"

import { ClineProvider } from "../../core/webview/ClineProvider"
import { Package } from "../../shared/package"

export type NtfyNotificationOptions = {
	priority?: number
	tags?: string[]
	attachments?: Array<string | { url: string; name?: string }>
}

export async function sendNtfyNotification(
	title: string,
	message: string,
	options: NtfyNotificationOptions = {},
): Promise<void> {
	const config = vscode.workspace.getConfiguration(Package.name)
	const enabled = config.get<boolean>("notifications.ntfy.enabled", false)
	if (!enabled) {
		return
	}

	const topic = config.get<string>("notifications.ntfy.topic")
	if (!topic) {
		return
	}

	const server = config.get<string>("notifications.ntfy.server", "https://ntfy.sh")
	const token = config.get<string>("notifications.ntfy.token")

	const provider = await ClineProvider.getInstance()
	const mcpHub = provider?.getMcpHub()
	if (!mcpHub) {
		return
	}

	const toolArguments = {
		title,
		message,
		topic,
		server,
		token,
		priority: options.priority,
		tags: options.tags,
		attachments: options.attachments,
	}

	try {
		await mcpHub.callTool("ntfy-me-mcp", "ntfy_me", toolArguments)
	} catch (error) {
		console.error("Failed to send ntfy notification", error)
	}
}
