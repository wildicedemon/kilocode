/**
 * AI Agentic Autonomous SDLC Framework - Type Definitions
 *
 * This module contains all TypeScript interfaces and types for the framework
 * configuration, SDLC phases, and state management.
 */

// =============================================================================
// FRAMEWORK METADATA
// =============================================================================

/**
 * Framework metadata and identification
 */
export interface FrameworkMetadata {
	/** Name of the framework */
	name: string
	/** Semantic version of the framework */
	version: string
	/** Description of the framework's purpose */
	description: string
}

// =============================================================================
// SDLC PHASE CONFIGURATION
// =============================================================================

/**
 * Valid SDLC phase names
 */
export type SdlcPhaseName = "research" | "planning" | "implementation" | "verification"

/**
 * Configuration for an SDLC phase
 */
export interface SdlcPhase {
	/** Enable this SDLC phase */
	enabled: boolean
	/** Maximum time in seconds for this phase before auto-termination */
	timeout: number
	/** Interval in seconds for saving state checkpoints */
	checkpoint_interval: number
}

/**
 * Implementation phase extends base SDLC phase with iteration limits
 */
export interface ImplementationPhase extends SdlcPhase {
	/** Maximum number of implementation iterations per task */
	max_iterations?: number
}

/**
 * Verification phase extends base SDLC phase with test coverage threshold
 */
export interface VerificationPhase extends SdlcPhase {
	/** Minimum required test coverage percentage */
	test_coverage_threshold?: number
}

/**
 * Software Development Lifecycle phases configuration
 */
export interface SdlcConfig {
	/** Research phase: Requirements gathering, context analysis, and documentation review */
	research: SdlcPhase
	/** Planning phase: Architecture design, task decomposition, and strategy formulation */
	planning: SdlcPhase
	/** Implementation phase: Code writing, refactoring, and actual development work */
	implementation: ImplementationPhase
	/** Verification phase: Testing, validation, quality assurance, and coverage analysis */
	verification: VerificationPhase
}

// =============================================================================
// SCANNER CONFIGURATION
// =============================================================================

/**
 * Analysis pass types for code scanning
 */
export type ScannerPass = "anti-patterns" | "architecture" | "performance" | "security"

/**
 * Code scanner configuration for continuous code analysis
 */
export interface ScannerConfig {
	/** Enable the code scanner */
	enabled: boolean
	/** Analysis passes to execute during scanning */
	passes: ScannerPass[]
	/** Enable continuous scanning during implementation */
	continuous: boolean
	/** Path to scanner state persistence file */
	state_file: string
	/** Path to known issues database file */
	repertoire_file: string
	/** MCP servers to use for enhanced code analysis */
	mcp_servers: string[]
}

// =============================================================================
// WASTE DETECTION CONFIGURATION
// =============================================================================

/**
 * Alert channels for waste detection notifications
 */
export type WasteAlertChannel = "console" | "langfuse" | "webhook" | "email"

/**
 * Token usage thresholds for alerts and intervention
 */
export interface TokenThresholds {
	/** Warning threshold - log notification */
	warn: number
	/** Pause threshold - halt execution for review */
	pause: number
}

/**
 * Waste detection configuration for monitoring token usage and inefficient patterns
 */
export interface WasteDetectionConfig {
	/** Enable waste detection */
	enabled: boolean
	/** Token usage thresholds for alerts and intervention */
	token_thresholds: TokenThresholds
	/** Detect and alert on repetitive patterns */
	loop_detection: boolean
	/** Alert channels for waste detection notifications */
	alert_channels: WasteAlertChannel[]
}

// =============================================================================
// COST OVERSIGHT CONFIGURATION
// =============================================================================

/**
 * Supported currencies for budget tracking
 */
export type BudgetCurrency = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD"

/**
 * Cost oversight configuration for tracking API usage costs and enforcing budget limits
 */
export interface CostOversightConfig {
	/** Enable cost oversight */
	enabled: boolean
	/** Maximum cost per individual task in the specified currency */
	budget_per_task: number
	/** Maximum cost per SDLC phase in the specified currency */
	budget_per_phase: number
	/** Currency for budget tracking */
	currency: BudgetCurrency
	/** Enable Langfuse cost tracking integration */
	langfuse_integration: boolean
}

// =============================================================================
// WEBHOOKS CONFIGURATION
// =============================================================================

/**
 * GitHub event types for webhook subscriptions
 */
export type GithubEvent = "issues" | "pull_request" | "workflow_run" | "push" | "release" | "create" | "delete"

/**
 * GitHub webhook integration configuration
 */
export interface GithubWebhookConfig {
	/** Enable GitHub webhook integration */
	enabled: boolean
	/**
	 * GitHub webhook secret for HMAC verification.
	 * Can be an environment variable reference like ${GITHUB_WEBHOOK_SECRET}
	 */
	secret: string
	/** GitHub events to subscribe to */
	events: GithubEvent[]
}

/**
 * Webhook configuration for external integrations
 */
export interface WebhooksConfig {
	/** Enable webhook server */
	enabled: boolean
	/** HTTP server port for webhook listener */
	port: number
	/** GitHub webhook integration configuration */
	github: GithubWebhookConfig
}

// =============================================================================
// BOOTSTRAP CONFIGURATION
// =============================================================================

/**
 * Configuration for an MCP server
 */
export interface McpServerConfig {
	/** Enable this MCP server */
	enabled: boolean
	/** NPM package name for the MCP server */
	package: string
	/** Additional properties for MCP server configuration */
	[key: string]: unknown
}

/**
 * Bootstrap configuration for initialization behavior and MCP server setup
 */
export interface BootstrapConfig {
	/** Automatically check for framework updates on startup */
	auto_check_updates: boolean
	/** MCP servers to initialize on startup */
	mcp_servers: {
		"codegraph-context": McpServerConfig
		"rag-memory": McpServerConfig
		"taskmaster": McpServerConfig
		[key: string]: McpServerConfig
	}
}

// =============================================================================
// MODES CONFIGURATION
// =============================================================================

/**
 * Configuration for an AI mode
 */
export interface ModeConfig {
	/** Enable this mode */
	enabled: boolean
	/** Path to the mode configuration file */
	config: string
	/** Additional properties for mode configuration */
	[key: string]: unknown
}

/**
 * AI mode configurations for specialized personas
 */
export interface ModesConfig {
	/** Workflow coordination mode for managing SDLC phases */
	orchestrator: ModeConfig
	/** Requirements analysis and specification mode */
	requirements: ModeConfig
	/** Deep codebase analysis mode */
	scanner: ModeConfig
	/** Code review and quality assurance mode */
	review: ModeConfig
	/** Additional custom modes */
	[key: string]: ModeConfig
}

// =============================================================================
// VOICE CONFIGURATION
// =============================================================================

/**
 * PersonaPlex AI voice personas configuration
 */
export interface PersonaPlexConfig {
	/** Enable PersonaPlex voice personas */
	enabled: boolean
	/** Path to PersonaPlex personas configuration file */
	config_path: string
}

/**
 * Voice settings for audio input/output and persona-based voice synthesis
 */
export interface VoiceConfig {
	/** Enable voice features */
	enabled: boolean
	/** PersonaPlex AI voice personas configuration */
	personaPlex: PersonaPlexConfig
}

// =============================================================================
// LOGGING CONFIGURATION
// =============================================================================

/**
 * Log levels for filtering log messages
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal"

/**
 * Log rotation strategies
 */
export type LogRotation = "daily" | "hourly" | "size" | "none"

/**
 * Logging configuration for diagnostic output and audit trail generation
 */
export interface LoggingConfig {
	/** Log level for filtering log messages */
	level: LogLevel
	/**
	 * Directory path for log files or 'console' for stdout only
	 */
	output: string
	/** Log rotation strategy */
	rotation: LogRotation
}

// =============================================================================
// FRAMEWORK CONFIGURATION
// =============================================================================

/**
 * Complete framework configuration
 */
export interface FrameworkConfig {
	/** Framework metadata and identification */
	framework: FrameworkMetadata
	/** Software Development Lifecycle phases configuration */
	sdlc: SdlcConfig
	/** Code scanner configuration for continuous code analysis */
	scanner: ScannerConfig
	/** Waste detection configuration for monitoring token usage and inefficient patterns */
	waste_detection: WasteDetectionConfig
	/** Cost oversight configuration for tracking API usage costs and enforcing budget limits */
	cost_oversight: CostOversightConfig
	/** Webhook configuration for external integrations */
	webhooks: WebhooksConfig
	/** Bootstrap configuration for initialization behavior and MCP server setup */
	bootstrap: BootstrapConfig
	/** AI mode configurations for specialized personas */
	modes: ModesConfig
	/** Voice settings for audio input/output and persona-based voice synthesis */
	voice: VoiceConfig
	/** Logging configuration for diagnostic output and audit trail generation */
	logging: LoggingConfig
}

// =============================================================================
// SDLC STATE MANAGEMENT
// =============================================================================

/**
 * Valid task states
 */
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "cancelled"

/**
 * State information for an individual task
 */
export interface TaskState {
	/** Unique task identifier */
	id: string
	/** Task name or description */
	name: string
	/** Current task status */
	status: TaskStatus
	/** Timestamp when task was created */
	created_at: string
	/** Timestamp when task was last updated */
	updated_at: string
	/** Timestamp when task was completed (if applicable) */
	completed_at?: string
	/** Error message if task failed */
	error?: string
	/** Additional task metadata */
	metadata?: Record<string, unknown>
}

/**
 * State information for an SDLC phase
 */
export interface PhaseState {
	/** Phase name */
	name: SdlcPhaseName
	/** Whether the phase is currently active */
	active: boolean
	/** Timestamp when phase started */
	started_at?: string
	/** Timestamp when phase completed */
	completed_at?: string
	/** Tasks within this phase */
	tasks: TaskState[]
	/** Current checkpoint identifier */
	current_checkpoint?: string
}

/**
 * Complete SDLC state
 */
export interface SdlcState {
	/** Framework version that created this state */
	framework_version: string
	/** Timestamp when state was created */
	created_at: string
	/** Timestamp when state was last updated */
	updated_at: string
	/** Current active phase */
	current_phase: SdlcPhaseName | null
	/** State for all SDLC phases */
	phases: Record<SdlcPhaseName, PhaseState>
	/** Global checkpoint counter */
	checkpoint_count: number
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Configuration loading options
 */
export interface ConfigLoadOptions {
	/** Path to configuration file (overrides default locations) */
	configPath?: string
	/** Skip environment variable substitution */
	skipEnvSubstitution?: boolean
	/** Skip schema validation */
	skipValidation?: boolean
}

/**
 * Configuration loading error
 */
export class FrameworkConfigError extends Error {
	override cause?: Error

	constructor(message: string, cause?: Error) {
		super(message)
		this.name = "FrameworkConfigError"
		this.cause = cause
	}
}

/**
 * State management error
 */
export class StateManagerError extends Error {
	override cause?: Error

	constructor(message: string, cause?: Error) {
		super(message)
		this.name = "StateManagerError"
		this.cause = cause
	}
}

/**
 * Checkpoint information
 */
export interface CheckpointInfo {
	/** Checkpoint identifier */
	id: string
	/** Timestamp when checkpoint was created */
	created_at: string
	/** Phase that was active when checkpoint was created */
	phase: SdlcPhaseName
	/** Description of checkpoint */
	description?: string
}
