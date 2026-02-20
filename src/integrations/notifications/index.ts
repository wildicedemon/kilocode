import { execa } from "execa"
import * as os from "os"
import * as vscode from "vscode"

interface NotificationOptions {
	title?: string
	subtitle?: string
	message: string
}

// kilocode_change start
interface NtfyNotificationOptions {
	endpoint?: string
	topic?: string
	title?: string
	message: string
	tags?: string[]
	priority?: number
	click?: string
}
// kilocode_change end

async function showMacOSNotification(options: NotificationOptions): Promise<void> {
	const { title, subtitle = "", message } = options

	// Try terminal-notifier first if available
	try {
		const args = ["-message", message]
		if (title) {
			args.push("-title", title)
		}
		if (subtitle) {
			args.push("-subtitle", subtitle)
		}
		args.push("-sound", "Tink")

		// Add Kilo Code logo
		const extensionUri = vscode.extensions.getExtension(`kilocode.kilo-code`)!.extensionUri
		const iconPath = vscode.Uri.joinPath(extensionUri, "assets", "icons", "kilo.png").fsPath
		args.push("-appIcon", iconPath)

		await execa("terminal-notifier", args)
		return
	} catch (error) {
		// If terminal-notifier fails, fall back to osascript
		// This could be because terminal-notifier is not installed or other error
	}

	// Fallback to osascript
	const script = `display notification "${message}" with title "${title}" subtitle "${subtitle}" sound name "Tink"`

	try {
		await execa("osascript", ["-e", script])
	} catch (error) {
		throw new Error(`Failed to show macOS notification: ${error}`)
	}
}

async function showWindowsNotification(options: NotificationOptions): Promise<void> {
	const { subtitle, message } = options

	const script = `
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

    $template = @"
    <toast>
        <visual>
            <binding template="ToastText02">
                <text id="1">${subtitle}</text>
                <text id="2">${message}</text>
            </binding>
        </visual>
    </toast>
"@

    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Kilo Code").Show($toast)
    `

	try {
		await execa("powershell", ["-Command", script])
	} catch (error) {
		throw new Error(`Failed to show Windows notification: ${error}`)
	}
}

async function showLinuxNotification(options: NotificationOptions): Promise<void> {
	const { title = "", subtitle = "", message } = options

	// Combine subtitle and message if subtitle exists
	const fullMessage = subtitle ? `${subtitle}\n${message}` : message

	try {
		await execa("notify-send", [title, fullMessage])
	} catch (error) {
		throw new Error(`Failed to show Linux notification: ${error}`)
	}
}

// kilocode_change start
function resolveNtfyEndpoint(options: NtfyNotificationOptions): string | null {
	const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env
	const configuredEndpoint = options.endpoint ?? env?.KILOCODE_NTFY_ENDPOINT ?? env?.NTFY_ENDPOINT

	if (!configuredEndpoint) {
		return null
	}

	const trimmedEndpoint = configuredEndpoint.endsWith("/") ? configuredEndpoint.slice(0, -1) : configuredEndpoint
	if (options.topic) {
		return `${trimmedEndpoint}/${options.topic}`
	}

	return configuredEndpoint
}

export async function sendNtfyNotification(options: NtfyNotificationOptions): Promise<void> {
	const { message, title, tags, priority, click } = options

	if (!message) {
		throw new Error("ntfy notification message is required")
	}

	const endpoint = resolveNtfyEndpoint(options)
	if (!endpoint) {
		throw new Error("ntfy endpoint is required. Provide endpoint or set NTFY_ENDPOINT.")
	}

	const headers: Record<string, string> = {}
	if (title) {
		headers.Title = title
	}
	if (tags && tags.length > 0) {
		headers.Tags = tags.join(",")
	}
	if (priority !== undefined) {
		headers.Priority = `${priority}`
	}
	if (click) {
		headers.Click = click
	}

	const response = await fetch(endpoint, {
		method: "POST",
		headers,
		body: message,
	})

	if (!response.ok) {
		const responseText = await response.text().catch(() => "")
		const detail = responseText ? `: ${responseText}` : ""
		throw new Error(`ntfy notification failed with ${response.status} ${response.statusText}${detail}`)
	}
}
// kilocode_change end

export async function showSystemNotification(options: NotificationOptions): Promise<void> {
	try {
		const { title = "Kilo Code", message } = options

		if (!message) {
			throw new Error("Message is required")
		}

		const escapedOptions = {
			...options,
			title: title.replace(/"/g, '\\"'),
			message: message.replace(/"/g, '\\"'),
			subtitle: options.subtitle?.replace(/"/g, '\\"') || "",
		}

		switch (os.platform()) {
			case "darwin":
				await showMacOSNotification(escapedOptions)
				break
			case "win32":
				await showWindowsNotification(escapedOptions)
				break
			case "linux":
				await showLinuxNotification(escapedOptions)
				break
			default:
				throw new Error("Unsupported platform")
		}
	} catch (error) {
		console.error("Could not show system notification", error)
	}
}
