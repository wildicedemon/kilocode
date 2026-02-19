// kilocode_change - new file

import type {
	LangfuseConfig,
	LangfuseTraceEvent,
	LangfuseSpanConfig,
	UsageMetrics,
} from "./types"

/**
 * Langfuse client state
 */
interface LangfuseState {
	initialized: boolean
	config: LangfuseConfig | null
	pendingEvents: LangfuseTraceEvent[]
	flushTimer: ReturnType<typeof setInterval> | null
}

/**
 * LangfuseClient - Integration with Langfuse for LLM observability
 *
 * This class provides a lightweight client for sending trace events to Langfuse.
 * It handles:
 * - Connection initialization
 * - Event batching and flushing
 * - Error handling for connection issues
 * - Span creation for hierarchical tracing
 *
 * @example
 * ```typescript
 * const client = new LangfuseClient()
 *
 * // Initialize with config
 * client.initialize({
 *   publicKey: 'pk-xxx',
 *   secretKey: 'sk-xxx',
 *   enabled: true,
 * })
 *
 * // Send trace event
 * client.trace({
 *   traceId: 'trace-1',
 *   name: 'completion',
 *   input: { prompt: 'Hello' },
 *   output: { text: 'Hi there!' },
 *   usage: { inputTokens: 10, outputTokens: 5 },
 *   model: 'claude-3-5-sonnet',
 * })
 *
 * // Flush pending events
 * await client.flush()
 * ```
 */
export class LangfuseClient {
	private state: LangfuseState = {
		initialized: false,
		config: null,
		pendingEvents: [],
		flushTimer: null,
	}

	// Active spans for hierarchical tracing
	private activeSpans: Map<string, { startTime: number; config: LangfuseSpanConfig }> = new Map()

	// Counter for generating unique IDs
	private idCounter: number = 0

	/**
	 * Initialize the Langfuse client
	 */
	public initialize(config: LangfuseConfig): boolean {
		if (this.state.initialized) {
			console.warn("[LangfuseClient] Already initialized")
			return true
		}

		// Validate required config
		if (!config.publicKey || !config.secretKey) {
			console.error("[LangfuseClient] Missing required configuration: publicKey and secretKey")
			return false
		}

		this.state.config = config
		this.state.initialized = true

		// Set up automatic flush interval if configured
		if (config.flushInterval && config.flushInterval > 0) {
			this.state.flushTimer = setInterval(() => {
				this.flush().catch((err) => {
					console.error("[LangfuseClient] Auto-flush error:", err)
				})
			}, config.flushInterval)
		}

		console.log("[LangfuseClient] Initialized successfully")
		return true
	}

	/**
	 * Check if client is initialized and enabled
	 */
	public isEnabled(): boolean {
		return this.state.initialized && (this.state.config?.enabled ?? false)
	}

	/**
	 * Send a trace event to Langfuse
	 */
	public trace(event: LangfuseTraceEvent): boolean {
		if (!this.isEnabled()) {
			return false
		}

		// Add timestamp if not provided
		const enrichedEvent: LangfuseTraceEvent = {
			...event,
			timestamp: event.timestamp ?? Date.now(),
		}

		// Add to pending events
		this.state.pendingEvents.push(enrichedEvent)

		// Check if we should flush based on batch size
		const batchSize = this.state.config?.batchSize ?? 10
		if (this.state.pendingEvents.length >= batchSize) {
			this.flush().catch((err) => {
				console.error("[LangfuseClient] Flush error:", err)
			})
		}

		return true
	}

	/**
	 * Create a span for hierarchical tracing
	 */
	public span(config: LangfuseSpanConfig): string {
		if (!this.isEnabled()) {
			return ""
		}

		const spanId = `span-${++this.idCounter}-${Date.now()}`
		const startTime = config.startTime ?? Date.now()

		this.activeSpans.set(spanId, {
			startTime,
			config,
		})

		// Create span start event
		this.trace({
			traceId: spanId,
			spanId: spanId,
			name: config.name,
			timestamp: startTime,
			input: config.input,
			metadata: {
				...config.metadata,
				spanStart: true,
				parentSpanId: config.parentSpanId,
			},
		})

		return spanId
	}

	/**
	 * End a span and record its output
	 */
	public endSpan(spanId: string, output?: unknown, usage?: Partial<UsageMetrics>): void {
		if (!this.isEnabled()) return

		const span = this.activeSpans.get(spanId)
		if (!span) {
			console.warn(`[LangfuseClient] Span not found: ${spanId}`)
			return
		}

		const endTime = Date.now()
		const duration = endTime - span.startTime

		// Create span end event
		this.trace({
			traceId: spanId,
			spanId: spanId,
			name: span.config.name,
			timestamp: endTime,
			output,
			usage,
			metadata: {
				...span.config.metadata,
				spanEnd: true,
				durationMs: duration,
			},
		})

		// Remove from active spans
		this.activeSpans.delete(spanId)
	}

	/**
	 * Flush all pending events to Langfuse
	 */
	public async flush(): Promise<void> {
		if (!this.isEnabled()) return
		if (this.state.pendingEvents.length === 0) return

		const events = [...this.state.pendingEvents]
		this.state.pendingEvents = []

		try {
			await this.sendEvents(events)
		} catch (error) {
			// Re-add events to pending on failure
			this.state.pendingEvents.unshift(...events)
			throw error
		}
	}

	/**
	 * Shutdown the client and flush remaining events
	 */
	public async shutdown(): Promise<void> {
		// Clear flush timer
		if (this.state.flushTimer) {
			clearInterval(this.state.flushTimer)
			this.state.flushTimer = null
		}

		// Flush remaining events
		await this.flush()

		// Reset state
		this.state.initialized = false
		this.state.config = null
		this.activeSpans.clear()
	}

	/**
	 * Get the number of pending events
	 */
	public getPendingCount(): number {
		return this.state.pendingEvents.length
	}

	/**
	 * Get current configuration
	 */
	public getConfig(): LangfuseConfig | null {
		return this.state.config
	}

	// Private methods

	/**
	 * Send events to Langfuse API
	 * Note: This is a simplified implementation. In production, you would use
	 * the official Langfuse SDK or implement proper API calls.
	 */
	private async sendEvents(events: LangfuseTraceEvent[]): Promise<void> {
		if (!this.state.config) return

		const { publicKey, secretKey, baseUrl } = this.state.config
		const apiBaseUrl = baseUrl ?? "https://cloud.langfuse.com"

		try {
			// In a real implementation, this would use the Langfuse SDK
			// For now, we'll log and simulate the API call
			// Note: In production, implement actual HTTP requests to Langfuse API
			console.log(`[LangfuseClient] Sending ${events.length} events to ${apiBaseUrl}`)

			// Simulate API call - in production, use actual HTTP request
			// The actual implementation would use fetch or the Langfuse SDK:
			//
			// const response = await fetch(`${apiBaseUrl}/api/public/ingestion`, {
			//   method: 'POST',
			//   headers: {
			//     'Content-Type': 'application/json',
			//     'Authorization': `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`,
			//   },
			//   body: JSON.stringify({ batch: events }),
			// })
			//
			// if (!response.ok) {
			//   throw new Error(`Langfuse API error: ${response.status}`)
			// }

			// For now, just simulate success
			await Promise.resolve()
		} catch (error) {
			console.error("[LangfuseClient] Failed to send events:", error)

			// Re-throw to allow caller to handle
			if (error instanceof Error) {
				throw new Error(`Langfuse API error: ${error.message}`)
			}
			throw error
		}
	}
}

/**
 * Singleton instance for convenience
 */
let defaultClient: LangfuseClient | null = null

/**
 * Get the default Langfuse client instance
 */
export function getLangfuseClient(): LangfuseClient {
	if (!defaultClient) {
		defaultClient = new LangfuseClient()
	}
	return defaultClient
}

/**
 * Initialize the default Langfuse client
 */
export function initializeLangfuse(config: LangfuseConfig): boolean {
	return getLangfuseClient().initialize(config)
}
