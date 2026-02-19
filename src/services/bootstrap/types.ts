// kilocode_change - new file

/**
 * Bootstrap/Self-Provisioning Service - Type Definitions
 *
 * This module contains all TypeScript interfaces and types for the bootstrap
 * service, including configuration, environment checks, dependencies, and results.
 */

// =============================================================================
// ENVIRONMENT CHECK TYPES
// =============================================================================

/**
 * Status of an environment check
 */
export type EnvironmentCheckStatus = "pass" | "warn" | "fail" | "skip"

/**
 * Result of a single environment check
 */
export interface EnvironmentCheck {
	/** Unique identifier for this check */
	id: string
	/** Human-readable name of the check */
	name: string
	/** Status of the check */
	status: EnvironmentCheckStatus
	/** Human-readable message describing the result */
	message: string
	/** Additional details about the check result */
	details?: Record<string, unknown>
	/** Whether this check is required for bootstrap to succeed */
	required: boolean
	/** Timestamp when the check was performed */
	timestamp: string
}

/**
 * Configuration for environment checks
 */
export interface EnvironmentCheckConfig {
	/** Minimum Node.js version required (major version) */
	minNodeVersion: number
	/** Minimum Python version required (e.g., "3.8") */
	minPythonVersion?: string
	/** Whether to check for Git installation */
	checkGit: boolean
	/** Whether to check for VS Code installation */
	checkVsCode: boolean
	/** Whether to check for Kilo Code extension */
	checkKiloCode: boolean
}

/**
 * Default environment check configuration
 */
export const DEFAULT_ENVIRONMENT_CHECK_CONFIG: EnvironmentCheckConfig = {
	minNodeVersion: 18,
	minPythonVersion: "3.8",
	checkGit: true,
	checkVsCode: false,
	checkKiloCode: false,
}

// =============================================================================
// DEPENDENCY CONFIGURATION TYPES
// =============================================================================

/**
 * Status of a dependency
 */
export type DependencyStatus = "installed" | "missing" | "outdated" | "error"

/**
 * Type of dependency package manager
 */
export type PackageManager = "npm" | "pnpm" | "yarn" | "pip" | "uv"

/**
 * Configuration for a single dependency
 */
export interface DependencyConfig {
	/** Unique identifier for this dependency */
	id: string
	/** Human-readable name */
	name: string
	/** Package name in the registry */
	package: string
	/** Version constraint (e.g., "^1.0.0", "latest") */
	version?: string
	/** Whether this dependency is required */
	required: boolean
	/** Package manager to use for installation */
	packageManager: PackageManager
	/** Whether to install globally */
	global: boolean
	/** Description of what this dependency provides */
	description?: string
	/** Environment variable to check for existing installation */
	envCheck?: string
	/** Command to verify installation */
	verifyCommand?: string
}

/**
 * Result of a dependency installation attempt
 */
export interface DependencyInstallResult {
	/** Dependency that was processed */
	dependency: DependencyConfig
	/** Installation status */
	status: DependencyStatus
	/** Human-readable message */
	message: string
	/** Installed version (if successful) */
	installedVersion?: string
	/** Error details (if failed) */
	error?: string
	/** Duration of installation in milliseconds */
	duration?: number
}

// =============================================================================
// MCP SERVER CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for an MCP server
 */
export interface McpServerConfig {
	/** Unique identifier for this server */
	id: string
	/** Human-readable name */
	name: string
	/** Package name for the MCP server */
	package: string
	/** Whether this server is enabled by default */
	enabled: boolean
	/** Required environment variables */
	requiredEnvVars?: string[]
	/** Optional configuration */
	config?: Record<string, unknown>
	/** Description of what this server provides */
	description?: string
}

/**
 * Result of MCP server configuration
 */
export interface McpServerConfigResult {
	/** Server that was configured */
	server: McpServerConfig
	/** Whether configuration was successful */
	success: boolean
	/** Human-readable message */
	message: string
	/** Path to configuration file */
	configPath?: string
	/** Error details (if failed) */
	error?: string
}

// =============================================================================
// SECRET VALIDATION TYPES
// =============================================================================

/**
 * Status of a secret validation
 */
export type SecretStatus = "valid" | "missing" | "invalid" | "placeholder"

/**
 * Configuration for a secret/API key
 */
export interface SecretConfig {
	/** Environment variable name */
	envVar: string
	/** Human-readable name */
	name: string
	/** Whether this secret is required */
	required: boolean
	/** Pattern to validate the secret format */
	validationPattern?: RegExp
	/** Description of what this secret is used for */
	description?: string
	/** URL to documentation for obtaining this secret */
	documentationUrl?: string
}

/**
 * Result of secret validation
 */
export interface SecretValidationResult {
	/** Secret that was validated */
	secret: SecretConfig
	/** Validation status */
	status: SecretStatus
	/** Human-readable message */
	message: string
	/** Whether the secret has a placeholder value */
	isPlaceholder: boolean
}

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

/**
 * Status of a health check
 */
export type HealthCheckStatus = "healthy" | "degraded" | "unhealthy"

/**
 * Result of a health check
 */
export interface HealthCheckResult {
	/** Unique identifier for this check */
	id: string
	/** Human-readable name */
	name: string
	/** Status of the check */
	status: HealthCheckStatus
	/** Human-readable message */
	message: string
	/** Additional details */
	details?: Record<string, unknown>
	/** Timestamp when the check was performed */
	timestamp: string
	/** Duration of the check in milliseconds */
	duration?: number
}

// =============================================================================
// CONFIGURATION GENERATION TYPES
// =============================================================================

/**
 * Configuration for config file generation
 */
export interface ConfigGenerationOptions {
	/** Overwrite existing files */
	overwrite: boolean
	/** Create .framework directory structure */
	createFrameworkDir: boolean
	/** Create logging directory */
	createLoggingDir: boolean
	/** MCP servers to include in configuration */
	mcpServers?: string[]
	/** Custom configuration values */
	customConfig?: Record<string, unknown>
}

/**
 * Result of configuration file generation
 */
export interface ConfigGenerationResult {
	/** Path to generated file */
	path: string
	/** Whether generation was successful */
	success: boolean
	/** Whether the file was created or updated */
	created: boolean
	/** Error message (if failed) */
	error?: string
}

// =============================================================================
// BOOTSTRAP CONFIGURATION TYPES
// =============================================================================

/**
 * Options for the bootstrap process
 */
export interface BootstrapOptions {
	/** Skip dependency installation */
	skipDependencies: boolean
	/** Skip MCP server configuration */
	skipMcp: boolean
	/** Skip configuration file generation */
	skipConfig: boolean
	/** Skip health checks */
	skipHealthCheck: boolean
	/** Skip secret validation */
	skipSecrets: boolean
	/** Overwrite existing configuration files */
	overwrite: boolean
	/** Specific MCP servers to configure */
	mcpServers?: string[]
	/** Enable verbose output */
	verbose: boolean
	/** Custom workspace path */
	workspacePath?: string
}

/**
 * Default bootstrap options
 */
export const DEFAULT_BOOTSTRAP_OPTIONS: BootstrapOptions = {
	skipDependencies: false,
	skipMcp: false,
	skipConfig: false,
	skipHealthCheck: false,
	skipSecrets: false,
	overwrite: false,
	verbose: false,
}

// =============================================================================
// BOOTSTRAP RESULT TYPES
// =============================================================================

/**
 * Result of the complete bootstrap process
 */
export interface BootstrapResult {
	/** Whether bootstrap completed successfully */
	success: boolean
	/** Environment check results */
	environmentChecks: EnvironmentCheck[]
	/** Dependency installation results */
	dependencies: DependencyInstallResult[]
	/** MCP server configuration results */
	mcpServers: McpServerConfigResult[]
	/** Secret validation results */
	secrets: SecretValidationResult[]
	/** Configuration generation results */
	configFiles: ConfigGenerationResult[]
	/** Health check results */
	healthChecks: HealthCheckResult[]
	/** Warning messages */
	warnings: string[]
	/** Error messages */
	errors: string[]
	/** Timestamp when bootstrap started */
	startedAt: string
	/** Timestamp when bootstrap completed */
	completedAt: string
	/** Total duration in milliseconds */
	totalDuration: number
}

/**
 * Bootstrap status for reporting
 */
export interface BootstrapStatus {
	/** Current phase of bootstrap */
	phase: BootstrapPhase
	/** Progress percentage (0-100) */
	progress: number
	/** Human-readable status message */
	message: string
	/** Whether bootstrap is in progress */
	inProgress: boolean
	/** Last error (if any) */
	lastError?: string
	/** Timestamp of last update */
	timestamp: string
}

/**
 * Phases of the bootstrap process
 */
export type BootstrapPhase =
	| "idle"
	| "environment-check"
	| "dependencies"
	| "secrets"
	| "mcp-config"
	| "config-generation"
	| "health-check"
	| "complete"
	| "error"

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Bootstrap error class
 */
export class BootstrapError extends Error {
	override cause?: Error
	readonly code: string
	readonly phase?: BootstrapPhase

	constructor(message: string, code: string, cause?: Error, phase?: BootstrapPhase) {
		super(message)
		this.name = "BootstrapError"
		this.code = code
		this.cause = cause
		this.phase = phase
	}
}

/**
 * Environment check error class
 */
export class EnvironmentCheckError extends Error {
	override cause?: Error
	readonly checkId: string

	constructor(message: string, checkId: string, cause?: Error) {
		super(message)
		this.name = "EnvironmentCheckError"
		this.checkId = checkId
		this.cause = cause
	}
}

/**
 * Dependency installation error class
 */
export class DependencyInstallError extends Error {
	override cause?: Error
	readonly dependencyId: string

	constructor(message: string, dependencyId: string, cause?: Error) {
		super(message)
		this.name = "DependencyInstallError"
		this.dependencyId = dependencyId
		this.cause = cause
	}
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Bootstrap event types for progress reporting
 */
export type BootstrapEventType =
	| "bootstrap_started"
	| "phase_started"
	| "phase_progress"
	| "phase_completed"
	| "check_completed"
	| "dependency_installed"
	| "config_generated"
	| "bootstrap_completed"
	| "bootstrap_error"

/**
 * Bootstrap progress event
 */
export interface BootstrapProgressEvent {
	/** Event type */
	type: BootstrapEventType
	/** Current phase */
	phase: BootstrapPhase
	/** Progress percentage (0-100) */
	progress: number
	/** Human-readable message */
	message: string
	/** Additional data */
	data?: Record<string, unknown>
	/** Error (if applicable) */
	error?: Error
	/** Timestamp */
	timestamp: string
}

/**
 * Progress callback for bootstrap operations
 */
export type BootstrapProgressCallback = (event: BootstrapProgressEvent) => void
