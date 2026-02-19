// kilocode_change - new file

import EventEmitter from "events"
import type {
	UsageMetrics,
	WasteDetectionOptions,
	Alert,
	WasteAlertType,
	AlertSeverity,
	TrackedOperation,
	ProgressIndicator,
	WasteReport,
	ErrorRecord,
	CostThresholds,
} from "./types"

/**
 * Default cost thresholds for waste detection
 */
const DEFAULT_THRESHOLDS: CostThresholds = {
	warn: 15000, // Warn at 15K tokens
	pause: 30000, // Pause at 30K tokens
	maxTaskBudget: 10, // $10 per task
	maxPhaseBudget: 5, // $5 per phase
}

/**
 * Default waste detection options
 */
const DEFAULT_OPTIONS: WasteDetectionOptions = {
	enabled: true,
	thresholds: DEFAULT_THRESHOLDS,
	loopDetection: true,
	loopThreshold: 3, // 3 repeated errors = loop
	loopWindowMs: 60000, // 1 minute window
	alertChannels: ["console"],
	currency: "USD",
}

/**
 * Waste detection events
 */
export interface WasteDetectorEvents {
	alert: [alert: Alert]
	pause: [reason: string, metrics: UsageMetrics]
	resume: []
	wasteDetected: [type: WasteAlertType, details: Record<string, unknown>]
}

/**
 * WasteDetector - Monitors token usage and detects inefficient patterns
 *
 * This class tracks token usage across operations and detects waste conditions
 * such as high token usage with no progress, repeated errors (loops), and
 * budget threshold violations.
 *
 * @example
 * ```typescript
 * const detector = new WasteDetector()
 *
 * // Track usage for an operation
 * detector.trackUsage('op-1', { inputTokens: 1000, outputTokens: 500, ... }, {
 *   toolCallsSuccess: 1,
 *   filesModified: 1,
 *   ...
 * })
 *
 * // Check for waste conditions
 * const alerts = detector.checkWaste()
 * if (detector.shouldPause()) {
 *   // Halt execution for review
 * }
 * ```
 */
export class WasteDetector extends EventEmitter<WasteDetectorEvents> {
	private options: WasteDetectionOptions
	private operations: Map<string, TrackedOperation> = new Map()
	private errorHistory: ErrorRecord[] = []
	private alerts: Alert[] = []
	private isPaused: boolean = false
	private alertCounter: number = 0

	constructor(options?: Partial<WasteDetectionOptions>) {
		super()
		this.options = { ...DEFAULT_OPTIONS, ...options }
	}

	/**
	 * Start tracking a new operation
	 */
	public startOperation(id: string, taskId: string, description: string, phase?: string): TrackedOperation {
		const operation: TrackedOperation = {
			id,
			taskId,
			phase,
			description,
			startTime: Date.now(),
			endTime: null,
			tokens: this.createEmptyMetrics(),
			progress: this.createEmptyProgress(),
			errors: [],
		}
		this.operations.set(id, operation)
		return operation
	}

	/**
	 * Track token usage for an operation
	 */
	public trackUsage(
		operationId: string,
		tokens: Partial<UsageMetrics>,
		progress?: Partial<ProgressIndicator>,
	): void {
		if (!this.options.enabled) return

		const operation = this.operations.get(operationId)
		if (!operation) {
			console.warn(`[WasteDetector] Operation not found: ${operationId}`)
			return
		}

		// Update token metrics
		operation.tokens = this.mergeMetrics(operation.tokens, tokens)
		operation.tokens.timestamp = Date.now()

		// Update progress if provided
		if (progress) {
			operation.progress = { ...operation.progress, ...progress }
			operation.progress.lastActivityTime = Date.now()
		}

		// Check for waste conditions after each update
		this.checkWaste()
	}

	/**
	 * Record an error for loop detection
	 */
	public recordError(operationId: string, error: Error): void {
		if (!this.options.enabled || !this.options.loopDetection) return

		const operation = this.operations.get(operationId)
		const errorRecord: ErrorRecord = {
			message: error.message,
			timestamp: Date.now(),
			operationId,
			stack: error.stack,
		}

		this.errorHistory.push(errorRecord)
		if (operation) {
			operation.errors.push(error.message)
			operation.progress.errorsCount++
		}

		// Prune old errors outside the window
		this.pruneErrorHistory()

		// Check for loops
		this.detectLoops()
	}

	/**
	 * End tracking for an operation
	 */
	public endOperation(operationId: string): TrackedOperation | undefined {
		const operation = this.operations.get(operationId)
		if (operation) {
			operation.endTime = Date.now()
			operation.tokens.duration = operation.endTime - operation.startTime
		}
		return operation
	}

	/**
	 * Check for waste conditions and generate alerts
	 */
	public checkWaste(): Alert[] {
		if (!this.options.enabled) return []

		const newAlerts: Alert[] = []

		for (const operation of this.operations.values()) {
			// Skip ended operations
			if (operation.endTime) continue

			// Check token thresholds
			const tokenAlert = this.checkTokenThresholds(operation)
			if (tokenAlert) newAlerts.push(tokenAlert)

			// Check for no progress
			const progressAlert = this.checkNoProgress(operation)
			if (progressAlert) newAlerts.push(progressAlert)
		}

		// Store and emit new alerts
		for (const alert of newAlerts) {
			this.alerts.push(alert)
			this.emit("alert", alert)
			this.emit("wasteDetected", alert.type, alert.context || {})
		}

		return newAlerts
	}

	/**
	 * Detect repeated error loops
	 */
	public detectLoops(): Alert | null {
		if (!this.options.enabled || !this.options.loopDetection) return null

		const { loopThreshold, loopWindowMs } = this.options
		const now = Date.now()
		const windowStart = now - loopWindowMs

		// Group errors by message within the window
		const errorCounts = new Map<string, number>()
		for (const error of this.errorHistory) {
			if (error.timestamp >= windowStart) {
				errorCounts.set(error.message, (errorCounts.get(error.message) || 0) + 1)
			}
		}

		// Check if any error exceeds the threshold
		for (const [message, count] of errorCounts) {
			if (count >= loopThreshold) {
				const alert = this.createAlert("loop_detected", "warning", `Repeated error detected (${count} times): ${message}`, {
					errorMessage: message,
					occurrences: count,
					windowMs: loopWindowMs,
				})

				this.alerts.push(alert)
				this.emit("alert", alert)
				this.emit("wasteDetected", "loop_detected", { message, count })

				return alert
			}
		}

		return null
	}

	/**
	 * Check if execution should be paused
	 */
	public shouldPause(): boolean {
		if (!this.options.enabled) return false
		if (this.isPaused) return true

		// Check if any operation exceeds pause threshold
		for (const operation of this.operations.values()) {
			if (operation.endTime) continue

			const totalTokens = operation.tokens.totalTokens
			if (totalTokens >= this.options.thresholds.pause) {
				// Check if there's been progress
				const hasProgress = this.hasProgress(operation)

				if (!hasProgress) {
					this.isPaused = true
					this.emit("pause", `Token threshold (${this.options.thresholds.pause}) exceeded with no progress`, operation.tokens)
					return true
				}
			}
		}

		return false
	}

	/**
	 * Resume execution after pause
	 */
	public resume(): void {
		if (this.isPaused) {
			this.isPaused = false
			this.emit("resume")
		}
	}

	/**
	 * Get current pause state
	 */
	public getPausedState(): boolean {
		return this.isPaused
	}

	/**
	 * Generate a comprehensive waste report
	 */
	public generateReport(taskId?: string): WasteReport {
		const relevantOps = taskId
			? Array.from(this.operations.values()).filter((op) => op.taskId === taskId)
			: Array.from(this.operations.values())

		const totalTokens = relevantOps.reduce((sum, op) => sum + op.tokens.totalTokens, 0)
		const totalCost = relevantOps.reduce((sum, op) => sum + op.tokens.cost, 0)
		const duration = relevantOps.reduce((sum, op) => {
			const opDuration = op.endTime ? op.endTime - op.startTime : Date.now() - op.startTime
			return sum + opDuration
		}, 0)

		const relevantAlerts = taskId ? this.alerts.filter((a) => a.taskId === taskId) : this.alerts

		// Calculate efficiency score (0-100)
		const efficiencyScore = this.calculateEfficiencyScore(relevantOps, relevantAlerts)

		// Generate recommendations
		const recommendations = this.generateRecommendations(relevantOps, relevantAlerts)

		// Token breakdown by operation
		const tokenBreakdown = relevantOps.map((op) => ({
			operation: op.description,
			tokens: op.tokens.totalTokens,
			cost: op.tokens.cost,
			percentage: totalTokens > 0 ? (op.tokens.totalTokens / totalTokens) * 100 : 0,
		}))

		return {
			timestamp: Date.now(),
			taskId: taskId || "all",
			totalTokens,
			totalCost,
			duration,
			alerts: relevantAlerts,
			efficiencyScore,
			recommendations,
			tokenBreakdown,
		}
	}

	/**
	 * Get all alerts
	 */
	public getAlerts(): Alert[] {
		return [...this.alerts]
	}

	/**
	 * Clear all tracking data
	 */
	public reset(): void {
		this.operations.clear()
		this.errorHistory = []
		this.alerts = []
		this.isPaused = false
		this.alertCounter = 0
	}

	/**
	 * Get current operation by ID
	 */
	public getOperation(id: string): TrackedOperation | undefined {
		return this.operations.get(id)
	}

	/**
	 * Get all active (non-ended) operations
	 */
	public getActiveOperations(): TrackedOperation[] {
		return Array.from(this.operations.values()).filter((op) => !op.endTime)
	}

	// Private helper methods

	private createEmptyMetrics(): UsageMetrics {
		return {
			inputTokens: 0,
			outputTokens: 0,
			totalTokens: 0,
			cacheReadTokens: 0,
			cacheWriteTokens: 0,
			cost: 0,
			timestamp: Date.now(),
			duration: 0,
		}
	}

	private createEmptyProgress(): ProgressIndicator {
		return {
			toolCallsSuccess: 0,
			toolCallsFailed: 0,
			filesModified: 0,
			filesCreated: 0,
			errorsCount: 0,
			lastActivityTime: Date.now(),
		}
	}

	private mergeMetrics(base: UsageMetrics, update: Partial<UsageMetrics>): UsageMetrics {
		const merged = { ...base }

		if (update.inputTokens !== undefined) merged.inputTokens += update.inputTokens
		if (update.outputTokens !== undefined) merged.outputTokens += update.outputTokens
		if (update.totalTokens !== undefined) merged.totalTokens += update.totalTokens
		if (update.cacheReadTokens !== undefined) merged.cacheReadTokens += update.cacheReadTokens
		if (update.cacheWriteTokens !== undefined) merged.cacheWriteTokens += update.cacheWriteTokens
		if (update.cost !== undefined) merged.cost += update.cost

		// Recalculate total if not provided
		if (update.totalTokens === undefined) {
			merged.totalTokens = merged.inputTokens + merged.outputTokens
		}

		return merged
	}

	private checkTokenThresholds(operation: TrackedOperation): Alert | null {
		const { thresholds } = this.options
		const totalTokens = operation.tokens.totalTokens

		if (totalTokens >= thresholds.pause) {
			return this.createAlert("high_token_usage", "critical", `Token usage (${totalTokens}) exceeded pause threshold (${thresholds.pause})`, {
				operationId: operation.id,
				totalTokens,
				threshold: thresholds.pause,
			})
		}

		if (totalTokens >= thresholds.warn) {
			return this.createAlert("high_token_usage", "warning", `Token usage (${totalTokens}) exceeded warning threshold (${thresholds.warn})`, {
				operationId: operation.id,
				totalTokens,
				threshold: thresholds.warn,
			})
		}

		return null
	}

	private checkNoProgress(operation: TrackedOperation): Alert | null {
		const { thresholds } = this.options
		const totalTokens = operation.tokens.totalTokens

		// Only check if above warning threshold
		if (totalTokens < thresholds.warn) return null

		const hasProgress = this.hasProgress(operation)
		if (!hasProgress) {
			return this.createAlert("no_progress", "error", `High token usage (${totalTokens}) with no measurable progress`, {
				operationId: operation.id,
				totalTokens,
				progress: operation.progress,
			})
		}

		return null
	}

	private hasProgress(operation: TrackedOperation): boolean {
		const { progress } = operation
		return (
			progress.toolCallsSuccess > 0 ||
			progress.filesModified > 0 ||
			progress.filesCreated > 0 ||
			(progress.toolCallsSuccess > progress.toolCallsFailed && progress.toolCallsSuccess > 0)
		)
	}

	private pruneErrorHistory(): void {
		const windowStart = Date.now() - this.options.loopWindowMs
		this.errorHistory = this.errorHistory.filter((e) => e.timestamp >= windowStart)
	}

	private createAlert(
		type: WasteAlertType,
		severity: AlertSeverity,
		message: string,
		context?: Record<string, unknown>,
	): Alert {
		return {
			id: `alert-${++this.alertCounter}`,
			type,
			severity,
			message,
			timestamp: Date.now(),
			context,
		}
	}

	private calculateEfficiencyScore(operations: TrackedOperation[], alerts: Alert[]): number {
		if (operations.length === 0) return 100

		// Base score
		let score = 100

		// Penalize for alerts
		const alertPenalty = alerts.reduce((sum, alert) => {
			switch (alert.severity) {
				case "critical":
					return sum + 25
				case "error":
					return sum + 15
				case "warning":
					return sum + 5
				default:
					return sum
			}
		}, 0)
		score -= Math.min(alertPenalty, 50) // Cap at 50 points

		// Reward for progress
		const totalProgress = operations.reduce((sum, op) => {
			return sum + op.progress.toolCallsSuccess + op.progress.filesModified + op.progress.filesCreated
		}, 0)
		const progressBonus = Math.min(totalProgress * 2, 20) // Up to 20 bonus points
		score += progressBonus

		// Penalize for errors
		const totalErrors = operations.reduce((sum, op) => sum + op.progress.errorsCount, 0)
		score -= Math.min(totalErrors * 5, 20) // Up to 20 penalty

		return Math.max(0, Math.min(100, score))
	}

	private generateRecommendations(operations: TrackedOperation[], alerts: Alert[]): string[] {
		const recommendations: string[] = []

		// Check for high token usage
		const highTokenOps = operations.filter((op) => op.tokens.totalTokens > this.options.thresholds.warn)
		if (highTokenOps.length > 0) {
			recommendations.push("Consider breaking down large operations into smaller tasks")
		}

		// Check for loop alerts
		const loopAlerts = alerts.filter((a) => a.type === "loop_detected")
		if (loopAlerts.length > 0) {
			recommendations.push("Review error handling to avoid repeated failures")
			recommendations.push("Consider adding retry logic with exponential backoff")
		}

		// Check for no progress
		const noProgressAlerts = alerts.filter((a) => a.type === "no_progress")
		if (noProgressAlerts.length > 0) {
			recommendations.push("Review task complexity and consider simplification")
			recommendations.push("Ensure tools are being used effectively")
		}

		// Check for high error rates
		const totalErrors = operations.reduce((sum, op) => sum + op.progress.errorsCount, 0)
		const totalCalls = operations.reduce((sum, op) => sum + op.progress.toolCallsSuccess + op.progress.toolCallsFailed, 0)
		if (totalCalls > 0 && totalErrors / totalCalls > 0.3) {
			recommendations.push("High error rate detected - review tool configurations")
		}

		return recommendations
	}
}
