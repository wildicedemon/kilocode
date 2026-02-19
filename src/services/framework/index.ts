/**
 * AI Agentic Autonomous SDLC Framework
 *
 * This module provides the core functionality for managing an autonomous
 * software development lifecycle, including:
 *
 * - Configuration management with hierarchical loading
 * - SDLC phase state management
 * - Task tracking and checkpoint management
 * - Environment variable substitution
 * - JSON schema validation
 *
 * @example
 * ```typescript
 * import {
 *   loadConfig,
 *   SdlcStateManager,
 *   type FrameworkConfig,
 *   type SdlcState,
 * } from "@kilocode/framework"
 *
 * // Load configuration
 * const config = await loadConfig()
 *
 * // Initialize state manager
 * const stateManager = new SdlcStateManager()
 * await stateManager.initialize()
 *
 * // Transition to a phase
 * await stateManager.transitionTo("planning")
 *
 * // Add a task
 * const task = await stateManager.addTask("planning", "Design API schema")
 *
 * // Create checkpoint
 * const checkpoint = await stateManager.createCheckpoint("API design complete")
 * ```
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Framework metadata types
export type { FrameworkMetadata } from "./types"

// SDLC phase types
export type {
	SdlcPhaseName,
	SdlcPhase,
	ImplementationPhase,
	VerificationPhase,
	SdlcConfig,
} from "./types"

// Scanner types
export type { ScannerConfig, ScannerPass } from "./types"

// Waste detection types
export type {
	WasteDetectionConfig,
	WasteAlertChannel,
	TokenThresholds,
} from "./types"

// Cost oversight types
export type { CostOversightConfig, BudgetCurrency } from "./types"

// Webhook types
export type {
	WebhooksConfig,
	GithubWebhookConfig,
	GithubEvent,
} from "./types"

// Bootstrap types
export type { BootstrapConfig, McpServerConfig } from "./types"

// Mode types
export type { ModesConfig, ModeConfig } from "./types"

// Voice types
export type { VoiceConfig, PersonaPlexConfig } from "./types"

// Logging types
export type { LoggingConfig, LogLevel, LogRotation } from "./types"

// Main configuration type
export type { FrameworkConfig, ConfigLoadOptions } from "./types"

// State management types
export type {
	SdlcState,
	PhaseState,
	TaskState,
	TaskStatus,
	CheckpointInfo,
} from "./types"

// Error types
export { FrameworkConfigError, StateManagerError } from "./types"

// =============================================================================
// CONFIG LOADER EXPORTS
// =============================================================================

/**
 * Load framework configuration with hierarchical merging
 */
export { loadConfig } from "./config-loader"

/**
 * Load configuration from a specific path
 */
export { loadConfigFromPath } from "./config-loader"

/**
 * Validate a configuration object
 */
export { validateConfig } from "./config-loader"

/**
 * Get the default framework configuration
 */
export { getDefaultConfig } from "./config-loader"

/**
 * Save configuration to a file
 */
export { saveConfig } from "./config-loader"

// =============================================================================
// STATE MANAGER EXPORTS
// =============================================================================

/**
 * SDLC State Manager class
 */
export { SdlcStateManager } from "./state-manager"

/**
 * Factory function to create and initialize a state manager
 */
export { createSdlcStateManager } from "./state-manager"
