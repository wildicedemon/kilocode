// kilocode_change - new file

import {
	updateRequirementsApprovalStatus,
	type RequirementsApprovalUpdateOptions,
	type RequirementsDocumentResult,
} from "../../services/framework/requirements/requirements-doc-writer"

export interface NtfyConfig {
	baseUrl: string
	topic: string
	accessToken?: string
	username?: string
	password?: string
}

export type NtfyActionType = "view" | "http"

export interface NtfyAction {
	action: NtfyActionType
	label: string
	url: string
	method?: "GET" | "POST"
	clear?: boolean
}

export interface NtfyNotificationOptions {
	message: string
	title?: string
	tags?: string[]
	priority?: number
	actions?: NtfyAction[]
	click?: string
}

export interface NtfyNotificationResult {
	ok: boolean
	status: number
	id?: string
	error?: string
}

export interface RequirementsApprovalNotificationOptions {
	summary: string
	approveUrl: string
	changesUrl: string
	issueId?: string
}

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
}

function buildAuthHeader(config: NtfyConfig): string | undefined {
	if (config.accessToken) {
		return `Bearer ${config.accessToken}`
	}
	if (config.username && config.password) {
		return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`
	}
	return undefined
}

function buildActionsHeader(actions: NtfyAction[]): string {
	return actions
		.map((action) => {
			const extras: string[] = []
			if (action.method) {
				extras.push(`method=${action.method}`)
			}
			if (action.clear !== undefined) {
				extras.push(`clear=${action.clear ? "true" : "false"}`)
			}
			const suffix = extras.length > 0 ? `,${extras.join(",")}` : ""
			return `${action.action},${action.label},${action.url}${suffix}`
		})
		.join(";")
}

async function parseNtfyResponse(response: Response): Promise<{ id?: string; error?: string }> {
	const contentType = response.headers.get("content-type") ?? ""
	const text = await response.text()
	if (contentType.includes("application/json")) {
		try {
			const parsed = JSON.parse(text) as { id?: string; error?: string }
			return { id: parsed.id, error: parsed.error }
		} catch {
			return { error: text }
		}
	}
	return { error: response.ok ? undefined : text }
}

export async function sendNtfyNotification(
	config: NtfyConfig,
	options: NtfyNotificationOptions,
): Promise<NtfyNotificationResult> {
	const url = `${normalizeBaseUrl(config.baseUrl)}/${config.topic}`
	const headers = new Headers()
	const authHeader = buildAuthHeader(config)
	if (authHeader) {
		headers.set("Authorization", authHeader)
	}
	if (options.title) {
		headers.set("Title", options.title)
	}
	if (options.tags && options.tags.length > 0) {
		headers.set("Tags", options.tags.join(","))
	}
	if (options.priority !== undefined) {
		headers.set("Priority", options.priority.toString())
	}
	if (options.actions && options.actions.length > 0) {
		headers.set("Actions", buildActionsHeader(options.actions))
	}
	if (options.click) {
		headers.set("Click", options.click)
	}

	const response = await fetch(url, {
		method: "POST",
		headers,
		body: options.message,
	})
	const parsed = await parseNtfyResponse(response)
	return {
		ok: response.ok,
		status: response.status,
		id: parsed.id,
		error: parsed.error,
	}
}

export async function sendRequirementsApprovalNotification(
	config: NtfyConfig,
	options: RequirementsApprovalNotificationOptions,
): Promise<NtfyNotificationResult> {
	return sendNtfyNotification(config, {
		message: options.summary,
		title: options.issueId ? `Requirements approval needed (${options.issueId})` : "Requirements approval needed",
		tags: ["requirements"],
		priority: 4,
		actions: [
			{
				action: "http",
				label: "Approve",
				url: options.approveUrl,
				method: "POST",
				clear: true,
			},
			{
				action: "http",
				label: "Request changes",
				url: options.changesUrl,
				method: "POST",
			},
		],
	})
}

export async function applyRequirementsApprovalUpdate(
	options: RequirementsApprovalUpdateOptions,
): Promise<RequirementsDocumentResult> {
	return updateRequirementsApprovalStatus({
		documentPath: options.documentPath,
		approvalStatus: options.approvalStatus,
		approvedAt: options.approvedAt,
	})
}
