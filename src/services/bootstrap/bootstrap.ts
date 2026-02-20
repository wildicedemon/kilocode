// kilocode_change - new file

/**
 * Bootstrap Service
 *
 * Main service for running the bootstrap process, which includes:
 * - Environment checks
 * - Dependency installation
 * - Secret validation
 * - MCP server configuration
 * - Configuration file generation
 * - Health checks
 */

import type {
	BootstrapOptions,
	BootstrapResult,
	BootstrapStatus,
	BootstrapPhase,
	BootstrapProgressCallback,
	BootstrapProgressEvent,
	EnvironmentCheck,
	DependencyInstallResult,
	SecretValidationResult,
	ConfigGenerationResult,
	HealthCheckResult,
	DependencyConfig,
	McpServerConfig,
} from "./types"
import { DEFAULT_BOOTSTRAP_OPTIONS, BootstrapError } from "./types"
import { runEnvironmentChecks, getEnvironmentCheckSummary } from "./checks/environment"
import {
	installDependencies,
	installWorkspaceDependencies,
	ALL_DEFAULT_DEPENDENCIES,
	getDependencyInstallSummary,
} from "./checks/dependencies"
import { validateAllSecrets, getSecretValidationSummary } from "./checks/secrets"
import {
	generateAllConfigs,
	generateMcpConfig,
	generateFrameworkDir,
	updateGitignore,
	getConfigGenerationSummary,
	DEFAULT_MCP_SERVERS,
} from "./config-writer"

// =============================================================================
// BOOTSTRAP SERVICE CLASS
// =============================================================================

/**
 * BootstrapService - Orchestrates the bootstrap process
 *
 * This service handles the complete bootstrap workflow for setting up
 * the Kilo Framework in a workspace.
 */
export class BootstrapService {
	private options: BootstrapOptions
	private status: BootstrapStatus
	private progressCallback?: BootstrapProgressCallback
	private workspacePath: string

	constructor(options: Partial<BootstrapOptions> = {}, progressCallback?: BootstrapProgressCallback) {
		this.options = { ...DEFAULT_BOOTSTRAP_OPTIONS, ...options }
		this.progressCallback = progressCallback
		this.workspacePath = this.options.workspacePath ?? this.getCwd()

		this.status = {
			phase: "idle",
			progress: 0,
			message: "Ready to bootstrap",
			inProgress: false,
			timestamp: new Date().toISOString(),
		}
	}

	/**
	 * Get the current working directory safely
	 */
	private getCwd(): string {
		const proc = (
			globalThis as unknown as {
				process?: {
					cwd?: () => string
				}
			}
		).process

		return proc?.cwd?.() ?? "."
	}

	/**
	 * Emit a progress event
	 */
	private emitProgress(
		type: BootstrapProgressEvent["type"],
		phase: BootstrapPhase,
		progress: number,
		message: string,
		data?: Record<string, unknown>,
		error?: Error,
	): void {
		const event: BootstrapProgressEvent = {
			type,
			phase,
			progress,
			message,
			data,
			error,
			timestamp: new Date().toISOString(),
		}

		this.status = {
			phase,
			progress,
			message,
			inProgress: phase !== "complete" && phase !== "error",
			lastError: error?.message,
			timestamp: event.timestamp,
		}

		this.progressCallback?.(event)
	}

	/**
	 * Get current bootstrap status
	 */
	getStatus(): BootstrapStatus {
		return { ...this.status }
	}

	/**
	 * Run environment checks
	 */
	async checkEnvironment(): Promise<EnvironmentCheck[]> {
		this.emitProgress("phase_started", "environment-check", 5, "Checking environment prerequisites")

		try {
			const checks = await runEnvironmentChecks()
			const summary = getEnvironmentCheckSummary(checks)

			this.emitProgress(
				"phase_completed",
				"environment-check",
				15,
				`Environment checks complete: ${summary.passed} passed, ${summary.failed} failed`,
				{ checks, summary },
			)

			return checks
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			this.emitProgress("bootstrap_error", "environment-check", 15, "Environment check failed", undefined, err)
			throw new BootstrapError("Environment check failed", "ENV_CHECK_FAILED", err, "environment-check")
		}
	}

	/**
	 * Install dependencies
	 */
	async installDependencies(): Promise<DependencyInstallResult[]> {
		this.emitProgress("phase_started", "dependencies", 20, "Installing dependencies")

		try {
			const results: DependencyInstallResult[] = []

			// First, install workspace dependencies
			if (!this.options.skipDependencies) {
				const workspaceResult = await installWorkspaceDependencies(this.workspacePath)
				results.push(workspaceResult)

				this.emitProgress(
					"dependency_installed",
					"dependencies",
					30,
					`Workspace dependencies: ${workspaceResult.status}`,
					{ result: workspaceResult },
				)

				// Install additional dependencies
				const additionalResults = await installDependencies(ALL_DEFAULT_DEPENDENCIES, this.workspacePath, {
					parallel: false,
					onProgress: (result) => {
						this.emitProgress(
							"dependency_installed",
							"dependencies",
							30 + (results.length / ALL_DEFAULT_DEPENDENCIES.length) * 20,
							`${result.dependency.name}: ${result.status}`,
							{ result },
						)
					},
				})
				results.push(...additionalResults)
			}

			const summary = getDependencyInstallSummary(results)

			this.emitProgress(
				"phase_completed",
				"dependencies",
				50,
				`Dependencies complete: ${summary.installed} installed, ${summary.failed} failed`,
				{ results, summary },
			)

			return results
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			this.emitProgress("bootstrap_error", "dependencies", 50, "Dependency installation failed", undefined, err)
			throw new BootstrapError("Dependency installation failed", "DEP_INSTALL_FAILED", err, "dependencies")
		}
	}

	/**
	 * Validate secrets
	 */
	async validateSecrets(): Promise<SecretValidationResult[]> {
		this.emitProgress("phase_started", "secrets", 55, "Validating secrets and API keys")

		try {
			const results = validateAllSecrets()
			const summary = getSecretValidationSummary(results)

			this.emitProgress(
				"phase_completed",
				"secrets",
				65,
				`Secrets validation: ${summary.valid} valid, ${summary.missing} missing`,
				{ results, summary },
			)

			return results
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			this.emitProgress("bootstrap_error", "secrets", 65, "Secret validation failed", undefined, err)
			throw new BootstrapError("Secret validation failed", "SECRET_VALIDATION_FAILED", err, "secrets")
		}
	}

	/**
	 * Configure MCP servers
	 */
	async configureMcpServers(servers?: McpServerConfig[]): Promise<ConfigGenerationResult[]> {
		this.emitProgress("phase_started", "mcp-config", 70, "Configuring MCP servers")

		try {
			const results: ConfigGenerationResult[] = []

			if (!this.options.skipMcp) {
				const serversToConfigure = servers ?? DEFAULT_MCP_SERVERS

				// Filter to specific servers if requested
				const filteredServers = this.options.mcpServers
					? serversToConfigure.filter((s) => this.options.mcpServers?.includes(s.id))
					: serversToConfigure

				// Generate MCP config
				const mcpResult = await generateMcpConfig(this.workspacePath, {
					overwrite: this.options.overwrite,
					createFrameworkDir: true,
					createLoggingDir: true,
					mcpServers: filteredServers.map((s) => s.id),
				})
				results.push(mcpResult)
			}

			this.emitProgress(
				"phase_completed",
				"mcp-config",
				80,
				`MCP configuration complete: ${results.filter((r) => r.success).length} configured`,
				{ results },
			)

			return results
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			this.emitProgress("bootstrap_error", "mcp-config", 80, "MCP configuration failed", undefined, err)
			throw new BootstrapError("MCP configuration failed", "MCP_CONFIG_FAILED", err, "mcp-config")
		}
	}

	/**
	 * Generate configuration files
	 */
	async generateConfig(): Promise<ConfigGenerationResult[]> {
		this.emitProgress("phase_started", "config-generation", 85, "Generating configuration files")

		try {
			const results: ConfigGenerationResult[] = []

			if (!this.options.skipConfig) {
				// Generate framework directory and configs
				const configResults = await generateFrameworkDir(this.workspacePath, {
					overwrite: this.options.overwrite,
					createFrameworkDir: true,
					createLoggingDir: true,
				})
				results.push(...configResults)

				// Update .gitignore
				const gitignoreResult = await updateGitignore(this.workspacePath)
				results.push(gitignoreResult)
			}

			const summary = getConfigGenerationSummary(results)

			this.emitProgress(
				"phase_completed",
				"config-generation",
				95,
				`Configuration complete: ${summary.generated} generated, ${summary.failed} failed`,
				{ results, summary },
			)

			return results
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			this.emitProgress(
				"bootstrap_error",
				"config-generation",
				95,
				"Configuration generation failed",
				undefined,
				err,
			)
			throw new BootstrapError("Configuration generation failed", "CONFIG_GEN_FAILED", err, "config-generation")
		}
	}

	/**
	 * Run health checks
	 */
	async runHealthChecks(): Promise<HealthCheckResult[]> {
		this.emitProgress("phase_started", "health-check", 95, "Running health checks")

		try {
			const results: HealthCheckResult[] = []
			const timestamp = new Date().toISOString()

			// Check framework directory
			try {
				const fs = await import("fs/promises")
				const path = await import("path")

				const frameworkDir = path.join(this.workspacePath, ".framework")
				await fs.access(frameworkDir)

				results.push({
					id: "framework-dir",
					name: "Framework Directory",
					status: "healthy",
					message: ".framework directory exists",
					timestamp,
				})
			} catch {
				results.push({
					id: "framework-dir",
					name: "Framework Directory",
					status: "unhealthy",
					message: ".framework directory not found",
					timestamp,
				})
			}

			// Check config file
			try {
				const fs = await import("fs/promises")
				const path = await import("path")

				const configPath = path.join(this.workspacePath, ".framework", "config.yaml")
				await fs.access(configPath)

				results.push({
					id: "config-file",
					name: "Configuration File",
					status: "healthy",
					message: "config.yaml exists",
					timestamp,
				})
			} catch {
				results.push({
					id: "config-file",
					name: "Configuration File",
					status: "degraded",
					message: "config.yaml not found (using defaults)",
					timestamp,
				})
			}

			// Check node_modules
			try {
				const fs = await import("fs/promises")
				const path = await import("path")

				const nodeModulesPath = path.join(this.workspacePath, "node_modules")
				await fs.access(nodeModulesPath)

				results.push({
					id: "node-modules",
					name: "Dependencies",
					status: "healthy",
					message: "node_modules exists",
					timestamp,
				})
			} catch {
				results.push({
					id: "node-modules",
					name: "Dependencies",
					status: "degraded",
					message: "node_modules not found",
					timestamp,
				})
			}

			this.emitProgress(
				"phase_completed",
				"health-check",
				100,
				`Health checks complete: ${results.filter((r) => r.status === "healthy").length} healthy`,
				{ results },
			)

			return results
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			this.emitProgress("bootstrap_error", "health-check", 100, "Health checks failed", undefined, err)
			throw new BootstrapError("Health checks failed", "HEALTH_CHECK_FAILED", err, "health-check")
		}
	}

	/**
	 * Report bootstrap status
	 */
	reportStatus(): BootstrapStatus {
		return this.getStatus()
	}

	/**
	 * Run the complete bootstrap process
	 */
	async run(): Promise<BootstrapResult> {
		const startedAt = new Date().toISOString()
		const warnings: string[] = []
		const errors: string[] = []

		this.emitProgress("bootstrap_started", "idle", 0, "Starting bootstrap process")

		try {
			// 1. Environment checks
			const environmentChecks = this.options.skipHealthCheck ? [] : await this.checkEnvironment()

			// 2. Dependencies
			const dependencies = this.options.skipDependencies ? [] : await this.installDependencies()

			// 3. Secrets
			const secrets = this.options.skipSecrets ? [] : await this.validateSecrets()

			// 4. MCP configuration
			const mcpServers = this.options.skipMcp ? [] : await this.configureMcpServers()

			// 5. Configuration generation
			const configFiles = this.options.skipConfig ? [] : await this.generateConfig()

			// 6. Health checks
			const healthChecks = this.options.skipHealthCheck ? [] : await this.runHealthChecks()

			// Collect warnings
			const envSummary = getEnvironmentCheckSummary(environmentChecks)
			if (envSummary.warned > 0) {
				warnings.push(`${envSummary.warned} environment check(s) have warnings`)
			}

			const depSummary = getDependencyInstallSummary(dependencies)
			if (depSummary.failed > 0) {
				warnings.push(`${depSummary.failed} dependency installation(s) failed`)
			}

			const secretSummary = getSecretValidationSummary(secrets)
			if (secretSummary.missing > 0) {
				warnings.push(`${secretSummary.missing} secret(s) are missing`)
			}

			// Determine success
			const success = errors.length === 0 && (envSummary.allRequiredPass || this.options.skipHealthCheck)

			const completedAt = new Date().toISOString()
			const totalDuration = new Date(completedAt).getTime() - new Date(startedAt).getTime()

			this.emitProgress(
				"bootstrap_completed",
				"complete",
				100,
				success ? "Bootstrap completed successfully" : "Bootstrap completed with errors",
				{
					environmentChecks: environmentChecks.length,
					dependencies: dependencies.length,
					secrets: secrets.length,
					mcpServers: mcpServers.length,
					configFiles: configFiles.length,
					healthChecks: healthChecks.length,
					warnings: warnings.length,
					errors: errors.length,
				},
			)

			return {
				success,
				environmentChecks,
				dependencies,
				mcpServers: mcpServers.map((r) => ({
					server: DEFAULT_MCP_SERVERS.find((s) => s.id === r.path.split("/").pop()?.replace(".json", "")) ?? {
						id: r.path,
						name: r.path,
						package: r.path,
						enabled: r.success,
					},
					success: r.success,
					message: r.error ?? (r.created ? "Created" : "Skipped"),
					configPath: r.path,
					error: r.error,
				})),
				secrets,
				configFiles,
				healthChecks,
				warnings,
				errors,
				startedAt,
				completedAt,
				totalDuration,
			}
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			errors.push(err.message)

			const completedAt = new Date().toISOString()
			const totalDuration = new Date(completedAt).getTime() - new Date(startedAt).getTime()

			this.emitProgress(
				"bootstrap_error",
				"error",
				this.status.progress,
				`Bootstrap failed: ${err.message}`,
				undefined,
				err,
			)

			return {
				success: false,
				environmentChecks: [],
				dependencies: [],
				mcpServers: [],
				secrets: [],
				configFiles: [],
				healthChecks: [],
				warnings,
				errors,
				startedAt,
				completedAt,
				totalDuration,
			}
		}
	}
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Run bootstrap with default options
 */
export async function runBootstrap(
	options: Partial<BootstrapOptions> = {},
	progressCallback?: BootstrapProgressCallback,
): Promise<BootstrapResult> {
	const service = new BootstrapService(options, progressCallback)
	return service.run()
}

/**
 * Quick environment check
 */
export async function quickEnvironmentCheck(): Promise<boolean> {
	const checks = await runEnvironmentChecks()
	const summary = getEnvironmentCheckSummary(checks)
	return summary.allRequiredPass
}

/**
 * Quick secret validation
 */
export async function quickSecretValidation(): Promise<boolean> {
	const results = validateAllSecrets()
	const summary = getSecretValidationSummary(results)
	return summary.allRequiredValid
}
