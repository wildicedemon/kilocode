// kilocode_change - new file
import * as os from "os"
import * as vscode from "vscode"

import { Package } from "../../shared/package"
import { sendNtfyNotification } from "./ntfy-helper"

const defaultServer = "https://ntfy.sh"

const getSuggestedTopic = (): string => {
	let username = "user"
	try {
		username = os.userInfo().username
	} catch (error) {
		console.error("Failed to read OS username", error)
	}

	const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, "") || "user"
	const randomSuffix = Math.random().toString(36).slice(2, 8)
	return `kilo-${sanitizedUsername}-${randomSuffix}`
}

export const setupNtfy = async (): Promise<void> => {
	if (!vscode.window || !vscode.workspace) {
		console.error("VS Code API not available")
		return
	}

	const config = vscode.workspace.getConfiguration(Package.name)
	const enabled = config.get<boolean>("notifications.ntfy.enabled", false)
	const existingTopic = config.get<string>("notifications.ntfy.topic")

	if (enabled && existingTopic) {
		return
	}

	const selection = await vscode.window.showQuickPick(
		[
			{
				label: "Enable ntfy notifications",
				detail: "Send workflow status updates to your phone.",
			},
			{ label: "Not now" },
		],
		{ placeHolder: "Set up ntfy notifications?" },
	)

	if (!selection || selection.label !== "Enable ntfy notifications") {
		return
	}

	const suggestedTopic = getSuggestedTopic()
	const topicInput = await vscode.window.showInputBox({
		prompt: "Enter ntfy topic",
		value: suggestedTopic,
		ignoreFocusOut: true,
	})

	if (topicInput === undefined) {
		return
	}

	const topic = topicInput.trim()
	if (!topic) {
		vscode.window.showErrorMessage("ntfy topic is required.")
		return
	}

	const currentServer = config.get<string>("notifications.ntfy.server", defaultServer)
	const serverInput = await vscode.window.showInputBox({
		prompt: "Enter ntfy server URL",
		value: currentServer,
		ignoreFocusOut: true,
	})

	if (serverInput === undefined) {
		return
	}

	const server = serverInput.trim() || defaultServer
	const tokenInput = await vscode.window.showInputBox({
		prompt: "Optional access token for private ntfy topics",
		placeHolder: "Leave empty for public topics",
		password: true,
		ignoreFocusOut: true,
	})

	if (tokenInput === undefined) {
		return
	}

	const token = tokenInput.trim()

	try {
		await config.update("notifications.ntfy.enabled", true, vscode.ConfigurationTarget.Workspace)
		await config.update("notifications.ntfy.topic", topic, vscode.ConfigurationTarget.Workspace)
		await config.update("notifications.ntfy.server", server, vscode.ConfigurationTarget.Workspace)
		await config.update("notifications.ntfy.token", token || undefined, vscode.ConfigurationTarget.Workspace)

		await sendNtfyNotification("Kilo Code", "ntfy notifications are enabled.")
		vscode.window.showInformationMessage("ntfy notifications configured.")
	} catch (error) {
		console.error("Failed to configure ntfy notifications", error)
	}
}
