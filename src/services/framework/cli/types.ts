// kilocode_change - new file

/**
 * CLI Type Definitions
 *
 * This module contains all TypeScript interfaces and types for the CLI,
 * including command definitions, options, and result types.
 */

import type { SdlcPhaseName, TaskStatus, ScannerPass } from "../types"

// =============================================================================
// COMMAND OPTION TYPES
// =============================================================================

/**
 * Option value types for command arguments
 */
export type OptionValueType = "string" | "number" | "boolean" | "array"

/**
 * Definition of a command line option
 */
export interface CommandOption {
	/** Short flag (e.g., '-v' for verbose) */
	shortFlag?: string
	/** Long flag (e.g., '--verbose') */
	longFlag: string
	/** Description for help text */
	description: string
	/** Value type */
	type: OptionValueType
	/** Default value if not provided */
	defaultValue?: string | number | boolean | string[]
	/** Whether this option is required */
	required?: boolean
	/** Environment variable to use as fallback */
	envVar?: string
}

/**
 * Definition of a positional argument
 */
export interface CommandArgument {
	/** Argument name */
	name: string
	/** Description for help text */
	description: string
	/** Whether this argument is required */
	required?: boolean
	/** Default value if not provided */
	defaultValue?: string
	/** Allow multiple values */
	variadic?: boolean
}

// =============================================================================
// COMMAND INTERFACE
// =============================================================================

/**
 * Command handler function type
 */
export type CommandHandler<T = unknown> = (args: ParsedArgs, options: CLIOptions) => Promise<CommandResult<T>>

/**
 * Complete command definition
 */
export interface Command<T = unknown> {
	/** Command name (e.g., 'start', 'scan') */
	name: string
	/** Short description for command list */
	description: string
	/** Long description for command help */
	longDescription?: string
	/** Command usage examples */
	examples?: string[]
	/** Available options for this command */
	options?: CommandOption[]
	/** Positional arguments */
	arguments?: CommandArgument[]
	/** Subcommands (if any) */
	subcommands?: Command[]
	/** Command handler function */
	handler: CommandHandler<T>
	/** Aliases for this command */
	aliases?: string[]
	/** Category for grouping in help */
	category?: string
}

// =============================================================================
// CLI OPTIONS
// =============================================================================

/**
 * Global CLI options available for all commands
 */
export interface CLIOptions {
	/** Show verbose output */
	verbose: boolean
	/** Output in JSON format */
	json: boolean
	/** Suppress all output except errors */
	quiet: boolean
	/** Use colored output */
	color: boolean
	/** Path to configuration file */
	config?: string
	/** Working directory */
	cwd?: string
	/** Dry run mode (no side effects) */
	dryRun: boolean
	/** Force operation even if unsafe */
	force: boolean
	/** Non-interactive mode */
	nonInteractive: boolean
	/** Log level */
	logLevel: "debug" | "info" | "warn" | "error"
}

/**
 * Default CLI options
 */
export const DEFAULT_CLI_OPTIONS: CLIOptions = {
	verbose: false,
	json: false,
	quiet: false,
	color: true,
	dryRun: false,
	force: false,
	nonInteractive: false,
	logLevel: "info",
}

// =============================================================================
// PARSED ARGUMENTS
// =============================================================================

/**
 * Parsed command line arguments
 */
export interface ParsedArgs {
	/** The command name that was parsed */
	command?: string
	/** Positional arguments */
	_: string[]
	/** Parsed options as key-value pairs */
	[key: string]: unknown
}

// =============================================================================
// COMMAND RESULT
// =============================================================================

/**
 * Result status from command execution
 */
export type CommandResultStatus = "success" | "error" | "cancelled" | "pending"

/**
 * Result of command execution
 */
export interface CommandResult<T = unknown> {
	/** Result status */
	status: CommandResultStatus
	/** Exit code (0 for success, non-zero for error) */
	exitCode: number
	/** Human-readable message */
	message?: string
	/** Error details if status is error */
	error?: Error
	/** Result data */
	data?: T
	/** Additional metadata */
	metadata?: Record<string, unknown>
	/** Duration in milliseconds */
	duration?: number
}

/**
 * Create a successful command result
 */
export function successResult<T>(data?: T, message?: string): CommandResult<T> {
	return {
		status: "success",
		exitCode: 0,
		message,
		data,
	}
}

/**
 * Create an error command result
 */
export function errorResult<T>(error: Error | string, exitCode = 1): CommandResult<T> {
	const err = typeof error === "string" ? new Error(error) : error
	return {
		status: "error",
		exitCode,
		error: err,
		message: err.message,
	}
}

/**
 * Create a cancelled command result
 */
export function cancelledResult<T>(message?: string): CommandResult<T> {
	return {
		status: "cancelled",
		exitCode: 130, // Standard exit code for SIGINT
		message: message ?? "Operation cancelled by user",
	}
}

// =============================================================================
// START COMMAND TYPES
// =============================================================================

/**
 * Options for the start command
 */
export interface StartCommandOptions {
	/** Phase to start from */
	phase?: SdlcPhaseName
	/** Resume from checkpoint */
	checkpoint?: string
	/** Skip phases before the specified phase */
	skipTo?: SdlcPhaseName
	/** Maximum iterations for implementation phase */
	maxIterations?: number
	/** Enable continuous scanning during implementation */
	continuousScan?: boolean
}

/**
 * Result from the start command
 */
export interface StartCommandResult {
	/** Session ID for this run */
	sessionId: string
	/** Starting phase */
	startPhase: SdlcPhaseName
	/** Whether resuming from checkpoint */
	resumed: boolean
	/** Checkpoint ID if resumed */
	checkpointId?: string
}

// =============================================================================
// STATUS COMMAND TYPES
// =============================================================================

/**
 * Options for the status command
 */
export interface StatusCommandOptions {
	/** Show detailed task information */
	detailed: boolean
	/** Output format */
	format: "text" | "json" | "markdown"
	/** Show resource usage */
	showResources: boolean
	/** Filter by phase */
	phase?: SdlcPhaseName
	/** Filter by task status */
	taskStatus?: TaskStatus
}

/**
 * Result from the status command
 */
export interface StatusCommandResult {
	/** Current SDLC phase */
	currentPhase: SdlcPhaseName | null
	/** Phase states */
	phases: PhaseStatusInfo[]
	/** Active tasks */
	activeTasks: TaskStatusInfo[]
	/** Resource usage */
	resources?: ResourceUsageInfo
	/** Last checkpoint */
	lastCheckpoint?: string
	/** Session duration in milliseconds */
	duration?: number
}

/**
 * Phase status information
 */
export interface PhaseStatusInfo {
	/** Phase name */
	name: SdlcPhaseName
	/** Whether phase is active */
	active: boolean
	/** Whether phase is completed */
	completed: boolean
	/** Number of tasks in phase */
	taskCount: number
	/** Number of completed tasks */
	completedTasks: number
	/** Phase start time */
	startedAt?: string
	/** Phase completion time */
	completedAt?: string
}

/**
 * Task status information
 */
export interface TaskStatusInfo {
	/** Task ID */
	id: string
	/** Task name */
	name: string
	/** Task status */
	status: TaskStatus
	/** Phase this task belongs to */
	phase: SdlcPhaseName
	/** Task creation time */
	createdAt: string
	/** Task update time */
	updatedAt: string
}

/**
 * Resource usage information
 */
export interface ResourceUsageInfo {
	/** Memory usage in bytes */
	memoryUsage: number
	/** CPU usage percentage */
	cpuUsage: number
	/** Total tokens used */
	tokensUsed: number
	/** Estimated cost */
	estimatedCost: number
	/** Currency for cost */
	currency: string
}

// =============================================================================
// SCAN COMMAND TYPES
// =============================================================================

/**
 * Options for the scan command
 */
export interface ScanCommandOptions {
	/** Scan passes to run */
	passes?: ScannerPass[]
	/** Output file for results */
	output?: string
	/** Output format */
	format: "text" | "json" | "markdown" | "sarif"
	/** Minimum severity to report */
	minSeverity: "critical" | "high" | "medium" | "low" | "info"
	/** Fail on findings */
	failOnFindings: boolean
	/** Maximum findings to report */
	maxFindings: number
	/** Files to include */
	include?: string[]
	/** Files to exclude */
	exclude?: string[]
}

/**
 * Result from the scan command
 */
export interface ScanCommandResult {
	/** Total findings count */
	totalFindings: number
	/** Findings by severity */
	findingsBySeverity: Record<string, number>
	/** Findings by pass */
	findingsByPass: Record<string, number>
	/** Scan duration in milliseconds */
	duration: number
	/** Files scanned */
	filesScanned: number
	/** Output file path if saved */
	outputFile?: string
}

// =============================================================================
// BOOTSTRAP COMMAND TYPES
// =============================================================================

/**
 * Options for the bootstrap command
 */
export interface BootstrapCommandOptions {
	/** Skip dependency installation */
	skipDependencies: boolean
	/** Skip MCP server setup */
	skipMcp: boolean
	/** Skip configuration generation */
	skipConfig: boolean
	/** Skip health checks */
	skipHealthCheck: boolean
	/** Overwrite existing configuration */
	overwrite: boolean
	/** MCP servers to install */
	mcpServers?: string[]
}

/**
 * Result from the bootstrap command
 */
export interface BootstrapCommandResult {
	/** Whether bootstrap was successful */
	success: boolean
	/** Installed dependencies */
	dependencies: string[]
	/** Configured MCP servers */
	mcpServers: string[]
	/** Generated configuration files */
	configFiles: string[]
	/** Health check results */
	healthChecks: HealthCheckResult[]
	/** Warnings during bootstrap */
	warnings: string[]
}

/**
 * Health check result
 */
export interface HealthCheckResult {
	/** Check name */
	name: string
	/** Whether check passed */
	passed: boolean
	/** Check message */
	message: string
	/** Additional details */
	details?: Record<string, unknown>
}

// =============================================================================
// HELP COMMAND TYPES
// =============================================================================

/**
 * Options for the help command
 */
export interface HelpCommandOptions {
	/** Show all commands */
	all: boolean
	/** Output format */
	format: "text" | "markdown" | "json"
	/** Show examples */
	showExamples: boolean
}

/**
 * Result from the help command
 */
export interface HelpCommandResult {
	/** Help text */
	helpText: string
	/** Available commands */
	commands: CommandInfo[]
}

/**
 * Command information for help display
 */
export interface CommandInfo {
	/** Command name */
	name: string
	/** Short description */
	description: string
	/** Command aliases */
	aliases?: string[]
	/** Category */
	category?: string
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * CLI error class
 */
export class CLIError extends Error {
	override cause?: Error
	readonly code: string
	readonly exitCode: number

	constructor(message: string, code: string, exitCode = 1, cause?: Error) {
		super(message)
		this.name = "CLIError"
		this.code = code
		this.exitCode = exitCode
		this.cause = cause
	}
}

/**
 * Unknown command error
 */
export class UnknownCommandError extends CLIError {
	constructor(commandName: string) {
		super(`Unknown command: ${commandName}`, "UNKNOWN_COMMAND", 127)
		this.name = "UnknownCommandError"
	}
}

/**
 * Missing argument error
 */
export class MissingArgumentError extends CLIError {
	constructor(argumentName: string) {
		super(`Missing required argument: ${argumentName}`, "MISSING_ARGUMENT", 2)
		this.name = "MissingArgumentError"
	}
}

/**
 * Invalid option error
 */
export class InvalidOptionError extends CLIError {
	constructor(optionName: string, message?: string) {
		super(`Invalid option: ${optionName}${message ? ` - ${message}` : ""}`, "INVALID_OPTION", 2)
		this.name = "InvalidOptionError"
	}
}

/**
 * Configuration error
 */
export class ConfigurationError extends CLIError {
	constructor(message: string, cause?: Error) {
		super(message, "CONFIG_ERROR", 78, cause)
		this.name = "ConfigurationError"
	}
}

// =============================================================================
// OUTPUT FORMATTING
// =============================================================================

/**
 * Output formatter interface
 */
export interface OutputFormatter {
	/** Format a command result */
	formatResult<T>(result: CommandResult<T>): string
	/** Format an error */
	formatError(error: Error): string
	/** Format a table */
	formatTable(headers: string[], rows: string[][]): string
	/** Format a list */
	formatList(items: string[]): string
}

/**
 * Progress reporter interface
 */
export interface ProgressReporter {
	/** Start a progress indicator */
	start(message: string): void
	/** Update progress */
	update(progress: number, message?: string): void
	/** Complete progress */
	complete(message?: string): void
	/** Fail with error */
	fail(error: Error): void
}
