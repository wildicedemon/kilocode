// kilocode_change - new file

/**
 * Deep Scanner Service - Type Definitions
 *
 * This module contains all TypeScript interfaces and types for the deep scanner
 * service, including scan passes, findings, state management, and pattern definitions.
 */

// =============================================================================
// SCAN PASS TYPES
// =============================================================================

/**
 * Valid scan pass types for code analysis
 */
export type ScanPass = "anti-patterns" | "architecture" | "performance" | "security"

/**
 * All available scan passes
 */
export const ALL_SCAN_PASSES: ScanPass[] = ["anti-patterns", "architecture", "performance", "security"]

// =============================================================================
// FINDING TYPES
// =============================================================================

/**
 * Severity levels for scanner findings
 */
export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info"

/**
 * Represents a single finding from a scan pass
 */
export interface Finding {
	/** Unique identifier for this finding */
	id: string
	/** Severity level of the finding */
	severity: FindingSeverity
	/** Human-readable message describing the finding */
	message: string
	/** File path where the finding was detected (relative to workspace) */
	file: string
	/** Line number where the finding was detected (1-based) */
	line: number
	/** Column number where the finding was detected (1-based) */
	column: number
	/** The scan pass that detected this finding */
	pass: ScanPass
	/** Optional code snippet showing the issue */
	codeSnippet?: string
	/** Optional suggestion for fixing the issue */
	suggestion?: string
	/** Optional pattern ID that matched this finding */
	patternId?: string
	/** Optional additional metadata */
	metadata?: Record<string, unknown>
	/** Timestamp when the finding was detected */
	timestamp: string
}

/**
 * Configuration for a finding filter
 */
export interface FindingFilter {
	/** Minimum severity to include */
	minSeverity?: FindingSeverity
	/** Scan passes to include */
	passes?: ScanPass[]
	/** File patterns to include (glob patterns) */
	includeFiles?: string[]
	/** File patterns to exclude (glob patterns) */
	excludeFiles?: string[]
}

// =============================================================================
// SCANNER STATE
// =============================================================================

/**
 * State for a single scan pass
 */
export interface ScanPassState {
	/** The pass name */
	name: ScanPass
	/** Whether the pass is enabled */
	enabled: boolean
	/** Timestamp when pass was last run */
	lastRun?: string
	/** Number of findings from last run */
	findingsCount: number
	/** Duration of last run in milliseconds */
	lastDuration?: number
	/** Error message if pass failed */
	error?: string
}

/**
 * Complete scanner state for persistence
 */
export interface ScannerState {
	/** Scanner version that created this state */
	version: string
	/** Timestamp when state was created */
	created_at: string
	/** Timestamp when state was last updated */
	updated_at: string
	/** Total number of scans performed */
	totalScans: number
	/** State for each scan pass */
	passes: Record<ScanPass, ScanPassState>
	/** Findings from the last scan */
	lastFindings: Finding[]
	/** Whether continuous scanning is active */
	continuousMode: boolean
	/** Workspace path being scanned */
	workspacePath: string
}

// =============================================================================
// SCANNER CONFIGURATION
// =============================================================================

/**
 * Progress callback for scan operations
 */
export type ProgressCallback = (event: ScanProgressEvent) => void

/**
 * Progress event types
 */
export type ScanProgressEventType =
	| "scan_started"
	| "pass_started"
	| "pass_progress"
	| "pass_completed"
	| "scan_completed"
	| "scan_error"

/**
 * Progress event for scan operations
 */
export interface ScanProgressEvent {
	/** Event type */
	type: ScanProgressEventType
	/** Current scan pass (if applicable) */
	pass?: ScanPass
	/** Progress percentage (0-100) */
	progress?: number
	/** Human-readable status message */
	message: string
	/** Number of files processed */
	filesProcessed?: number
	/** Total number of files to process */
	totalFiles?: number
	/** Findings so far */
	findings?: Finding[]
	/** Error (if applicable) */
	error?: Error
	/** Timestamp of the event */
	timestamp: string
}

/**
 * Scanner configuration options
 */
export interface ScannerConfig {
	/** Enable the scanner */
	enabled: boolean
	/** Scan passes to run */
	passes: ScanPass[]
	/** Enable continuous scanning mode */
	continuous: boolean
	/** Interval between continuous scans in milliseconds */
	continuousInterval?: number
	/** Path to state persistence file */
	stateFile: string
	/** Path to pattern repertoire file */
	repertoireFile: string
	/** MCP servers to use for enhanced analysis */
	mcpServers: string[]
	/** File patterns to exclude from scanning */
	excludePatterns?: string[]
	/** Maximum number of findings to report per pass */
	maxFindingsPerPass?: number
	/** Maximum file size to scan in bytes */
	maxFileSize?: number
	/** Enable verbose logging */
	verbose?: boolean
}

/**
 * Default scanner configuration
 */
export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
	enabled: true,
	passes: [...ALL_SCAN_PASSES],
	continuous: false,
	continuousInterval: 60000, // 1 minute
	stateFile: ".framework/scanner-state.md",
	repertoireFile: ".framework/scanner-repertoire.md",
	mcpServers: [],
	excludePatterns: [
		"**/node_modules/**",
		"**/dist/**",
		"**/build/**",
		"**/.git/**",
		"**/*.min.js",
		"**/*.min.css",
	],
	maxFindingsPerPass: 100,
	maxFileSize: 1024 * 1024, // 1MB
	verbose: false,
}

// =============================================================================
// PATTERN DEFINITIONS
// =============================================================================

/**
 * Pattern match types
 */
export type PatternMatchType = "regex" | "ast" | "semantic" | "hybrid"

/**
 * Pattern severity mapping
 */
export type PatternSeverityMapping = FindingSeverity | "dynamic"

/**
 * Definition of a detectable pattern
 */
export interface PatternDefinition {
	/** Unique pattern identifier */
	id: string
	/** Human-readable pattern name */
	name: string
	/** Pattern description */
	description: string
	/** The scan pass this pattern belongs to */
	pass: ScanPass
	/** Default severity for findings from this pattern */
	severity: PatternSeverityMapping
	/** Type of pattern matching to use */
	matchType: PatternMatchType
	/** Regex pattern (for regex/hybrid types) */
	pattern?: string
	/** AST pattern selector (for ast/hybrid types) */
	astPattern?: string
	/** Semantic pattern description (for semantic type) */
	semanticPattern?: string
	/** File patterns to apply this pattern to */
	filePatterns?: string[]
	/** File patterns to exclude */
	excludePatterns?: string[]
	/** Suggested fix for this pattern */
	suggestion?: string
	/** Additional metadata */
	metadata?: Record<string, unknown>
	/** Whether this pattern is enabled */
	enabled: boolean
}

/**
 * Pattern category for organization
 */
export interface PatternCategory {
	/** Category identifier */
	id: string
	/** Category name */
	name: string
	/** Category description */
	description: string
	/** Patterns in this category */
	patterns: PatternDefinition[]
}

/**
 * Pattern repertoire containing all patterns
 */
export interface PatternRepertoire {
	/** Repertoire version */
	version: string
	/** Timestamp when repertoire was last updated */
	updated_at: string
	/** Pattern categories */
	categories: PatternCategory[]
	/** All patterns (flattened) */
	patterns: PatternDefinition[]
}

// =============================================================================
// SCAN RESULTS
// =============================================================================

/**
 * Result of a single scan pass
 */
export interface ScanPassResult {
	/** The scan pass that was run */
	pass: ScanPass
	/** Whether the pass was successful */
	success: boolean
	/** Findings from this pass */
	findings: Finding[]
	/** Duration of the pass in milliseconds */
	duration: number
	/** Number of files scanned */
	filesScanned: number
	/** Error message if pass failed */
	error?: string
	/** Timestamp when pass started */
	startedAt: string
	/** Timestamp when pass completed */
	completedAt: string
}

/**
 * Result of a complete scan (all passes)
 */
export interface ScanResult {
	/** Whether the scan was successful */
	success: boolean
	/** Results for each pass */
	passResults: ScanPassResult[]
	/** All findings aggregated */
	findings: Finding[]
	/** Total duration in milliseconds */
	totalDuration: number
	/** Total files scanned */
	totalFilesScanned: number
	/** Timestamp when scan started */
	startedAt: string
	/** Timestamp when scan completed */
	completedAt: string
	/** Error message if scan failed */
	error?: string
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Scanner error class
 */
export class ScannerError extends Error {
	override cause?: Error
	readonly code: string
	readonly pass?: ScanPass

	constructor(message: string, code: string, cause?: Error, pass?: ScanPass) {
		super(message)
		this.name = "ScannerError"
		this.code = code
		this.cause = cause
		this.pass = pass
	}
}

/**
 * Pattern matcher error class
 */
export class PatternMatcherError extends Error {
	override cause?: Error
	readonly patternId?: string

	constructor(message: string, cause?: Error, patternId?: string) {
		super(message)
		this.name = "PatternMatcherError"
		this.cause = cause
		this.patternId = patternId
	}
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * File information for scanning
 */
export interface FileInfo {
	/** File path relative to workspace */
	path: string
	/** Absolute file path */
	absolutePath: string
	/** File extension */
	extension: string
	/** File size in bytes */
	size: number
	/** File content (if loaded) */
	content?: string
	/** Whether the file is binary */
	isBinary: boolean
}

/**
 * Options for the DeepScanner constructor
 */
export interface DeepScannerOptions {
	/** Scanner configuration */
	config: Partial<ScannerConfig>
	/** Path to state file (overrides config.stateFile) */
	statePath?: string
	/** Workspace root path */
	workspacePath?: string
	/** Progress callback for scan operations */
	onProgress?: ProgressCallback
}
