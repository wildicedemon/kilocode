// kilocode_change - new file

/**
 * Observability Module - Waste Detection and Cost Oversight
 *
 * This module provides comprehensive monitoring and cost tracking for AI operations:
 *
 * - **WasteDetector**: Monitors token usage and detects inefficient patterns
 *   - Token threshold alerts (warn/pause)
 *   - Loop detection for repeated errors
 *   - Progress tracking
 *   - Waste reports with recommendations
 *
 * - **CostTracker**: Tracks API usage costs per task and phase
 *   - Per-task cost accumulation
 *   - Phase-based cost breakdown
 *   - Model-specific pricing
 *   - Budget enforcement
 *
 * - **LangfuseClient**: Integration with Langfuse for LLM observability
 *   - Trace event submission
 *   - Hierarchical span creation
 *   - Event batching and flushing
 *
 * @example
 * ```typescript
 * import { WasteDetector, CostTracker, LangfuseClient } from './services/observability'
 *
 * // Waste detection
 * const detector = new WasteDetector()
 * detector.startOperation('op-1', 'task-1', 'Generate code')
 * detector.trackUsage('op-1', { inputTokens: 1000, outputTokens: 500 })
 *
 * // Cost tracking
 * const tracker = new CostTracker()
 * tracker.startTask('task-1', 'Implement feature', 10.0)
 * tracker.recordUsage('task-1', { inputTokens: 1000, outputTokens: 500 }, 'claude-3-5-sonnet')
 *
 * // Langfuse integration
 * const langfuse = new LangfuseClient()
 * langfuse.initialize({ publicKey: 'pk-xxx', secretKey: 'sk-xxx', enabled: true })
 * langfuse.trace({ traceId: 'trace-1', name: 'completion', ... })
 * ```
 */

// Types
export type {
	UsageMetrics,
	WasteDetectionOptions,
	CostThresholds,
	Alert,
	WasteAlertType,
	AlertSeverity,
	TrackedOperation,
	ProgressIndicator,
	WasteReport,
	ErrorRecord,
	TaskCostRecord,
	ModelPricing,
	LangfuseConfig,
	LangfuseTraceEvent,
	LangfuseSpanConfig,
} from "./types"

// Classes
export { WasteDetector, type WasteDetectorEvents } from "./waste-detector"
export { CostTracker } from "./cost-tracker"
export { LangfuseClient, getLangfuseClient, initializeLangfuse } from "./langfuse-client"
