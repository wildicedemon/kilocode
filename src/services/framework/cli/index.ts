// kilocode_change - new file

/**
 * CLI Main Entry Point
 *
 * This module provides the main FrameworkCLI class for command-line interface
 * operations, including argument parsing, command routing, and error handling.
 */

import type { Command, CLIOptions, ParsedArgs, CommandResult, OutputFormatter, ProgressReporter } from "./types"
import {
	DEFAULT_CLI_OPTIONS,
	CLIError,
	UnknownCommandError,
	MissingArgumentError,
	InvalidOptionError,
	ConfigurationError,
	successResult,
	errorResult,
} from "./types"
import { startCommand, statusCommand, scanCommand, bootstrapCommand, helpCommand } from "./commands"

// =============================================================================
// VERSION INFO
// =============================================================================

/**
 * CLI version - should match framework version
 */
export const CLI_VERSION = "1.0.0"

/**
 * CLI name
 */
export const CLI_NAME = "kilo-framework"

// =============================================================================
// OUTPUT FORMATTERS
// =============================================================================

/**
 * Text output formatter for human-readable output
 */
class TextFormatter implements OutputFormatter {
	private colorEnabled: boolean

	constructor(colorEnabled = true) {
		this.colorEnabled = colorEnabled
	}

	private color(text: string, colorCode: number): string {
		if (!this.colorEnabled) return text
		return `\x1b[${colorCode}m${text}\x1b[0m`
	}

	formatResult<T>(result: CommandResult<T>): string {
		const lines: string[] = []

		if (result.message) {
			if (result.status === "success") {
				lines.push(this.color(`✓ ${result.message}`, 32)) // green
			} else if (result.status === "error") {
				lines.push(this.color(`✗ ${result.message}`, 31)) // red
			} else {
				lines.push(`  ${result.message}`)
			}
		}

		if (result.data !== undefined) {
			lines.push(JSON.stringify(result.data, null, 2))
		}

		if (result.duration !== undefined) {
			lines.push(this.color(`  Completed in ${result.duration}ms`, 90)) // gray
		}

		return lines.join("\n")
	}

	formatError(error: Error): string {
		const lines: string[] = []
		lines.push(this.color(`Error: ${error.message}`, 31)) // red

		if (error instanceof CLIError && error.cause) {
			lines.push(this.color(`  Caused by: ${error.cause.message}`, 90)) // gray
		}

		return lines.join("\n")
	}

	formatTable(headers: string[], rows: string[][]): string {
		const colWidths = headers.map((h, i) => {
			const maxRowLen = Math.max(...rows.map((r) => r[i]?.length ?? 0))
			return Math.max(h.length, maxRowLen)
		})

		const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join("  ")
		const separator = colWidths.map((w) => "─".repeat(w)).join("  ")
		const rowLines = rows.map((row) => row.map((cell, i) => (cell ?? "").padEnd(colWidths[i])).join("  "))

		return [
			this.color(headerLine, 1), // bold
			separator,
			...rowLines,
		].join("\n")
	}

	formatList(items: string[]): string {
		return items.map((item) => `  • ${item}`).join("\n")
	}
}

/**
 * JSON output formatter for machine-readable output
 */
class JsonFormatter implements OutputFormatter {
	formatResult<T>(result: CommandResult<T>): string {
		return JSON.stringify(
			{
				status: result.status,
				exitCode: result.exitCode,
				message: result.message,
				data: result.data,
				duration: result.duration,
			},
			null,
			2,
		)
	}

	formatError(error: Error): string {
		return JSON.stringify(
			{
				status: "error",
				error: {
					name: error.name,
					message: error.message,
					code: error instanceof CLIError ? error.code : undefined,
				},
			},
			null,
			2,
		)
	}

	formatTable(headers: string[], rows: string[][]): string {
		return JSON.stringify({ headers, rows }, null, 2)
	}

	formatList(items: string[]): string {
		return JSON.stringify(items, null, 2)
	}
}

// =============================================================================
// PROGRESS REPORTER
// =============================================================================

/**
 * Console progress reporter with spinner
 */
class ConsoleProgressReporter implements ProgressReporter {
	private currentMessage = ""
	private isSpinning = false
	private spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
	private spinnerIndex = 0
	private spinnerInterval?: ReturnType<typeof setInterval>
	private colorEnabled: boolean

	constructor(colorEnabled = true) {
		this.colorEnabled = colorEnabled
	}

	private color(text: string, colorCode: number): string {
		if (!this.colorEnabled) return text
		return `\x1b[${colorCode}m${text}\x1b[0m`
	}

	private getStdout(): { write: (data: string) => void } {
		const proc = (globalThis as unknown as { process?: { stdout?: { write: (data: string) => void } } }).process
		return proc?.stdout ?? { write: () => {} }
	}

	private clearLine(): void {
		this.getStdout().write("\r\x1b[K")
	}

	start(message: string): void {
		this.currentMessage = message
		this.isSpinning = true
		this.spinnerIndex = 0

		this.spinnerInterval = setInterval(() => {
			if (this.isSpinning) {
				const frame = this.spinnerFrames[this.spinnerIndex]
				this.clearLine()
				this.getStdout().write(`${this.color(frame, 36)} ${this.currentMessage}`)
				this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length
			}
		}, 80)
	}

	update(_progress: number, message?: string): void {
		if (message) {
			this.currentMessage = message
		}
	}

	complete(message?: string): void {
		this.isSpinning = false
		if (this.spinnerInterval) {
			clearInterval(this.spinnerInterval)
			this.spinnerInterval = undefined
		}
		this.clearLine()
		const finalMessage = message ?? this.currentMessage
		this.getStdout().write(`${this.color("✓", 32)} ${finalMessage}\n`)
	}

	fail(error: Error): void {
		this.isSpinning = false
		if (this.spinnerInterval) {
			clearInterval(this.spinnerInterval)
			this.spinnerInterval = undefined
		}
		this.clearLine()
		this.getStdout().write(`${this.color("✗", 31)} ${error.message}\n`)
	}
}

/**
 * Silent progress reporter for quiet mode
 */
class SilentProgressReporter implements ProgressReporter {
	start(_message: string): void {}
	update(_progress: number, _message?: string): void {}
	complete(_message?: string): void {}
	fail(_error: Error): void {}
}

// =============================================================================
// ARGUMENT PARSER
// =============================================================================

/**
 * Parse command line arguments into structured format
 */
function parseArgs(argv: string[]): ParsedArgs {
	const result: ParsedArgs = {
		_: [],
	}

	let i = 0
	while (i < argv.length) {
		const arg = argv[i]

		if (arg === "--") {
			// Everything after -- is a positional argument
			result._.push(...argv.slice(i + 1))
			break
		}

		if (arg.startsWith("--")) {
			// Long option
			const eqIndex = arg.indexOf("=")
			if (eqIndex !== -1) {
				// --option=value
				const key = arg.slice(2, eqIndex)
				const value = arg.slice(eqIndex + 1)
				result[key] = parseValue(value)
			} else {
				// --option or --no-option
				const key = arg.slice(2)
				if (key.startsWith("no-")) {
					result[key.slice(3)] = false
				} else if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
					result[key] = parseValue(argv[++i])
				} else {
					result[key] = true
				}
			}
		} else if (arg.startsWith("-") && arg.length > 1) {
			// Short option(s)
			const flags = arg.slice(1)
			for (let j = 0; j < flags.length; j++) {
				const flag = flags[j]
				if (j === flags.length - 1 && i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
					// Last flag can take a value
					result[flag] = parseValue(argv[++i])
				} else {
					result[flag] = true
				}
			}
		} else {
			// Positional argument
			if (!result.command) {
				result.command = arg
			} else {
				result._.push(arg)
			}
		}

		i++
	}

	return result
}

/**
 * Parse a string value into appropriate type
 */
function parseValue(value: string): string | number | boolean {
	if (value === "true") return true
	if (value === "false") return false
	if (value === "null") return null as unknown as string
	if (value === "undefined") return undefined as unknown as string

	const num = Number(value)
	if (!isNaN(num)) return num

	return value
}

/**
 * Build CLI options from parsed arguments
 */
function buildOptions(parsed: ParsedArgs): CLIOptions {
	return {
		verbose: Boolean(parsed.verbose || parsed.v),
		json: Boolean(parsed.json || parsed.j),
		quiet: Boolean(parsed.quiet || parsed.q),
		color: parsed.color !== false && !parsed["no-color"], // kilocode_change
		config: typeof parsed.config === "string" ? parsed.config : undefined,
		cwd: typeof parsed.cwd === "string" ? parsed.cwd : undefined,
		dryRun: Boolean(parsed["dry-run"] || parsed.d),
		force: Boolean(parsed.force || parsed.f),
		nonInteractive: Boolean(parsed["non-interactive"] || parsed.y),
		logLevel: (parsed["log-level"] as CLIOptions["logLevel"]) ?? "info",
	}
}

// =============================================================================
// FRAMEWORK CLI CLASS
// =============================================================================

/**
 * Main CLI class for framework operations
 */
export class FrameworkCLI {
	private commands: Map<string, Command> = new Map()
	private aliases: Map<string, string> = new Map()
	private options: CLIOptions
	private formatter: OutputFormatter
	private progressReporter: ProgressReporter

	constructor(options: Partial<CLIOptions> = {}) {
		this.options = { ...DEFAULT_CLI_OPTIONS, ...options }
		this.formatter = this.options.json ? new JsonFormatter() : new TextFormatter(this.options.color)
		this.progressReporter = this.options.quiet
			? new SilentProgressReporter()
			: new ConsoleProgressReporter(this.options.color)

		// Register built-in commands
		this.registerCommand(startCommand)
		this.registerCommand(statusCommand)
		this.registerCommand(scanCommand)
		this.registerCommand(bootstrapCommand)
		this.registerCommand(helpCommand)
	}

	/**
	 * Register a command
	 */
	registerCommand(command: Command): void {
		this.commands.set(command.name, command)

		// Register aliases
		if (command.aliases) {
			for (const alias of command.aliases) {
				this.aliases.set(alias, command.name)
			}
		}
	}

	/**
	 * Get a command by name or alias
	 */
	getCommand(name: string): Command | undefined {
		return this.commands.get(name) ?? this.commands.get(this.aliases.get(name) ?? "")
	}

	/**
	 * Get all registered commands
	 */
	getAllCommands(): Command[] {
		return Array.from(this.commands.values())
	}

	/**
	 * Run the CLI with the given arguments
	 */
	async run(argv: string[]): Promise<number> {
		const startTime = Date.now()

		try {
			// Parse arguments
			const parsed = parseArgs(argv)
			this.options = { ...this.options, ...buildOptions(parsed) }

			// Update formatter based on options
			this.formatter = this.options.json ? new JsonFormatter() : new TextFormatter(this.options.color)
			this.progressReporter = this.options.quiet
				? new SilentProgressReporter()
				: new ConsoleProgressReporter(this.options.color)

			// Handle --version
			if (parsed.version || parsed.v) {
				this.output(`${CLI_NAME} v${CLI_VERSION}`)
				return 0
			}

			// Handle --help without command
			if (parsed.help || parsed.h || !parsed.command) {
				return await this.executeCommand("help", parsed, this.options)
			}

			// Execute the command
			return await this.executeCommand(parsed.command, parsed, this.options)
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			this.output(this.formatter.formatError(err))

			if (err instanceof CLIError) {
				return err.exitCode
			}
			return 1
		} finally {
			if (this.options.verbose) {
				const duration = Date.now() - startTime
				this.output(`\nCompleted in ${duration}ms`)
			}
		}
	}

	/**
	 * Execute a command
	 */
	private async executeCommand(commandName: string, args: ParsedArgs, options: CLIOptions): Promise<number> {
		const command = this.getCommand(commandName)

		if (!command) {
			throw new UnknownCommandError(commandName)
		}

		// Validate required arguments
		if (command.arguments) {
			for (const arg of command.arguments) {
				if (arg.required && args._.length === 0) {
					throw new MissingArgumentError(arg.name)
				}
			}
		}

		// Validate options
		if (command.options) {
			for (const opt of command.options) {
				if (opt.required && args[opt.longFlag.replace(/^--/, "")] === undefined) {
					throw new InvalidOptionError(opt.longFlag, "is required")
				}
			}
		}

		// Execute handler
		const startTime = Date.now()
		try {
			const result = await command.handler(args, options)
			const duration = Date.now() - startTime

			if (!options.quiet) {
				const output = this.formatter.formatResult({ ...result, duration })
				if (output) {
					this.output(output)
				}
			}

			return result.exitCode
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			const result = errorResult(err)
			const duration = Date.now() - startTime

			if (!options.quiet) {
				this.output(this.formatter.formatResult({ ...result, duration }))
			}

			return result.exitCode
		}
	}

	/**
	 * Output a message to stdout
	 */
	private output(message: string): void {
		const proc = (globalThis as unknown as { process?: { stdout?: { write: (data: string) => void } } }).process
		const stdout = proc?.stdout ?? { write: () => {} }
		stdout.write(message + "\n")
	}

	/**
	 * Get the progress reporter
	 */
	getProgressReporter(): ProgressReporter {
		return this.progressReporter
	}

	/**
	 * Get the output formatter
	 */
	getFormatter(): OutputFormatter {
		return this.formatter
	}
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new FrameworkCLI instance
 */
export function createCLI(options?: Partial<CLIOptions>): FrameworkCLI {
	return new FrameworkCLI(options)
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Get process argv safely
 */
function getProcessArgv(): string[] {
	const proc = (globalThis as unknown as { process?: { argv?: string[] } }).process
	return proc?.argv?.slice(2) ?? []
}

/**
 * Main entry point for CLI execution
 */
export async function main(argv: string[] = getProcessArgv()): Promise<number> {
	const cli = createCLI()
	return cli.run(argv)
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { Command, CLIOptions, ParsedArgs, CommandResult, OutputFormatter, ProgressReporter } from "./types"

export {
	DEFAULT_CLI_OPTIONS,
	CLIError,
	UnknownCommandError,
	MissingArgumentError,
	InvalidOptionError,
	ConfigurationError,
	successResult,
	errorResult,
} from "./types"
