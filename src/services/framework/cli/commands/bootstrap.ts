// kilocode_change - new file

/**
 * Bootstrap Command
 *
 * Checks environment prerequisites, installs missing dependencies,
 * configures MCP servers, generates configuration files, and runs health checks.
 */

import * as fs from "fs/promises"
import * as path from "path"
import type { ParsedArgs, CLIOptions, Command, CommandResult } from "../types"
import { successResult, errorResult } from "../types"

// =============================================================================
// TYPES
// =============================================================================

interface BootstrapOptions {
	skipDependencies: boolean
	skipMcp: boolean
	skipConfig: boolean
	skipHealthCheck: boolean
	overwrite: boolean
	mcpServers?: string[]
}

interface HealthCheckResult {
	name: string
	passed: boolean
	message: string
	details?: Record<string, unknown>
}

interface BootstrapResult {
	success: boolean
	dependencies: string[]
	mcpServers: string[]
	configFiles: string[]
	healthChecks: HealthCheckResult[]
	warnings: string[]
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse bootstrap options from command arguments
 */
function parseBootstrapOptions(args: ParsedArgs): BootstrapOptions {
	return {
		skipDependencies: Boolean(args["skip-dependencies"]),
		skipMcp: Boolean(args["skip-mcp"]),
		skipConfig: Boolean(args["skip-config"]),
		skipHealthCheck: Boolean(args["skip-health-check"]),
		overwrite: Boolean(args.overwrite || args.f),
		mcpServers:
			typeof args["mcp-servers"] === "string"
				? args["mcp-servers"].split(",").map((s) => s.trim())
				: undefined,
	}
}

/**
 * Check if a command exists in PATH
 */
async function commandExists(command: string): Promise<boolean> {
	try {
		const proc = (globalThis as unknown as { process?: { platform?: string } }).process
		const platform = proc?.platform ?? "linux"
		const checkCmd = platform === "win32" ? "where" : "which"

		const { spawn } = await import("child_process")
		return new Promise((resolve) => {
			const child = spawn(checkCmd, [command], { shell: true })
			child.on("close", (code) => resolve(code === 0))
			child.on("error", () => resolve(false))
		})
	} catch {
		return false
	}
}

/**
 * Get the current working directory safely
 */
function getCwd(): string {
	const proc = (globalThis as unknown as { process?: { cwd?: () => string } }).process
	return proc?.cwd?.() ?? "."
}

/**
 * Check Node.js version
 */
function checkNodeVersion(): { valid: boolean; version: string; message: string } {
	const proc = (globalThis as unknown as { process?: { versions?: { node?: string } } }).process
	const version = proc?.versions?.node ?? "0.0.0"
	const [major] = version.split(".").map(Number)
	const minMajor = 18

	return {
		valid: major >= minMajor,
		version,
		message:
			major >= minMajor
				? `Node.js ${version} (✓)`
				: `Node.js ${version} is below minimum required version ${minMajor}.0.0`,
	}
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================

/**
 * Run all health checks
 */
async function runHealthChecks(): Promise<HealthCheckResult[]> {
	const results: HealthCheckResult[] = []

	// Node.js version check
	const nodeCheck = checkNodeVersion()
	results.push({
		name: "Node.js Version",
		passed: nodeCheck.valid,
		message: nodeCheck.message,
		details: { version: nodeCheck.version },
	})

	// Git check
	const gitExists = await commandExists("git")
	results.push({
		name: "Git",
		passed: gitExists,
		message: gitExists ? "Git is installed" : "Git is not installed or not in PATH",
	})

	// npm/pnpm check
	const npmExists = await commandExists("npm")
	const pnpmExists = await commandExists("pnpm")
	results.push({
		name: "Package Manager",
		passed: npmExists || pnpmExists,
		message:
			npmExists && pnpmExists
				? "npm and pnpm are installed"
				: npmExists
					? "npm is installed"
					: pnpmExists
						? "pnpm is installed"
						: "No package manager found",
		details: { npm: npmExists, pnpm: pnpmExists },
	})

	// Disk space check (simplified)
	try {
		const cwd = getCwd()
		const stats = await fs.stat(cwd)
		results.push({
			name: "Workspace Access",
			passed: true,
			message: `Workspace directory is accessible`,
			details: { path: cwd },
		})
	} catch (error) {
		results.push({
			name: "Workspace Access",
			passed: false,
			message: `Cannot access workspace: ${error instanceof Error ? error.message : String(error)}`,
		})
	}

	return results
}

// =============================================================================
// DEPENDENCY INSTALLATION
// =============================================================================

/**
 * Check and install dependencies
 */
async function installDependencies(
	options: BootstrapOptions,
	verbose: boolean
): Promise<{ installed: string[]; warnings: string[] }> {
	const installed: string[] = []
	const warnings: string[] = []

	if (options.skipDependencies) {
		if (verbose) {
			console.log("  Skipping dependency installation")
		}
		return { installed, warnings }
	}

	if (verbose) {
		console.log("  Checking dependencies...")
	}

	// Check for package.json
	const cwd = getCwd()
	const packageJsonPath = path.join(cwd, "package.json")

	try {
		await fs.access(packageJsonPath)
	} catch {
		warnings.push("No package.json found in workspace")
		return { installed, warnings }
	}

	// Check if node_modules exists
	const nodeModulesPath = path.join(cwd, "node_modules")
	try {
		await fs.access(nodeModulesPath)
		if (verbose) {
			console.log("  node_modules already exists")
		}
	} catch {
		// Need to install dependencies
		if (verbose) {
			console.log("  Installing dependencies...")
		}

		try {
			const { spawn } = await import("child_process")
			await new Promise<void>((resolve, reject) => {
				const pnpmExists = commandExists("pnpm")
				const npmCmd = pnpmExists ? "pnpm" : "npm"
				const child = spawn(npmCmd, ["install"], {
					cwd,
					shell: true,
					stdio: verbose ? "inherit" : "pipe",
				})
				child.on("close", (code) => {
					if (code === 0) {
						installed.push("node_modules")
						resolve()
					} else {
						reject(new Error(`${npmCmd} install exited with code ${code}`))
					}
				})
				child.on("error", reject)
			})
		} catch (error) {
			warnings.push(
				`Failed to install dependencies: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	return { installed, warnings }
}

// =============================================================================
// MCP SERVER CONFIGURATION
// =============================================================================

/**
 * Default MCP servers to configure
 */
const DEFAULT_MCP_SERVERS = [
	{
		name: "codegraph-context",
		package: "@kilocode/mcp-codegraph-context",
		enabled: true,
	},
	{
		name: "rag-memory",
		package: "@kilocode/mcp-rag-memory",
		enabled: true,
	},
	{
		name: "taskmaster",
		package: "@kilocode/mcp-taskmaster",
		enabled: true,
	},
]

/**
 * Configure MCP servers
 */
async function configureMcpServers(
	options: BootstrapOptions,
	verbose: boolean
): Promise<{ configured: string[]; warnings: string[] }> {
	const configured: string[] = []
	const warnings: string[] = []

	if (options.skipMcp) {
		if (verbose) {
			console.log("  Skipping MCP server configuration")
		}
		return { configured, warnings }
	}

	if (verbose) {
		console.log("  Configuring MCP servers...")
	}

	// Get MCP servers to configure
	const serversToConfigure = options.mcpServers
		? DEFAULT_MCP_SERVERS.filter((s) => options.mcpServers?.includes(s.name))
		: DEFAULT_MCP_SERVERS

	// Create MCP configuration directory
	const cwd = getCwd()
	const mcpConfigDir = path.join(cwd, ".kilocode", "mcp")

	try {
		await fs.mkdir(mcpConfigDir, { recursive: true })
	} catch (error) {
		warnings.push(
			`Failed to create MCP config directory: ${error instanceof Error ? error.message : String(error)}`
		)
		return { configured, warnings }
	}

	// Write MCP server configuration
	const mcpConfig = {
		version: "1.0.0",
		servers: Object.fromEntries(
			serversToConfigure.map((s) => [
				s.name,
				{
					enabled: s.enabled,
					package: s.package,
				},
			])
		),
	}

	const mcpConfigPath = path.join(mcpConfigDir, "servers.json")
	try {
		await fs.writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), "utf-8")
		configured.push(...serversToConfigure.map((s) => s.name))
		if (verbose) {
			console.log(`  Configured ${configured.length} MCP servers`)
		}
	} catch (error) {
		warnings.push(
			`Failed to write MCP config: ${error instanceof Error ? error.message : String(error)}`
		)
	}

	return { configured, warnings }
}

// =============================================================================
// CONFIGURATION FILE GENERATION
// =============================================================================

/**
 * Default framework configuration
 */
const DEFAULT_FRAMEWORK_CONFIG = `# Kilo Framework Configuration
# Generated by bootstrap command

framework:
  name: "Kilo Framework"
  version: "1.0.0"
  description: "AI Agentic Autonomous SDLC Framework"

sdlc:
  research:
    enabled: true
    timeout: 3600
    checkpoint_interval: 300
  planning:
    enabled: true
    timeout: 1800
    checkpoint_interval: 300
  implementation:
    enabled: true
    timeout: 7200
    checkpoint_interval: 600
    max_iterations: 10
  verification:
    enabled: true
    timeout: 3600
    checkpoint_interval: 300
    test_coverage_threshold: 80

scanner:
  enabled: true
  passes:
    - anti-patterns
    - architecture
    - performance
    - security
  continuous: false
  state_file: ".framework/scanner-state.md"
  repertoire_file: ".framework/scanner-repertoire.md"
  mcp_servers: []

waste_detection:
  enabled: true
  token_thresholds:
    warn: 50000
    pause: 100000
  loop_detection: true
  alert_channels:
    - console

cost_oversight:
  enabled: true
  budget_per_task: 10.00
  budget_per_phase: 50.00
  currency: USD
  langfuse_integration: false

webhooks:
  enabled: false
  port: 3000
  github:
    enabled: false
    secret: "\${GITHUB_WEBHOOK_SECRET}"
    events:
      - issues
      - pull_request

bootstrap:
  auto_check_updates: true
  mcp_servers:
    codegraph-context:
      enabled: true
      package: "@kilocode/mcp-codegraph-context"
    rag-memory:
      enabled: true
      package: "@kilocode/mcp-rag-memory"
    taskmaster:
      enabled: true
      package: "@kilocode/mcp-taskmaster"

modes:
  orchestrator:
    enabled: true
    config: ".kilo/modes/orchestrator.yaml"
  requirements:
    enabled: true
    config: ".kilo/modes/requirements.yaml"
  scanner:
    enabled: true
    config: ".kilo/modes/scanner.yaml"
  review:
    enabled: true
    config: ".kilo/modes/review.yaml"

voice:
  enabled: false
  personaPlex:
    enabled: false
    config_path: ".kilo/voice/personas.yaml"

logging:
  level: info
  output: ".framework/logs"
  rotation: daily
`

/**
 * Generate configuration files
 */
async function generateConfigFiles(
	options: BootstrapOptions,
	verbose: boolean
): Promise<{ generated: string[]; warnings: string[] }> {
	const generated: string[] = []
	const warnings: string[] = []

	if (options.skipConfig) {
		if (verbose) {
			console.log("  Skipping configuration file generation")
		}
		return { generated, warnings }
	}

	if (verbose) {
		console.log("  Generating configuration files...")
	}

	const cwd = getCwd()
	const frameworkDir = path.join(cwd, ".framework")

	// Create .framework directory
	try {
		await fs.mkdir(frameworkDir, { recursive: true })
	} catch (error) {
		warnings.push(
			`Failed to create .framework directory: ${error instanceof Error ? error.message : String(error)}`
		)
		return { generated, warnings }
	}

	// Generate config.yaml
	const configPath = path.join(frameworkDir, "config.yaml")
	try {
		const exists = await fs
			.access(configPath)
			.then(() => true)
			.catch(() => false)

		if (exists && !options.overwrite) {
			warnings.push("config.yaml already exists (use --overwrite to replace)")
		} else {
			await fs.writeFile(configPath, DEFAULT_FRAMEWORK_CONFIG, "utf-8")
			generated.push(configPath)
			if (verbose) {
				console.log(`  Generated ${configPath}`)
			}
		}
	} catch (error) {
		warnings.push(
			`Failed to generate config.yaml: ${error instanceof Error ? error.message : String(error)}`
		)
	}

	// Generate state.json
	const statePath = path.join(frameworkDir, "state.json")
	try {
		const exists = await fs
			.access(statePath)
			.then(() => true)
			.catch(() => false)

		if (!exists) {
			const initialState = {
				framework_version: "1.0.0",
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				current_phase: null,
				phases: {
					research: { name: "research", active: false, tasks: [] },
					planning: { name: "planning", active: false, tasks: [] },
					implementation: { name: "implementation", active: false, tasks: [] },
					verification: { name: "verification", active: false, tasks: [] },
				},
				checkpoint_count: 0,
			}
			await fs.writeFile(statePath, JSON.stringify(initialState, null, 2), "utf-8")
			generated.push(statePath)
			if (verbose) {
				console.log(`  Generated ${statePath}`)
			}
		}
	} catch (error) {
		warnings.push(
			`Failed to generate state.json: ${error instanceof Error ? error.message : String(error)}`
		)
	}

	return { generated, warnings }
}

// =============================================================================
// COMMAND IMPLEMENTATION
// =============================================================================

/**
 * Bootstrap command handler
 */
async function handleBootstrap(args: ParsedArgs, options: CLIOptions): Promise<CommandResult> {
	const bootstrapOptions = parseBootstrapOptions(args)
	const verbose = options.verbose || !options.quiet

	try {
		if (verbose) {
			console.log("═".repeat(50))
			console.log("  Kilo Framework Bootstrap")
			console.log("═".repeat(50))
			console.log("")
		}

		const allWarnings: string[] = []

		// Run health checks first
		if (!bootstrapOptions.skipHealthCheck) {
			if (verbose) {
				console.log("─".repeat(50))
				console.log("  Health Checks")
				console.log("─".repeat(50))
			}

			const healthChecks = await runHealthChecks()

			for (const check of healthChecks) {
				const icon = check.passed ? "✓" : "✗"
				if (verbose) {
					console.log(`  ${icon} ${check.name}: ${check.message}`)
				}
			}

			const failedChecks = healthChecks.filter((c) => !c.passed)
			if (failedChecks.length > 0) {
				allWarnings.push(`${failedChecks.length} health check(s) failed`)
			}

			if (verbose) {
				console.log("")
			}
		}

		// Install dependencies
		if (verbose) {
			console.log("─".repeat(50))
			console.log("  Dependencies")
			console.log("─".repeat(50))
		}

		const depResult = await installDependencies(bootstrapOptions, verbose)
		allWarnings.push(...depResult.warnings)

		if (verbose) {
			console.log("")
		}

		// Configure MCP servers
		if (verbose) {
			console.log("─".repeat(50))
			console.log("  MCP Servers")
			console.log("─".repeat(50))
		}

		const mcpResult = await configureMcpServers(bootstrapOptions, verbose)
		allWarnings.push(...mcpResult.warnings)

		if (verbose) {
			console.log("")
		}

		// Generate configuration files
		if (verbose) {
			console.log("─".repeat(50))
			console.log("  Configuration Files")
			console.log("─".repeat(50))
		}

		const configResult = await generateConfigFiles(bootstrapOptions, verbose)
		allWarnings.push(...configResult.warnings)

		if (verbose) {
			console.log("")
		}

		// Summary
		const result: BootstrapResult = {
			success: true,
			dependencies: depResult.installed,
			mcpServers: mcpResult.configured,
			configFiles: configResult.generated,
			healthChecks: [],
			warnings: allWarnings,
		}

		if (verbose) {
			console.log("═".repeat(50))
			console.log("  Bootstrap Complete")
			console.log("═".repeat(50))
			console.log(`  Dependencies installed: ${result.dependencies.length}`)
			console.log(`  MCP servers configured: ${result.mcpServers.length}`)
			console.log(`  Config files generated: ${result.configFiles.length}`)

			if (result.warnings.length > 0) {
				console.log("")
				console.log("  Warnings:")
				for (const warning of result.warnings) {
					console.log(`    ⚠ ${warning}`)
				}
			}

			console.log("")
			console.log("  Next steps:")
			console.log("    1. Review .framework/config.yaml")
			console.log("    2. Run 'kilo-framework start' to begin")
		}

		return successResult(result, "Bootstrap completed successfully")
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error))
		return errorResult(err)
	}
}

// =============================================================================
// COMMAND EXPORT
// =============================================================================

/**
 * Bootstrap command definition
 */
export const bootstrapCommand: Command = {
	name: "bootstrap",
	description: "Initialize and configure the framework environment",
	longDescription: `
Checks environment prerequisites, installs missing dependencies,
configures MCP servers, generates configuration files, and runs health checks.

This command should be run once when setting up the framework in a new workspace.
	`.trim(),
	examples: [
		"kilo-framework bootstrap",
		"kilo-framework bootstrap --overwrite",
		"kilo-framework bootstrap --skip-dependencies",
		"kilo-framework bootstrap --mcp-servers codegraph-context,rag-memory",
	],
	options: [
		{
			longFlag: "--skip-dependencies",
			description: "Skip dependency installation",
			type: "boolean",
			defaultValue: false,
		},
		{
			longFlag: "--skip-mcp",
			description: "Skip MCP server configuration",
			type: "boolean",
			defaultValue: false,
		},
		{
			longFlag: "--skip-config",
			description: "Skip configuration file generation",
			type: "boolean",
			defaultValue: false,
		},
		{
			longFlag: "--skip-health-check",
			description: "Skip health checks",
			type: "boolean",
			defaultValue: false,
		},
		{
			longFlag: "--overwrite",
			shortFlag: "-f",
			description: "Overwrite existing configuration files",
			type: "boolean",
			defaultValue: false,
		},
		{
			longFlag: "--mcp-servers",
			description: "Comma-separated list of MCP servers to configure",
			type: "string",
		},
	],
	handler: handleBootstrap,
	aliases: ["init", "setup"],
	category: "setup",
}

export { handleBootstrap }