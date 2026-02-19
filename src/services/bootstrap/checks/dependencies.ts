// kilocode_change - new file

/**
 * Bootstrap Dependency Installation
 *
 * This module provides functions to install and manage dependencies
 * for the Kilo Framework, including MCP servers, Playwright, LangGraph,
 * and Langfuse SDK.
 */

import type {
	DependencyConfig,
	DependencyInstallResult,
	DependencyStatus,
	PackageManager,
} from "../types"

// =============================================================================
// DEFAULT DEPENDENCIES
// =============================================================================

/**
 * Default MCP server dependencies
 */
export const DEFAULT_MCP_DEPENDENCIES: DependencyConfig[] = [
	{
		id: "codegraph-context",
		name: "CodeGraphContext MCP Server",
		package: "@kilocode/mcp-codegraph-context",
		version: "latest",
		required: false,
		packageManager: "npm",
		global: false,
		description: "Code graph context for enhanced code analysis",
	},
	{
		id: "rag-memory",
		name: "RAG Memory MCP Server",
		package: "@kilocode/mcp-rag-memory",
		version: "latest",
		required: false,
		packageManager: "npm",
		global: false,
		description: "RAG-based memory for context persistence",
	},
	{
		id: "taskmaster",
		name: "TaskMaster MCP Server",
		package: "@kilocode/mcp-taskmaster",
		version: "latest",
		required: false,
		packageManager: "npm",
		global: false,
		description: "Task management and orchestration",
	},
]

/**
 * Default tool dependencies
 */
export const DEFAULT_TOOL_DEPENDENCIES: DependencyConfig[] = [
	{
		id: "playwright",
		name: "Playwright",
		package: "playwright",
		version: "latest",
		required: false,
		packageManager: "npm",
		global: false,
		description: "Browser automation for testing",
	},
	{
		id: "langgraph",
		name: "LangGraph",
		package: "@langchain/langgraph",
		version: "latest",
		required: false,
		packageManager: "npm",
		global: false,
		description: "Graph-based agent orchestration",
	},
	{
		id: "langfuse",
		name: "Langfuse SDK",
		package: "langfuse",
		version: "latest",
		required: false,
		packageManager: "npm",
		global: false,
		description: "Observability and tracing",
	},
]

/**
 * All default dependencies
 */
export const ALL_DEFAULT_DEPENDENCIES = [
	...DEFAULT_MCP_DEPENDENCIES,
	...DEFAULT_TOOL_DEPENDENCIES,
]

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the current process information safely
 */
function getProcessInfo(): {
	platform: string
	cwd: () => string
	env: Record<string, string | undefined>
} {
	const proc = (globalThis as unknown as { 
		process?: { 
			platform?: string
			cwd?: () => string
			env?: Record<string, string | undefined>
		} 
	}).process

	return {
		platform: proc?.platform ?? "linux",
		cwd: () => proc?.cwd?.() ?? ".",
		env: proc?.env ?? {},
	}
}

/**
 * Detect available package manager
 */
async function detectPackageManager(): Promise<PackageManager> {
	// @ts-expect-error - Dynamic import for Node.js built-in module
	const { spawn } = await import("child_process")
	
	const checkCommand = (cmd: string): Promise<boolean> => {
		return new Promise((resolve) => {
			const child = spawn(cmd, ["--version"], { shell: true })
			child.on("close", (code: number | null) => resolve(code === 0))
			child.on("error", () => resolve(false))
		})
	}

	// Prefer pnpm, then yarn, then npm
	if (await checkCommand("pnpm")) return "pnpm"
	if (await checkCommand("yarn")) return "yarn"
	return "npm"
}

/**
 * Get the install command for a package manager
 */
function getInstallCommand(
	packageManager: PackageManager,
	global: boolean,
	packageSpec: string
): { command: string; args: string[] } {
	switch (packageManager) {
		case "pnpm":
			return {
				command: "pnpm",
				args: global 
					? ["add", "-g", packageSpec] 
					: ["add", packageSpec],
			}
		case "yarn":
			return {
				command: "yarn",
				args: global 
					? ["global", "add", packageSpec] 
					: ["add", packageSpec],
			}
		case "npm":
		default:
			return {
				command: "npm",
				args: global 
					? ["install", "-g", packageSpec] 
					: ["install", packageSpec],
			}
	}
}

/**
 * Check if a package is already installed
 */
async function isPackageInstalled(
	packageName: string,
	workspacePath: string
): Promise<boolean> {
	try {
		// @ts-expect-error - Dynamic import for Node.js built-in module
		const fs = await import("fs/promises")
		// @ts-expect-error - Dynamic import for Node.js built-in module
		const path = await import("path")
		
		// Check node_modules
		const nodeModulesPath = path.join(workspacePath, "node_modules", packageName)
		try {
			await fs.access(nodeModulesPath)
			return true
		} catch {
			// Not in local node_modules
		}

		// Check package.json
		const packageJsonPath = path.join(workspacePath, "package.json")
		try {
			const content = await fs.readFile(packageJsonPath, "utf-8")
			const packageJson = JSON.parse(content)
			const allDeps = {
				...packageJson.dependencies,
				...packageJson.devDependencies,
				...packageJson.optionalDependencies,
			}
			return packageName in allDeps
		} catch {
			return false
		}
	} catch {
		return false
	}
}

/**
 * Get installed version of a package
 */
async function getInstalledVersion(
	packageName: string,
	workspacePath: string
): Promise<string | undefined> {
	try {
		// @ts-expect-error - Dynamic import for Node.js built-in module
		const fs = await import("fs/promises")
		// @ts-expect-error - Dynamic import for Node.js built-in module
		const path = await import("path")
		
		const packageJsonPath = path.join(
			workspacePath,
			"node_modules",
			packageName,
			"package.json"
		)
		
		try {
			const content = await fs.readFile(packageJsonPath, "utf-8")
			const packageJson = JSON.parse(content)
			return packageJson.version
		} catch {
			return undefined
		}
	} catch {
		return undefined
	}
}

// =============================================================================
// INSTALLATION FUNCTIONS
// =============================================================================

/**
 * Install a single dependency
 */
export async function installDependency(
	dependency: DependencyConfig,
	workspacePath?: string
): Promise<DependencyInstallResult> {
	const startTime = Date.now()
	const { cwd } = getProcessInfo()
	const targetPath = workspacePath ?? cwd()

	try {
		// Check if already installed
		const isInstalled = await isPackageInstalled(dependency.package, targetPath)
		if (isInstalled) {
			const installedVersion = await getInstalledVersion(dependency.package, targetPath)
			return {
				dependency,
				status: "installed",
				message: `${dependency.name} is already installed`,
				installedVersion,
				duration: Date.now() - startTime,
			}
		}

		// Detect package manager
		const packageManager = dependency.packageManager ?? await detectPackageManager()
		const packageSpec = dependency.version 
			? `${dependency.package}@${dependency.version}`
			: dependency.package

		const { command, args } = getInstallCommand(
			packageManager,
			dependency.global,
			packageSpec
		)

		// Run install command
		// @ts-expect-error - Dynamic import for Node.js built-in module
		const { spawn } = await import("child_process")
		
		const installResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
			const child = spawn(command, args, {
				shell: true,
				cwd: dependency.global ? undefined : targetPath,
			})

			let stderr = ""
			child.stderr?.on("data", (data: unknown) => {
				stderr += String(data)
			})

			child.on("close", (code: number | null) => {
				resolve({
					success: code === 0,
					error: code !== 0 ? stderr : undefined,
				})
			})

			child.on("error", (err: Error) => {
				resolve({
					success: false,
					error: err.message,
				})
			})
		})

		if (installResult.success) {
			const installedVersion = await getInstalledVersion(dependency.package, targetPath)
			return {
				dependency,
				status: "installed",
				message: `${dependency.name} installed successfully`,
				installedVersion,
				duration: Date.now() - startTime,
			}
		} else {
			return {
				dependency,
				status: "error",
				message: `Failed to install ${dependency.name}`,
				error: installResult.error,
				duration: Date.now() - startTime,
			}
		}
	} catch (error) {
		return {
			dependency,
			status: "error",
			message: `Failed to install ${dependency.name}`,
			error: error instanceof Error ? error.message : String(error),
			duration: Date.now() - startTime,
		}
	}
}

/**
 * Install multiple dependencies
 */
export async function installDependencies(
	dependencies: DependencyConfig[],
	workspacePath?: string,
	options?: {
		parallel?: boolean
		onProgress?: (result: DependencyInstallResult) => void
	}
): Promise<DependencyInstallResult[]> {
	const results: DependencyInstallResult[] = []

	if (options?.parallel) {
		// Install all in parallel
		const promises = dependencies.map(async (dep) => {
			const result = await installDependency(dep, workspacePath)
			if (options?.onProgress) {
				options.onProgress(result)
			}
			return result
		})
		results.push(...await Promise.all(promises))
	} else {
		// Install sequentially
		for (const dep of dependencies) {
			const result = await installDependency(dep, workspacePath)
			if (options?.onProgress) {
				options.onProgress(result)
			}
			results.push(result)
		}
	}

	return results
}

/**
 * Check status of a dependency
 */
export async function checkDependencyStatus(
	dependency: DependencyConfig,
	workspacePath?: string
): Promise<DependencyStatus> {
	const { cwd } = getProcessInfo()
	const targetPath = workspacePath ?? cwd()

	const isInstalled = await isPackageInstalled(dependency.package, targetPath)
	if (!isInstalled) {
		return "missing"
	}

	// Could add version comparison here for "outdated" status
	return "installed"
}

/**
 * Get summary of dependency installation results
 */
export function getDependencyInstallSummary(results: DependencyInstallResult[]): {
	installed: number
	alreadyInstalled: number
	failed: number
	total: number
} {
	let installed = 0
	let alreadyInstalled = 0
	let failed = 0

	for (const result of results) {
		switch (result.status) {
			case "installed":
				if (result.duration && result.duration > 0) {
					installed++
				} else {
					alreadyInstalled++
				}
				break
			case "missing":
				alreadyInstalled++
				break
			case "error":
				failed++
				break
			case "outdated":
				alreadyInstalled++
				break
		}
	}

	return {
		installed,
		alreadyInstalled,
		failed,
		total: results.length,
	}
}

/**
 * Install workspace dependencies (npm/pnpm install)
 */
export async function installWorkspaceDependencies(
	workspacePath?: string
): Promise<DependencyInstallResult> {
	const startTime = Date.now()
	const { cwd } = getProcessInfo()
	const targetPath = workspacePath ?? cwd()

	try {
		// Check for package.json
		// @ts-expect-error - Dynamic import for Node.js built-in module
		const fs = await import("fs/promises")
		// @ts-expect-error - Dynamic import for Node.js built-in module
		const path = await import("path")
		
		const packageJsonPath = path.join(targetPath, "package.json")
		try {
			await fs.access(packageJsonPath)
		} catch {
			return {
				dependency: {
					id: "workspace",
					name: "Workspace Dependencies",
					package: "package.json",
					required: true,
					packageManager: "npm",
					global: false,
				},
				status: "missing",
				message: "No package.json found in workspace",
				duration: Date.now() - startTime,
			}
		}

		// Check if node_modules exists
		const nodeModulesPath = path.join(targetPath, "node_modules")
		try {
			await fs.access(nodeModulesPath)
			return {
				dependency: {
					id: "workspace",
					name: "Workspace Dependencies",
					package: "package.json",
					required: true,
					packageManager: "npm",
					global: false,
				},
				status: "installed",
				message: "Dependencies already installed",
				duration: Date.now() - startTime,
			}
		} catch {
			// node_modules doesn't exist, need to install
		}

		// Detect and run install
		const packageManager = await detectPackageManager()
		// @ts-expect-error - Dynamic import for Node.js built-in module
		const { spawn } = await import("child_process")

		const installResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
			const child = spawn(packageManager, ["install"], {
				shell: true,
				cwd: targetPath,
			})

			let stderr = ""
			child.stderr?.on("data", (data: unknown) => {
				stderr += String(data)
			})

			child.on("close", (code: number | null) => {
				resolve({
					success: code === 0,
					error: code !== 0 ? stderr : undefined,
				})
			})

			child.on("error", (err: Error) => {
				resolve({
					success: false,
					error: err.message,
				})
			})
		})

		if (installResult.success) {
			return {
				dependency: {
					id: "workspace",
					name: "Workspace Dependencies",
					package: "package.json",
					required: true,
					packageManager: packageManager,
					global: false,
				},
				status: "installed",
				message: "Workspace dependencies installed successfully",
				duration: Date.now() - startTime,
			}
		} else {
			return {
				dependency: {
					id: "workspace",
					name: "Workspace Dependencies",
					package: "package.json",
					required: true,
					packageManager: packageManager,
					global: false,
				},
				status: "error",
				message: "Failed to install workspace dependencies",
				error: installResult.error,
				duration: Date.now() - startTime,
			}
		}
	} catch (error) {
		return {
			dependency: {
				id: "workspace",
				name: "Workspace Dependencies",
				package: "package.json",
				required: true,
				packageManager: "npm",
				global: false,
			},
			status: "error",
			message: "Failed to install workspace dependencies",
			error: error instanceof Error ? error.message : String(error),
			duration: Date.now() - startTime,
		}
	}
}
