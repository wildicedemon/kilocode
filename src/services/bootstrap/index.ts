// kilocode_change - new file

/**
 * Bootstrap/Self-Provisioning Service
 *
 * This module provides a complete bootstrap service for setting up
 * the Kilo Framework in a workspace, including:
 * - Environment prerequisite checks
 * - Dependency installation
 * - Secret/API key validation
 * - MCP server configuration
 * - Configuration file generation
 * - Health checks
 *
 * @example
 * ```typescript
 * import { BootstrapService, runBootstrap } from "./services/bootstrap"
 *
 * // Quick bootstrap
 * const result = await runBootstrap()
 *
 * // With options and progress callback
 * const service = new BootstrapService({
 *   skipDependencies: false,
 *   overwrite: true,
 * }, (event) => {
 *   console.log(`${event.phase}: ${event.message}`)
 * })
 * const result = await service.run()
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
	// Environment check types
	EnvironmentCheck,
	EnvironmentCheckConfig,
	EnvironmentCheckStatus,
	
	// Dependency types
	DependencyConfig,
	DependencyInstallResult,
	DependencyStatus,
	PackageManager,
	
	// MCP server types
	McpServerConfig,
	McpServerConfigResult,
	
	// Secret types
	SecretConfig,
	SecretStatus,
	SecretValidationResult,
	
	// Health check types
	HealthCheckResult,
	HealthCheckStatus,
	
	// Configuration types
	ConfigGenerationOptions,
	ConfigGenerationResult,
	
	// Bootstrap types
	BootstrapOptions,
	BootstrapResult,
	BootstrapStatus,
	BootstrapPhase,
	BootstrapProgressCallback,
	BootstrapProgressEvent,
	BootstrapEventType,
} from "./types"

export {
	// Constants
	DEFAULT_ENVIRONMENT_CHECK_CONFIG,
	DEFAULT_BOOTSTRAP_OPTIONS,
	
	// Error classes
	BootstrapError,
	EnvironmentCheckError,
	DependencyInstallError,
} from "./types"

// =============================================================================
// ENVIRONMENT CHECKS
// =============================================================================

export {
	// Main functions
	runEnvironmentChecks,
	allRequiredChecksPass,
	getEnvironmentCheckSummary,
	
	// Individual checks (for testing)
	checkNodeVersion,
	checkPython,
	checkGit,
	checkVsCode,
	checkKiloCode,
	checkPackageManager,
	checkWorkspaceAccess,
} from "./checks/environment"

// =============================================================================
// DEPENDENCIES
// =============================================================================

export {
	// Main functions
	installDependency,
	installDependencies,
	installWorkspaceDependencies,
	checkDependencyStatus,
	getDependencyInstallSummary,
	
	// Constants
	DEFAULT_MCP_DEPENDENCIES,
	DEFAULT_TOOL_DEPENDENCIES,
	ALL_DEFAULT_DEPENDENCIES,
} from "./checks/dependencies"

// =============================================================================
// SECRETS
// =============================================================================

export {
	// Main functions
	validateSecret,
	validateSecrets,
	validateAllSecrets,
	validateRequiredSecrets,
	allRequiredSecretsValid,
	getSecretValidationSummary,
	getMissingRequiredSecrets,
	generateSecretReport,
	
	// Constants
	DEFAULT_REQUIRED_SECRETS,
	PROVIDER_SECRETS,
	ALL_KNOWN_SECRETS,
} from "./checks/secrets"

// =============================================================================
// CONFIG WRITER
// =============================================================================

export {
	// Main functions
	generateMcpConfig,
	generateFrameworkDir,
	generateLoggingDir,
	generateAllConfigs,
	getConfigGenerationSummary,
	updateGitignore,
	
	// Constants
	DEFAULT_MCP_SERVERS,
	DEFAULT_FRAMEWORK_CONFIG,
	DEFAULT_MCP_CONFIG,
	DEFAULT_FRAMEWORK_STATE,
	GITIGNORE_ENTRIES,
} from "./config-writer"

// =============================================================================
// BOOTSTRAP SERVICE
// =============================================================================

export {
	// Main service
	BootstrapService,
	
	// Convenience functions
	runBootstrap,
	quickEnvironmentCheck,
	quickSecretValidation,
} from "./bootstrap"
