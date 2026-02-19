// kilocode_change - new file

/**
 * Deep Scanner Service - Main Scanner Engine
 *
 * This module provides the main scanner engine for deep code analysis,
 * including multiple scan passes, state persistence, and continuous scanning.
 */

import * as fs from "fs/promises"
import * as path from "path"
import type {
	ScanPass,
	Finding,
	ScannerState,
	ScannerConfig,
	ScanResult,
	ScanPassResult,
	ScanProgressEvent,
	ProgressCallback,
	DeepScannerOptions,
	FileInfo,
	ScanPassState,
} from "./types"
import { DEFAULT_SCANNER_CONFIG, ALL_SCAN_PASSES, ScannerError } from "./types"
import { PatternMatcher } from "./pattern-matcher"

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets the current working directory safely
 */
function getCwd(): string {
	const proc = (globalThis as unknown as { process?: { cwd?: () => string } }).process
	return proc?.cwd?.() ?? "."
}

/**
 * Type guard for ENOENT errors
 */
function isEnoentError(error: unknown): boolean {
	return (
		error !== null &&
		typeof error === "object" &&
		"code" in error &&
		(error as { code: string }).code === "ENOENT"
	)
}

/**
 * Creates an initial scan pass state
 */
function createInitialPassState(name: ScanPass): ScanPassState {
	return {
		name,
		enabled: true,
		findingsCount: 0,
	}
}

/**
 * Creates an initial scanner state
 */
function createInitialState(workspacePath: string): ScannerState {
	const now = new Date().toISOString()
	return {
		version: "1.0.0",
		created_at: now,
		updated_at: now,
		totalScans: 0,
		passes: {
			"anti-patterns": createInitialPassState("anti-patterns"),
			architecture: createInitialPassState("architecture"),
			performance: createInitialPassState("performance"),
			security: createInitialPassState("security"),
		},
		lastFindings: [],
		continuousMode: false,
		workspacePath,
	}
}

/**
 * Gets file extension from path
 */
function getFileExtension(filePath: string): string {
	const ext = path.extname(filePath)
	return ext.toLowerCase()
}

/**
 * Checks if a file is binary based on extension
 */
function isBinaryFile(filePath: string): boolean {
	const binaryExtensions = [
		".png",
		".jpg",
		".jpeg",
		".gif",
		".ico",
		".svg",
		".woff",
		".woff2",
		".ttf",
		".eot",
		".mp3",
		".mp4",
		".avi",
		".mov",
		".pdf",
		".zip",
		".tar",
		".gz",
		".rar",
		".7z",
		".exe",
		".dll",
		".so",
		".dylib",
	]
	return binaryExtensions.includes(getFileExtension(filePath))
}

// =============================================================================
// DEEP SCANNER CLASS
// =============================================================================

/**
 * Deep Scanner
 *
 * Main scanner engine for deep code analysis. Supports multiple scan passes,
 * state persistence, and continuous scanning mode.
 *
 * @example
 * ```typescript
 * const scanner = new DeepScanner({
 *   config: { enabled: true, passes: ['security'] }
 * })
 *
 * await scanner.initialize()
 * const findings = await scanner.run('security')
 * ```
 */
export class DeepScanner {
	private config: ScannerConfig
	private readonly statePath: string
	private readonly workspacePath: string
	private state: ScannerState | null = null
	private patternMatcher: PatternMatcher | null = null
	private onProgress?: ProgressCallback
	private continuousScanTimer: ReturnType<typeof setInterval> | null = null
	private isScanning = false
	private shouldStop = false

	/**
	 * Creates a new DeepScanner instance
	 *
	 * @param options - Scanner options
	 */
	constructor(options: DeepScannerOptions) {
		this.workspacePath = options.workspacePath ?? getCwd()
		this.config = { ...DEFAULT_SCANNER_CONFIG, ...options.config }
		this.statePath = options.statePath ?? path.join(this.workspacePath, this.config.stateFile)
		this.onProgress = options.onProgress
	}

	/**
	 * Initializes the scanner.
	 * Loads state and pattern repertoire.
	 *
	 * @throws ScannerError if initialization fails
	 */
	async initialize(): Promise<void> {
		try {
			// Load or create state
			this.state = await this.loadState()

			// Initialize pattern matcher
			this.patternMatcher = new PatternMatcher({
				workspacePath: this.workspacePath,
				repertoirePath: path.join(this.workspacePath, this.config.repertoireFile),
			})

			// Load repertoire to validate patterns
			await this.patternMatcher.loadRepertoire()

			this.emitProgress({
				type: "scan_started",
				message: "Scanner initialized successfully",
				timestamp: new Date().toISOString(),
			})
		} catch (error) {
			throw new ScannerError(
				`Failed to initialize scanner: ${error instanceof Error ? error.message : String(error)}`,
				"INIT_FAILED",
				error instanceof Error ? error : undefined,
			)
		}
	}

	/**
	 * Runs a specific scan pass or all passes.
	 *
	 * @param pass - Optional specific pass to run (runs all if not specified)
	 * @returns Array of findings from the scan
	 */
	async run(pass?: ScanPass): Promise<Finding[]> {
		if (!this.state || !this.patternMatcher) {
			throw new ScannerError("Scanner not initialized. Call initialize() first.", "NOT_INITIALIZED")
		}

		if (this.isScanning) {
			throw new ScannerError("Scan already in progress", "SCAN_IN_PROGRESS")
		}

		this.isScanning = true
		this.shouldStop = false

		const passes = pass ? [pass] : this.config.passes
		const result = await this.runScanPasses(passes)

		this.isScanning = false

		// Update state
		this.state.lastFindings = result.findings
		this.state.totalScans += 1
		this.state.updated_at = new Date().toISOString()
		await this.saveState()

		return result.findings
	}

	/**
	 * Runs the anti-patterns scan pass
	 */
	async runAntiPatternPass(): Promise<Finding[]> {
		return this.run("anti-patterns")
	}

	/**
	 * Runs the architecture scan pass
	 */
	async runArchitecturePass(): Promise<Finding[]> {
		return this.run("architecture")
	}

	/**
	 * Runs the performance scan pass
	 */
	async runPerformancePass(): Promise<Finding[]> {
		return this.run("performance")
	}

	/**
	 * Runs the security scan pass
	 */
	async runSecurityPass(): Promise<Finding[]> {
		return this.run("security")
	}

	/**
	 * Saves the current scanner state to disk
	 */
	async saveState(): Promise<void> {
		if (!this.state) {
			throw new ScannerError("No state to save", "NO_STATE")
		}

		try {
			// Ensure directory exists
			const dir = path.dirname(this.statePath)
			await fs.mkdir(dir, { recursive: true })

			// Write state as markdown
			const content = this.stateToMarkdown(this.state)
			await fs.writeFile(this.statePath, content, "utf-8")
		} catch (error) {
			throw new ScannerError(
				`Failed to save state: ${error instanceof Error ? error.message : String(error)}`,
				"SAVE_FAILED",
				error instanceof Error ? error : undefined,
			)
		}
	}

	/**
	 * Starts continuous scanning mode.
	 * Runs scans at the configured interval until stopped.
	 */
	async continuousScan(): Promise<void> {
		if (!this.state) {
			throw new ScannerError("Scanner not initialized. Call initialize() first.", "NOT_INITIALIZED")
		}

		if (this.continuousScanTimer) {
			throw new ScannerError("Continuous scan already running", "ALREADY_RUNNING")
		}

		this.state.continuousMode = true
		await this.saveState()

		const interval = this.config.continuousInterval ?? 60000

		this.emitProgress({
			type: "scan_started",
			message: `Starting continuous scan with ${interval}ms interval`,
			timestamp: new Date().toISOString(),
		})

		// Run initial scan
		await this.run()

		// Set up interval for subsequent scans
		this.continuousScanTimer = setInterval(async () => {
			if (this.shouldStop) {
				this.stopContinuousScan()
				return
			}

			try {
				await this.run()
			} catch (error) {
				this.emitProgress({
					type: "scan_error",
					message: `Continuous scan error: ${error instanceof Error ? error.message : String(error)}`,
					error: error instanceof Error ? error : new Error(String(error)),
					timestamp: new Date().toISOString(),
				})
			}
		}, interval)
	}

	/**
	 * Stops continuous scanning mode
	 */
	stop(): void {
		this.shouldStop = true
		this.stopContinuousScan()
	}

	/**
	 * Gets the current scanner state
	 */
	getState(): ScannerState {
		if (!this.state) {
			throw new ScannerError("Scanner not initialized", "NOT_INITIALIZED")
		}
		return this.state
	}

	/**
	 * Gets the current configuration
	 */
	getConfig(): ScannerConfig {
		return { ...this.config }
	}

	/**
	 * Updates the scanner configuration
	 */
	updateConfig(newConfig: Partial<ScannerConfig>): void {
		this.config = { ...this.config, ...newConfig }
	}

	/**
	 * Gets findings from the last scan
	 */
	getLastFindings(): Finding[] {
		return this.state?.lastFindings ?? []
	}

	/**
	 * Checks if a scan is currently in progress
	 */
	isCurrentlyScanning(): boolean {
		return this.isScanning
	}

	// =============================================================================
	// PRIVATE METHODS
	// =============================================================================

	/**
	 * Loads state from disk or creates initial state
	 */
	private async loadState(): Promise<ScannerState> {
		try {
			const content = await fs.readFile(this.statePath, "utf-8")
			return this.markdownToState(content)
		} catch (error) {
			if (isEnoentError(error)) {
				return createInitialState(this.workspacePath)
			}
			throw new ScannerError(
				`Failed to load state: ${error instanceof Error ? error.message : String(error)}`,
				"LOAD_FAILED",
				error instanceof Error ? error : undefined,
			)
		}
	}

	/**
	 * Runs multiple scan passes
	 */
	private async runScanPasses(passes: ScanPass[]): Promise<ScanResult> {
		const startTime = Date.now()
		const startedAt = new Date().toISOString()
		const passResults: ScanPassResult[] = []
		const allFindings: Finding[] = []

		this.emitProgress({
			type: "scan_started",
			message: `Starting scan with ${passes.length} pass(es)`,
			timestamp: startedAt,
		})

		for (const pass of passes) {
			if (this.shouldStop) {
				break
			}

			const passResult = await this.runSinglePass(pass)
			passResults.push(passResult)
			allFindings.push(...passResult.findings)
		}

		const completedAt = new Date().toISOString()
		const totalDuration = Date.now() - startTime

		this.emitProgress({
			type: "scan_completed",
			message: `Scan completed with ${allFindings.length} finding(s)`,
			findings: allFindings,
			timestamp: completedAt,
		})

		return {
			success: !passResults.some((r) => !r.success),
			passResults,
			findings: allFindings,
			totalDuration,
			totalFilesScanned: passResults.reduce((sum, r) => sum + r.filesScanned, 0),
			startedAt,
			completedAt,
		}
	}

	/**
	 * Runs a single scan pass
	 */
	private async runSinglePass(pass: ScanPass): Promise<ScanPassResult> {
		const startTime = Date.now()
		const startedAt = new Date().toISOString()

		this.emitProgress({
			type: "pass_started",
			pass,
			message: `Starting ${pass} scan pass`,
			timestamp: startedAt,
		})

		try {
			// Get files to scan
			const files = await this.getFilesToScan(pass)
			const findings: Finding[] = []
			let filesScanned = 0

			// Scan each file
			for (const fileInfo of files) {
				if (this.shouldStop) {
					break
				}

				// Load file content if not already loaded
				if (!fileInfo.content) {
					try {
						fileInfo.content = await fs.readFile(fileInfo.absolutePath, "utf-8")
					} catch {
						// Skip files that can't be read
						continue
					}
				}

				// Match patterns
				const fileFindings = await this.patternMatcher!.matchFile(fileInfo, pass)
				findings.push(...fileFindings)
				filesScanned += 1

				// Emit progress
				this.emitProgress({
					type: "pass_progress",
					pass,
					progress: (filesScanned / files.length) * 100,
					message: `Scanned ${filesScanned}/${files.length} files`,
					filesProcessed: filesScanned,
					totalFiles: files.length,
					findings,
					timestamp: new Date().toISOString(),
				})
			}

			// Limit findings
			const limitedFindings = findings.slice(0, this.config.maxFindingsPerPass ?? 100)

			// Update pass state
			if (this.state) {
				const passState = this.state.passes[pass]
				passState.lastRun = startedAt
				passState.findingsCount = limitedFindings.length
				passState.lastDuration = Date.now() - startTime
				passState.error = undefined
			}

			const completedAt = new Date().toISOString()

			this.emitProgress({
				type: "pass_completed",
				pass,
				message: `${pass} pass completed with ${limitedFindings.length} finding(s)`,
				findings: limitedFindings,
				timestamp: completedAt,
			})

			return {
				pass,
				success: true,
				findings: limitedFindings,
				duration: Date.now() - startTime,
				filesScanned,
				startedAt,
				completedAt,
			}
		} catch (error) {
			const completedAt = new Date().toISOString()

			// Update pass state with error
			if (this.state) {
				const passState = this.state.passes[pass]
				passState.lastRun = startedAt
				passState.error = error instanceof Error ? error.message : String(error)
			}

			this.emitProgress({
				type: "scan_error",
				pass,
				message: `${pass} pass failed: ${error instanceof Error ? error.message : String(error)}`,
				error: error instanceof Error ? error : new Error(String(error)),
				timestamp: completedAt,
			})

			return {
				pass,
				success: false,
				findings: [],
				duration: Date.now() - startTime,
				filesScanned: 0,
				error: error instanceof Error ? error.message : String(error),
				startedAt,
				completedAt,
			}
		}
	}

	/**
	 * Gets files to scan for a pass
	 */
	private async getFilesToScan(pass: ScanPass): Promise<FileInfo[]> {
		const files: FileInfo[] = []
		const excludePatterns = this.config.excludePatterns ?? []

		// Walk the workspace directory
		await this.walkDirectory(this.workspacePath, files, excludePatterns)

		return files
	}

	/**
	 * Recursively walks a directory and collects files
	 */
	private async walkDirectory(
		dir: string,
		files: FileInfo[],
		excludePatterns: string[],
	): Promise<void> {
		try {
			const entries = await fs.readdir(dir, { withFileTypes: true })

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name)
				const relativePath = path.relative(this.workspacePath, fullPath)

				// Check exclude patterns
				if (excludePatterns.some((pattern) => this.matchesPattern(relativePath, pattern))) {
					continue
				}

				if (entry.isDirectory()) {
					await this.walkDirectory(fullPath, files, excludePatterns)
				} else if (entry.isFile()) {
					// Skip binary files
					if (isBinaryFile(fullPath)) {
						continue
					}

					try {
						const stat = await fs.stat(fullPath)

						// Skip large files
						if (this.config.maxFileSize && stat.size > this.config.maxFileSize) {
							continue
						}

						files.push({
							path: relativePath,
							absolutePath: fullPath,
							extension: getFileExtension(fullPath),
							size: stat.size,
							isBinary: false,
						})
					} catch {
						// Skip files that can't be stat'd
						continue
					}
				}
			}
		} catch {
			// Skip directories that can't be read
		}
	}

	/**
	 * Checks if a path matches a glob pattern (simplified)
	 */
	private matchesPattern(filePath: string, pattern: string): boolean {
		// Convert glob pattern to regex (simplified)
		const regexPattern = pattern
			.replace(/\*\*/g, "<<<DOUBLE_STAR>>>")
			.replace(/\*/g, "[^/]*")
			.replace(/<<<DOUBLE_STAR>>>/g, ".*")
			.replace(/\?/g, "[^/]")
			.replace(/\./g, "\\.")

		const regex = new RegExp(`^${regexPattern}$`)
		return regex.test(filePath)
	}

	/**
	 * Emits a progress event
	 */
	private emitProgress(event: ScanProgressEvent): void {
		if (this.onProgress) {
			try {
				this.onProgress(event)
			} catch {
				// Ignore callback errors
			}
		}
	}

	/**
	 * Stops the continuous scan timer
	 */
	private stopContinuousScan(): void {
		if (this.continuousScanTimer) {
			clearInterval(this.continuousScanTimer)
			this.continuousScanTimer = null
		}

		if (this.state) {
			this.state.continuousMode = false
		}
	}

	/**
	 * Converts state to markdown format
	 */
	private stateToMarkdown(state: ScannerState): string {
		const lines: string[] = [
			"# Scanner State",
			"",
			`**Version:** ${state.version}`,
			`**Created:** ${state.created_at}`,
			`**Updated:** ${state.updated_at}`,
			`**Total Scans:** ${state.totalScans}`,
			`**Continuous Mode:** ${state.continuousMode}`,
			`**Workspace:** ${state.workspacePath}`,
			"",
			"## Pass States",
			"",
		]

		for (const pass of ALL_SCAN_PASSES) {
			const passState = state.passes[pass]
			lines.push(`### ${pass}`)
			lines.push("")
			lines.push(`- **Enabled:** ${passState.enabled}`)
			lines.push(`- **Last Run:** ${passState.lastRun ?? "Never"}`)
			lines.push(`- **Findings:** ${passState.findingsCount}`)
			lines.push(`- **Duration:** ${passState.lastDuration ?? "N/A"}ms`)
			if (passState.error) {
				lines.push(`- **Error:** ${passState.error}`)
			}
			lines.push("")
		}

		if (state.lastFindings.length > 0) {
			lines.push("## Last Findings")
			lines.push("")
			lines.push("```json")
			lines.push(JSON.stringify(state.lastFindings, null, 2))
			lines.push("```")
		}

		return lines.join("\n")
	}

	/**
	 * Parses markdown content to state
	 */
	private markdownToState(content: string): ScannerState {
		// Try to extract JSON from code block
		const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
		if (jsonMatch) {
			try {
				return JSON.parse(jsonMatch[1]) as ScannerState
			} catch {
				// Fall through to parse markdown
			}
		}

		// Parse markdown format
		const state = createInitialState(this.workspacePath)

		// Extract basic info
		const versionMatch = content.match(/\*\*Version:\*\*\s*(.+)/)
		if (versionMatch) {
			state.version = versionMatch[1].trim()
		}

		const totalScansMatch = content.match(/\*\*Total Scans:\*\*\s*(\d+)/)
		if (totalScansMatch) {
			state.totalScans = parseInt(totalScansMatch[1], 10)
		}

		const continuousMatch = content.match(/\*\*Continuous Mode:\*\*\s*(true|false)/)
		if (continuousMatch) {
			state.continuousMode = continuousMatch[1] === "true"
		}

		// Extract findings from JSON block
		if (jsonMatch) {
			try {
				const findings = JSON.parse(jsonMatch[1])
				if (Array.isArray(findings)) {
					state.lastFindings = findings
				}
			} catch {
				// Ignore parse errors
			}
		}

		return state
	}
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates and initializes a new DeepScanner instance
 *
 * @param options - Scanner options
 * @returns The initialized scanner
 */
export async function createDeepScanner(options: DeepScannerOptions): Promise<DeepScanner> {
	const scanner = new DeepScanner(options)
	await scanner.initialize()
	return scanner
}
