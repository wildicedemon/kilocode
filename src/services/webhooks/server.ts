// kilocode_change - new file

import * as http from "http"
import { URL } from "url"
import type {
	WebhookConfig,
	GitHubEvent,
	GitHubEventType,
	WebhookHandler,
	RegisteredHandler,
	WebhookServerStatus,
} from "./types"
import { validateWebhookRequest, SecurityValidationResult } from "./security"

/**
 * Default webhook configuration values
 */
const DEFAULT_CONFIG: Partial<WebhookConfig> = {
	path: "/webhook",
	verbose: false,
}

/**
 * WebhookServer - HTTP server for receiving GitHub webhooks.
 *
 * Provides a lightweight HTTP server that:
 * - Listens for incoming GitHub webhook requests
 * - Validates webhook signatures using HMAC-SHA256
 * - Dispatches events to registered handlers
 * - Supports multiple handlers per event type
 *
 * @example
 * ```typescript
 * const server = new WebhookServer({
 *   port: 3000,
 *   secret: 'my-webhook-secret'
 * })
 *
 * server.registerHandler('issues', async (event) => {
 *   console.log(`Received issue: ${event.payload.issue.title}`)
 * })
 *
 * await server.start()
 * ```
 */
export class WebhookServer {
	private config: WebhookConfig
	private server: http.Server | null = null
	private handlers: Map<string, RegisteredHandler[]> = new Map()
	private status: WebhookServerStatus = {
		running: false,
		port: null,
		handlerCount: 0,
		eventsProcessed: 0,
		eventsFailed: 0,
		startTime: null,
		lastEventTime: null,
	}
	private handlerIdCounter = 0

	constructor(config: WebhookConfig) {
		this.config = { ...DEFAULT_CONFIG, ...config }
	}

	/**
	 * Start the webhook server.
	 *
	 * @param port - Optional port override (defaults to config.port)
	 * @returns Promise that resolves when server is listening
	 */
	async start(port?: number): Promise<void> {
		if (this.server) {
			throw new Error("Server is already running")
		}

		const listenPort = port ?? this.config.port

		return new Promise((resolve, reject) => {
			this.server = http.createServer((req, res) => {
				this.handleWebhook(req, res).catch((error) => {
					this.log(`Error handling webhook: ${error}`)
					this.status.eventsFailed++
				})
			})

			this.server.on("error", (err: NodeJS.ErrnoException) => {
				if (err.code === "EADDRINUSE") {
					reject(new Error(`Port ${listenPort} is already in use`))
				} else {
					reject(err)
				}
			})

			this.server.listen(listenPort, () => {
				this.status.running = true
				this.status.port = listenPort
				this.status.startTime = Date.now()
				this.log(`Webhook server started on port ${listenPort}`)
				this.log(`Webhook endpoint: http://localhost:${listenPort}${this.config.path}`)
				resolve()
			})
		})
	}

	/**
	 * Stop the webhook server.
	 *
	 * @returns Promise that resolves when server is closed
	 */
	async stop(): Promise<void> {
		if (!this.server) {
			return
		}

		return new Promise((resolve, reject) => {
			if (!this.server) {
				resolve()
				return
			}

			this.server.close((err) => {
				if (err) {
					reject(err)
				} else {
					this.server = null
					this.status.running = false
					this.status.port = null
					this.log("Webhook server stopped")
					resolve()
				}
			})
		})
	}

	/**
	 * Register a handler for a specific event type.
	 *
	 * @param eventType - GitHub event type (e.g., 'issues', 'pull_request') or '*' for all events
	 * @param handler - Handler function to process the event
	 * @param options - Optional handler configuration
	 * @returns Handler ID for later removal
	 */
	registerHandler(
		eventType: GitHubEventType | "*",
		handler: WebhookHandler,
		options?: {
			actions?: string[]
			repositories?: string[]
			senders?: string[]
			priority?: number
		},
	): string {
		const id = `handler-${++this.handlerIdCounter}`
		const registeredHandler: RegisteredHandler = {
			eventType,
			handler,
			options,
			id,
		}

		const key = eventType === "*" ? "*" : eventType
		const handlers = this.handlers.get(key) || []
		handlers.push(registeredHandler)

		// Sort by priority (higher priority first)
		handlers.sort((a, b) => (b.options?.priority ?? 0) - (a.options?.priority ?? 0))

		this.handlers.set(key, handlers)
		this.status.handlerCount = this.getTotalHandlerCount()

		this.log(`Registered handler '${id}' for event type '${eventType}'`)
		return id
	}

	/**
	 * Remove a registered handler.
	 *
	 * @param handlerId - ID returned from registerHandler
	 * @returns true if handler was removed, false if not found
	 */
	removeHandler(handlerId: string): boolean {
		for (const [eventType, handlers] of this.handlers.entries()) {
			const index = handlers.findIndex((h) => h.id === handlerId)
			if (index !== -1) {
				handlers.splice(index, 1)
				if (handlers.length === 0) {
					this.handlers.delete(eventType)
				}
				this.status.handlerCount = this.getTotalHandlerCount()
				this.log(`Removed handler '${handlerId}'`)
				return true
			}
		}
		return false
	}

	/**
	 * Handle incoming webhook request.
	 *
	 * @param req - HTTP request
	 * @param res - HTTP response
	 */
	private async handleWebhook(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
		const url = new URL(req.url || "/", `http://localhost:${this.config.port}`)

		// Check if this is the webhook endpoint
		if (url.pathname !== this.config.path) {
			res.writeHead(404, { "Content-Type": "text/plain" })
			res.end("Not Found")
			return
		}

		// Only accept POST requests
		if (req.method !== "POST") {
			res.writeHead(405, { "Content-Type": "text/plain" })
			res.end("Method Not Allowed")
			return
		}

		// Read the request body
		const body = await this.readBody(req)

		// Validate the webhook request
		const headers = this.extractHeaders(req)
		const validation = validateWebhookRequest(body, headers, this.config.secret)

		if (!validation.valid) {
			this.log(`Webhook validation failed: ${validation.error}`)
			res.writeHead(401, { "Content-Type": "text/plain" })
			res.end("Unauthorized")
			return
		}

		// Parse the payload
		let payload: unknown
		try {
			payload = JSON.parse(body)
		} catch (error) {
			this.log(`Failed to parse webhook payload: ${error}`)
			res.writeHead(400, { "Content-Type": "text/plain" })
			res.end("Bad Request: Invalid JSON")
			return
		}

		// Create the event object
		const event: GitHubEvent = {
			eventType: validation.eventType as GitHubEventType,
			action: (payload as Record<string, unknown>).action as string | undefined,
			deliveryId: validation.deliveryId!,
			repository: this.extractRepository(payload),
			sender: this.extractSender(payload),
			payload,
			timestamp: Date.now(),
		}

		// Dispatch to handlers
		try {
			await this.dispatchEvent(event)
			this.status.eventsProcessed++
			this.status.lastEventTime = Date.now()

			res.writeHead(200, { "Content-Type": "application/json" })
			res.end(JSON.stringify({ status: "ok", deliveryId: event.deliveryId }))
		} catch (error) {
			this.status.eventsFailed++
			this.log(`Error dispatching event: ${error}`)
			res.writeHead(500, { "Content-Type": "text/plain" })
			res.end("Internal Server Error")
		}
	}

	/**
	 * Read the request body as a string.
	 */
	private readBody(req: http.IncomingMessage): Promise<string> {
		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = []
			req.on("data", (chunk: Buffer) => chunks.push(chunk))
			req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
			req.on("error", reject)
		})
	}

	/**
	 * Extract relevant headers from the request.
	 */
	private extractHeaders(req: http.IncomingMessage): {
		"x-hub-signature-256"?: string
		"x-github-event"?: string
		"x-github-delivery"?: string
	} {
		return {
			"x-hub-signature-256": req.headers["x-hub-signature-256"] as string | undefined,
			"x-github-event": req.headers["x-github-event"] as string | undefined,
			"x-github-delivery": req.headers["x-github-delivery"] as string | undefined,
		}
	}

	/**
	 * Extract repository information from payload.
	 */
	private extractRepository(payload: unknown): GitHubEvent["repository"] {
		const p = payload as Record<string, unknown>
		const repo = p.repository as Record<string, unknown> | undefined

		if (!repo) {
			return {
				id: 0,
				name: "unknown",
				full_name: "unknown/unknown",
				owner: { login: "unknown" },
				html_url: "",
			}
		}

		return {
			id: repo.id as number,
			name: repo.name as string,
			full_name: repo.full_name as string,
			owner: {
				login: (repo.owner as Record<string, unknown>)?.login as string,
			},
			html_url: repo.html_url as string,
		}
	}

	/**
	 * Extract sender information from payload.
	 */
	private extractSender(payload: unknown): GitHubEvent["sender"] {
		const p = payload as Record<string, unknown>
		const sender = p.sender as Record<string, unknown> | undefined

		if (!sender) {
			return undefined
		}

		return {
			login: sender.login as string,
			id: sender.id as number,
			type: sender.type as string,
		}
	}

	/**
	 * Dispatch event to registered handlers.
	 */
	private async dispatchEvent(event: GitHubEvent): Promise<void> {
		const handlersToCall: RegisteredHandler[] = []

		// Get wildcard handlers
		const wildcardHandlers = this.handlers.get("*") || []
		handlersToCall.push(...wildcardHandlers)

		// Get event-specific handlers
		const specificHandlers = this.handlers.get(event.eventType) || []
		handlersToCall.push(...specificHandlers)

		// Sort by priority
		handlersToCall.sort((a, b) => (b.options?.priority ?? 0) - (a.options?.priority ?? 0))

		// Call each handler
		for (const registered of handlersToCall) {
			// Check action filter
			if (registered.options?.actions && event.action) {
				if (!registered.options.actions.includes(event.action)) {
					continue
				}
			}

			// Check repository filter
			if (registered.options?.repositories) {
				const repoFullName = event.repository.full_name
				if (!registered.options.repositories.includes(repoFullName)) {
					continue
				}
			}

			// Check sender filter
			if (registered.options?.senders && event.sender) {
				if (!registered.options.senders.includes(event.sender.login)) {
					continue
				}
			}

			try {
				await registered.handler(event)
			} catch (error) {
				this.log(`Handler '${registered.id}' failed: ${error}`)
				// Continue to next handler even if one fails
			}
		}
	}

	/**
	 * Get the total count of registered handlers.
	 */
	private getTotalHandlerCount(): number {
		let count = 0
		for (const handlers of this.handlers.values()) {
			count += handlers.length
		}
		return count
	}

	/**
	 * Get the current server status.
	 */
	getStatus(): WebhookServerStatus {
		return { ...this.status }
	}

	/**
	 * Check if the server is running.
	 */
	isRunning(): boolean {
		return this.status.running
	}

	/**
	 * Get the port the server is listening on.
	 */
	getPort(): number | null {
		return this.status.port
	}

	/**
	 * Log a message if verbose mode is enabled.
	 */
	private log(message: string): void {
		if (this.config.verbose) {
			console.log(`[WebhookServer] ${message}`)
		}
	}
}

/**
 * Create a new webhook server instance.
 *
 * @param config - Webhook configuration
 * @returns WebhookServer instance
 */
export function createWebhookServer(config: WebhookConfig): WebhookServer {
	return new WebhookServer(config)
}
