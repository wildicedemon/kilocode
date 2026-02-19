// kilocode_change - new file

/**
 * Bootstrap Environment Checks
 *
 * This module provides functions to check the environment prerequisites
 * for running the Kilo Framework, including Node.js, Python, Git, VS Code,
 * and Kilo Code extension checks.
 */

import type {
	EnvironmentCheck,
	EnvironmentCheckConfig,
} from "../types"
import { DEFAULT_ENVIRONMENT_CHECK_CONFIG } from "../types"

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the current process information safely
 * Works in both Node.js and VS Code extension host contexts
 */
function getProcessInfo(): {
	platform: string
	nodeVersion: string
	cwd: () => string
	env: Record<string, string | undefined>
} {
	// Use globalThis to safely access process in both contexts
	const proc = (globalThis as unknown as { 
		process?: { 
			platform?: string
			versions?: { node?: string }
			cwd?: () => string
			env?: Record<string, string | undefined>
		} 
	}).process

	return {
		platform: proc?.platform ?? "linux",
		nodeVersion: proc?.versions?.node ?? "0.0.0",
		cwd: () => proc?.cwd?.() ?? ".",
		env: proc?.env ?? {},
	}
}

/**
 * Check if a command exists in PATH
 */
async function commandExists(command: string): Promise<boolean> {
	try {
		const { platform } = getProcessInfo()
		const checkCmd = platform === "win32" ? "where" : "which"

		// @ts-expect-error - Dynamic import for Node.js built-in module
		const { spawn } = await import("child_process")
		return new Promise((resolve) => {
			const child = spawn(checkCmd, [command], { shell: true })
			child.on("close", (code: number | null) => resolve(code === 0))
			child.on("error", () => resolve(false))
		})
	} catch {
		return false
	}
}

/**
 * Execute a command and return its output
 */
async function executeCommand(command: string, args: string[] = []): Promise<{ stdout: string; stderr: string; code: number }> {
	try {
		// @ts-expect-error - Dynamic import for Node.js built-in module
		const { spawn } = await import("child_process")
		
		return new Promise((resolve) => {
			const child = spawn(command, args, { shell: true })
			let stdout = ""
			let stderr = ""

			child.stdout?.on("data", (data: unknown) => {
				stdout += String(data)
			})

			child.stderr?.on("data", (data: unknown) => {
				stderr += String(data)
			})

			child.on("close", (code: number | null) => {
				resolve({ stdout, stderr, code: code ?? 1 })
			})

			child.on("error", () => {
				resolve({ stdout: "", stderr: "Command failed to execute", code: 1 })
			})
		})
	} catch {
		return { stdout: "", stderr: "Command failed to execute", code: 1 }
	}
}

/**
 * Parse version string into comparable parts
 */
function parseVersion(version: string): number[] {
	const parts = version.replace(/[^\d.]/g, "").split(".").map(Number)
	return parts.length > 0 ? parts : [0]
}

/**
 * Compare two version strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
	const aParts = parseVersion(a)
	const bParts = parseVersion(b)

	for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
		const aVal = aParts[i] ?? 0
		const bVal = bParts[i] ?? 0
		if (aVal > bVal) return 1
		if (aVal < bVal) return -1
	}
	return 0
}

// =============================================================================
// INDIVIDUAL CHECKS
// =============================================================================

/**
 * Check Node.js version
 */
async function checkNodeVersion(config: EnvironmentCheckConfig): Promise<EnvironmentCheck> {
	const { nodeVersion } = getProcessInfo()
	const timestamp = new Date().toISOString()

	const [major] = parseVersion(nodeVersion)
	const minMajor = config.minNodeVersion
	const valid = major >= minMajor

	return {
		id: "node-version",
		name: "Node.js Version",
		status: valid ? "pass" : "fail",
		message: valid
			? `Node.js ${nodeVersion} (✓)`
			: `Node.js ${nodeVersion} is below minimum required version ${minMajor}.0.0`,
		details: {
			version: nodeVersion,
			minVersion: `${minMajor}.0.0`,
		},
		required: true,
		timestamp,
	}
}

/**
 * Check Python installation
 */
async function checkPython(config: EnvironmentCheckConfig): Promise<EnvironmentCheck> {
	const timestamp = new Date().toISOString()

	// Try python3 first, then python
	let pythonCmd = "python3"
	let exists = await commandExists(pythonCmd)

	if (!exists) {
		pythonCmd = "python"
		exists = await commandExists(pythonCmd)
	}

	if (!exists) {
		return {
			id: "python",
			name: "Python",
			status: config.minPythonVersion ? "warn" : "skip",
			message: "Python is not installed or not in PATH",
			details: { required: !!config.minPythonVersion },
			required: false,
			timestamp,
		}
	}

	// Get Python version
	const result = await executeCommand(pythonCmd, ["--version"])
	const versionMatch = result.stdout.match(/Python (\d+\.\d+\.\d+)/i)
	const version = versionMatch?.[1] ?? "unknown"

	// Check minimum version if specified
	if (config.minPythonVersion && version !== "unknown") {
		const meetsMin = compareVersions(version, config.minPythonVersion) >= 0
		return {
			id: "python",
			name: "Python",
			status: meetsMin ? "pass" : "warn",
			message: meetsMin
				? `Python ${version} found (${pythonCmd})`
				: `Python ${version} is below minimum ${config.minPythonVersion}`,
			details: { version, command: pythonCmd, minVersion: config.minPythonVersion },
			required: false,
			timestamp,
		}
	}

	return {
		id: "python",
		name: "Python",
		status: "pass",
		message: `Python ${version} found (${pythonCmd})`,
		details: { version, command: pythonCmd },
		required: false,
		timestamp,
	}
}

/**
 * Check Git installation
 */
async function checkGit(config: EnvironmentCheckConfig): Promise<EnvironmentCheck> {
	const timestamp = new Date().toISOString()

	if (!config.checkGit) {
		return {
			id: "git",
			name: "Git",
			status: "skip",
			message: "Git check skipped",
			required: false,
			timestamp,
		}
	}

	const exists = await commandExists("git")

	if (!exists) {
		return {
			id: "git",
			name: "Git",
			status: "warn",
			message: "Git is not installed or not in PATH",
			details: { recommendation: "Install Git for version control features" },
			required: false,
			timestamp,
		}
	}

	// Get Git version
	const result = await executeCommand("git", ["--version"])
	const versionMatch = result.stdout.match(/git version (\d+\.\d+\.\d+)/i)
	const version = versionMatch?.[1] ?? "unknown"

	return {
		id: "git",
		name: "Git",
		status: "pass",
		message: `Git ${version} installed`,
		details: { version },
		required: false,
		timestamp,
	}
}

/**
 * Check VS Code installation
 */
async function checkVsCode(config: EnvironmentCheckConfig): Promise<EnvironmentCheck> {
	const timestamp = new Date().toISOString()

	if (!config.checkVsCode) {
		return {
			id: "vscode",
			name: "VS Code",
			status: "skip",
			message: "VS Code check skipped",
			required: false,
			timestamp,
		}
	}

	const { platform } = getProcessInfo()
	const codeCmd = platform === "win32" ? "code" : platform === "darwin" ? "code" : "code"
	const exists = await commandExists(codeCmd)

	if (!exists) {
		return {
			id: "vscode",
			name: "VS Code",
			status: "warn",
			message: "VS Code CLI not found in PATH",
			details: { recommendation: "Install VS Code and add to PATH" },
			required: false,
			timestamp,
		}
	}

	// Get VS Code version
	const result = await executeCommand(codeCmd, ["--version"])
	const lines = result.stdout.split("\n").filter(Boolean)
	const version = lines[0] ?? "unknown"

	return {
		id: "vscode",
		name: "VS Code",
		status: "pass",
		message: `VS Code ${version} installed`,
		details: { version, command: codeCmd },
		required: false,
		timestamp,
	}
}

/**
 * Check Kilo Code extension
 */
async function checkKiloCode(config: EnvironmentCheckConfig): Promise<EnvironmentCheck> {
	const timestamp = new Date().toISOString()

	if (!config.checkKiloCode) {
		return {
			id: "kilocode",
			name: "Kilo Code Extension",
			status: "skip",
			message: "Kilo Code extension check skipped",
			required: false,
			timestamp,
		}
	}

	const { platform } = getProcessInfo()
	const codeCmd = platform === "win32" ? "code" : "code"

	// Check if VS Code CLI is available
	const codeExists = await commandExists(codeCmd)
	if (!codeExists) {
		return {
			id: "kilocode",
			name: "Kilo Code Extension",
			status: "warn",
			message: "Cannot check: VS Code CLI not available",
			required: false,
			timestamp,
		}
	}

	// List installed extensions
	const result = await executeCommand(codeCmd, ["--list-extensions"])
	const extensions = result.stdout.toLowerCase()

	if (extensions.includes("kilocode.kilo-code") || extensions.includes("kilo-code")) {
		return {
			id: "kilocode",
			name: "Kilo Code Extension",
			status: "pass",
			message: "Kilo Code extension is installed",
			details: { extensionId: "kilocode.kilo-code" },
			required: false,
			timestamp,
		}
	}

	return {
		id: "kilocode",
		name: "Kilo Code Extension",
		status: "warn",
		message: "Kilo Code extension not found",
		details: { recommendation: "Install Kilo Code extension from marketplace" },
		required: false,
		timestamp,
	}
}

/**
 * Check package manager availability
 */
async function checkPackageManager(): Promise<EnvironmentCheck> {
	const timestamp = new Date().toISOString()

	const npmExists = await commandExists("npm")
	const pnpmExists = await commandExists("pnpm")
	const yarnExists = await commandExists("yarn")

	const available: string[] = []
	if (npmExists) available.push("npm")
	if (pnpmExists) available.push("pnpm")
	if (yarnExists) available.push("yarn")

	if (available.length === 0) {
		return {
			id: "package-manager",
			name: "Package Manager",
			status: "fail",
			message: "No package manager found (npm, pnpm, or yarn required)",
			required: true,
			timestamp,
		}
	}

	return {
		id: "package-manager",
		name: "Package Manager",
		status: "pass",
		message: `Available: ${available.join(", ")}`,
		details: { npm: npmExists, pnpm: pnpmExists, yarn: yarnExists, preferred: pnpmExists ? "pnpm" : "npm" },
		required: true,
		timestamp,
	}
}

/**
 * Check workspace directory access
 */
async function checkWorkspaceAccess(): Promise<EnvironmentCheck> {
	const timestamp = new Date().toISOString()
	const { cwd, env } = getProcessInfo()

	try {
		const workspacePath = env.WORKSPACE_PATH ?? cwd()
		// @ts-expect-error - Dynamic import for Node.js built-in module
		const fs = await import("fs/promises")
		const stats = await fs.stat(workspacePath)

		return {
			id: "workspace",
			name: "Workspace Access",
			status: "pass",
			message: `Workspace directory is accessible`,
			details: { path: workspacePath, isDirectory: stats.isDirectory() },
			required: true,
			timestamp,
		}
	} catch (error) {
		return {
			id: "workspace",
			name: "Workspace Access",
			status: "fail",
			message: `Cannot access workspace: ${error instanceof Error ? error.message : String(error)}`,
			required: true,
			timestamp,
		}
	}
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Run all environment checks
 */
export async function runEnvironmentChecks(
	config: Partial<EnvironmentCheckConfig> = {}
): Promise<EnvironmentCheck[]> {
	const fullConfig: EnvironmentCheckConfig = {
		...DEFAULT_ENVIRONMENT_CHECK_CONFIG,
		...config,
	}

	const checks: EnvironmentCheck[] = []

	// Run all checks
	checks.push(await checkNodeVersion(fullConfig))
	checks.push(await checkPython(fullConfig))
	checks.push(await checkGit(fullConfig))
	checks.push(await checkVsCode(fullConfig))
	checks.push(await checkKiloCode(fullConfig))
	checks.push(await checkPackageManager())
	checks.push(await checkWorkspaceAccess())

	return checks
}

/**
 * Check if all required environment checks pass
 */
export function allRequiredChecksPass(checks: EnvironmentCheck[]): boolean {
	return checks.every((check) => !check.required || check.status === "pass")
}

/**
 * Get summary of environment check results
 */
export function getEnvironmentCheckSummary(checks: EnvironmentCheck[]): {
	passed: number
	warned: number
	failed: number
	skipped: number
	allRequiredPass: boolean
} {
	let passed = 0
	let warned = 0
	let failed = 0
	let skipped = 0

	for (const check of checks) {
		switch (check.status) {
			case "pass":
				passed++
				break
			case "warn":
				warned++
				break
			case "fail":
				failed++
				break
			case "skip":
				skipped++
				break
		}
	}

	return {
		passed,
		warned,
		failed,
		skipped,
		allRequiredPass: allRequiredChecksPass(checks),
	}
}

/**
 * Export individual check functions for testing
 */
export {
	checkNodeVersion,
	checkPython,
	checkGit,
	checkVsCode,
	checkKiloCode,
	checkPackageManager,
	checkWorkspaceAccess,
}
