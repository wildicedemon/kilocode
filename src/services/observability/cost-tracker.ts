// kilocode_change - new file

import type { BudgetCurrency } from "../framework/types"
import type {
	UsageMetrics,
	TaskCostRecord,
	ModelPricing,
} from "./types"

/**
 * Default model pricing (per 1M tokens)
 * Prices are in USD
 */
const DEFAULT_MODEL_PRICING: Map<string, ModelPricing> = new Map([
	// Anthropic models
	[
		"claude-3-5-sonnet",
		{
			modelId: "claude-3-5-sonnet",
			inputCostPerMillion: 3.0,
			outputCostPerMillion: 15.0,
			cacheReadCostPerMillion: 0.3,
			cacheWriteCostPerMillion: 3.75,
		},
	],
	[
		"claude-3-5-haiku",
		{
			modelId: "claude-3-5-haiku",
			inputCostPerMillion: 0.8,
			outputCostPerMillion: 4.0,
			cacheReadCostPerMillion: 0.08,
			cacheWriteCostPerMillion: 1.0,
		},
	],
	[
		"claude-3-opus",
		{
			modelId: "claude-3-opus",
			inputCostPerMillion: 15.0,
			outputCostPerMillion: 75.0,
			cacheReadCostPerMillion: 1.5,
			cacheWriteCostPerMillion: 18.75,
		},
	],
	// OpenAI models
	[
		"gpt-4o",
		{
			modelId: "gpt-4o",
			inputCostPerMillion: 2.5,
			outputCostPerMillion: 10.0,
			cacheReadCostPerMillion: 1.25,
		},
	],
	[
		"gpt-4o-mini",
		{
			modelId: "gpt-4o-mini",
			inputCostPerMillion: 0.15,
			outputCostPerMillion: 0.6,
			cacheReadCostPerMillion: 0.075,
		},
	],
	[
		"gpt-4-turbo",
		{
			modelId: "gpt-4-turbo",
			inputCostPerMillion: 10.0,
			outputCostPerMillion: 30.0,
		},
	],
	// DeepSeek models
	[
		"deepseek-chat",
		{
			modelId: "deepseek-chat",
			inputCostPerMillion: 0.14,
			outputCostPerMillion: 0.28,
			cacheReadCostPerMillion: 0.014,
		},
	],
	[
		"deepseek-reasoner",
		{
			modelId: "deepseek-reasoner",
			inputCostPerMillion: 0.55,
			outputCostPerMillion: 2.19,
			cacheReadCostPerMillion: 0.14,
		},
	],
])

/**
 * Currency conversion rates (relative to USD)
 */
const CURRENCY_RATES: Record<BudgetCurrency, number> = {
	USD: 1.0,
	EUR: 0.92,
	GBP: 0.79,
	JPY: 149.5,
	CAD: 1.36,
	AUD: 1.53,
}

/**
 * CostTracker - Tracks API usage costs per task and phase
 *
 * This class provides cost tracking functionality including:
 * - Per-task cost accumulation
 * - Phase-based cost breakdown
 * - Model-specific pricing
 * - Budget enforcement
 *
 * @example
 * ```typescript
 * const tracker = new CostTracker()
 *
 * // Start tracking a task
 * tracker.startTask('task-1', 'Implement feature X', 10.0, 'USD')
 *
 * // Record usage
 * tracker.recordUsage('task-1', {
 *   inputTokens: 1000,
 *   outputTokens: 500,
 *   cacheReadTokens: 200,
 * }, 'claude-3-5-sonnet')
 *
 * // Check budget
 * const cost = tracker.getTaskCost('task-1')
 * const withinBudget = tracker.checkBudget('task-1')
 * ```
 */
export class CostTracker {
	private tasks: Map<string, TaskCostRecord> = new Map()
	private modelPricing: Map<string, ModelPricing>
	private defaultCurrency: BudgetCurrency = "USD"

	constructor(customPricing?: Map<string, ModelPricing>) {
		this.modelPricing = customPricing || DEFAULT_MODEL_PRICING
	}

	/**
	 * Start tracking a new task
	 */
	public startTask(
		taskId: string,
		description?: string,
		budgetLimit?: number,
		currency?: BudgetCurrency,
	): TaskCostRecord {
		const record: TaskCostRecord = {
			taskId,
			description,
			startTime: Date.now(),
			endTime: null,
			totalUsage: this.createEmptyMetrics(),
			modelUsage: new Map(),
			phaseUsage: new Map(),
			budgetLimit: budgetLimit ?? 10.0,
			currency: currency ?? this.defaultCurrency,
		}

		this.tasks.set(taskId, record)
		return record
	}

	/**
	 * Record token usage for a task
	 */
	public recordUsage(
		taskId: string,
		tokens: {
			inputTokens: number
			outputTokens: number
			cacheReadTokens?: number
			cacheWriteTokens?: number
		},
		model: string,
		phase?: string,
	): UsageMetrics {
		const task = this.tasks.get(taskId)
		if (!task) {
			throw new Error(`Task not found: ${taskId}`)
		}

		// Calculate cost
		const cost = this.calculateCost(tokens, model)

		// Create usage metrics
		const usage: UsageMetrics = {
			inputTokens: tokens.inputTokens,
			outputTokens: tokens.outputTokens,
			totalTokens: tokens.inputTokens + tokens.outputTokens,
			cacheReadTokens: tokens.cacheReadTokens ?? 0,
			cacheWriteTokens: tokens.cacheWriteTokens ?? 0,
			cost,
			timestamp: Date.now(),
			duration: 0,
		}

		// Update total usage
		task.totalUsage = this.mergeMetrics(task.totalUsage, usage)

		// Update model usage
		const modelUsage = task.modelUsage.get(model) || this.createEmptyMetrics()
		task.modelUsage.set(model, this.mergeMetrics(modelUsage, usage))

		// Update phase usage if provided
		if (phase) {
			const phaseUsage = task.phaseUsage.get(phase) || this.createEmptyMetrics()
			task.phaseUsage.set(phase, this.mergeMetrics(phaseUsage, usage))
		}

		return task.totalUsage
	}

	/**
	 * End task tracking
	 */
	public endTask(taskId: string): TaskCostRecord | undefined {
		const task = this.tasks.get(taskId)
		if (task) {
			task.endTime = Date.now()
			task.totalUsage.duration = task.endTime - task.startTime
		}
		return task
	}

	/**
	 * Get cost for a specific task
	 */
	public getTaskCost(taskId: string): number {
		const task = this.tasks.get(taskId)
		if (!task) return 0
		return this.convertCurrency(task.totalUsage.cost, "USD", task.currency)
	}

	/**
	 * Get usage metrics for a specific task
	 */
	public getTaskUsage(taskId: string): UsageMetrics | undefined {
		const task = this.tasks.get(taskId)
		return task?.totalUsage
	}

	/**
	 * Get cost for a specific phase within a task
	 */
	public getPhaseCost(taskId: string, phase: string): number {
		const task = this.tasks.get(taskId)
		if (!task) return 0

		const phaseUsage = task.phaseUsage.get(phase)
		if (!phaseUsage) return 0

		return this.convertCurrency(phaseUsage.cost, "USD", task.currency)
	}

	/**
	 * Get usage metrics for a specific phase
	 */
	public getPhaseUsage(taskId: string, phase: string): UsageMetrics | undefined {
		const task = this.tasks.get(taskId)
		if (!task) return undefined
		return task.phaseUsage.get(phase)
	}

	/**
	 * Check if task is within budget
	 */
	public checkBudget(taskId: string): {
		withinBudget: boolean
		currentCost: number
		budgetLimit: number
		remaining: number
		percentageUsed: number
	} {
		const task = this.tasks.get(taskId)
		if (!task) {
			return {
				withinBudget: false,
				currentCost: 0,
				budgetLimit: 0,
				remaining: 0,
				percentageUsed: 0,
			}
		}

		const currentCost = this.getTaskCost(taskId)
		const withinBudget = currentCost <= task.budgetLimit
		const remaining = Math.max(0, task.budgetLimit - currentCost)
		const percentageUsed = task.budgetLimit > 0 ? (currentCost / task.budgetLimit) * 100 : 0

		return {
			withinBudget,
			currentCost,
			budgetLimit: task.budgetLimit,
			remaining,
			percentageUsed,
		}
	}

	/**
	 * Get cost breakdown by model for a task
	 */
	public getModelBreakdown(taskId: string): Array<{ model: string; cost: number; tokens: number }> {
		const task = this.tasks.get(taskId)
		if (!task) return []

		const breakdown: Array<{ model: string; cost: number; tokens: number }> = []

		for (const [model, usage] of task.modelUsage) {
			breakdown.push({
				model,
				cost: this.convertCurrency(usage.cost, "USD", task.currency),
				tokens: usage.totalTokens,
			})
		}

		return breakdown.sort((a, b) => b.cost - a.cost)
	}

	/**
	 * Get all active tasks
	 */
	public getActiveTasks(): TaskCostRecord[] {
		return Array.from(this.tasks.values()).filter((t) => t.endTime === null)
	}

	/**
	 * Get all completed tasks
	 */
	public getCompletedTasks(): TaskCostRecord[] {
		return Array.from(this.tasks.values()).filter((t) => t.endTime !== null)
	}

	/**
	 * Get total cost across all tasks
	 */
	public getTotalCost(currency?: BudgetCurrency): number {
		let totalCost = 0
		for (const task of this.tasks.values()) {
			totalCost += task.totalUsage.cost
		}
		return this.convertCurrency(totalCost, "USD", currency ?? this.defaultCurrency)
	}

	/**
	 * Clear a specific task
	 */
	public clearTask(taskId: string): boolean {
		return this.tasks.delete(taskId)
	}

	/**
	 * Clear all tasks
	 */
	public clearAll(): void {
		this.tasks.clear()
	}

	/**
	 * Add or update model pricing
	 */
	public setModelPricing(pricing: ModelPricing): void {
		this.modelPricing.set(pricing.modelId, pricing)
	}

	/**
	 * Get model pricing
	 */
	public getModelPricing(modelId: string): ModelPricing | undefined {
		return this.modelPricing.get(modelId)
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

	private mergeMetrics(base: UsageMetrics, update: UsageMetrics): UsageMetrics {
		return {
			inputTokens: base.inputTokens + update.inputTokens,
			outputTokens: base.outputTokens + update.outputTokens,
			totalTokens: base.totalTokens + update.totalTokens,
			cacheReadTokens: base.cacheReadTokens + update.cacheReadTokens,
			cacheWriteTokens: base.cacheWriteTokens + update.cacheWriteTokens,
			cost: base.cost + update.cost,
			timestamp: update.timestamp,
			duration: base.duration + update.duration,
		}
	}

	private calculateCost(
		tokens: {
			inputTokens: number
			outputTokens: number
			cacheReadTokens?: number
			cacheWriteTokens?: number
		},
		model: string,
	): number {
		// Find pricing - try exact match first, then partial match
		let pricing = this.modelPricing.get(model)

		if (!pricing) {
			// Try partial match (e.g., "claude-3-5-sonnet-20241022" -> "claude-3-5-sonnet")
			for (const [key, value] of this.modelPricing) {
				if (model.startsWith(key) || key.startsWith(model)) {
					pricing = value
					break
				}
			}
		}

		if (!pricing) {
			// Default pricing if model not found (conservative estimate)
			console.warn(`[CostTracker] No pricing found for model: ${model}, using defaults`)
			pricing = {
				modelId: model,
				inputCostPerMillion: 1.0,
				outputCostPerMillion: 3.0,
			}
		}

		// Calculate costs
		const inputCost = (tokens.inputTokens / 1_000_000) * pricing.inputCostPerMillion
		const outputCost = (tokens.outputTokens / 1_000_000) * pricing.outputCostPerMillion
		const cacheReadCost = tokens.cacheReadTokens
			? (tokens.cacheReadTokens / 1_000_000) * (pricing.cacheReadCostPerMillion ?? 0)
			: 0
		const cacheWriteCost = tokens.cacheWriteTokens
			? (tokens.cacheWriteTokens / 1_000_000) * (pricing.cacheWriteCostPerMillion ?? 0)
			: 0

		return inputCost + outputCost + cacheReadCost + cacheWriteCost
	}

	private convertCurrency(amount: number, from: BudgetCurrency, to: BudgetCurrency): number {
		if (from === to) return amount

		// Convert to USD first, then to target currency
		const usdAmount = amount / CURRENCY_RATES[from]
		return usdAmount * CURRENCY_RATES[to]
	}
}
