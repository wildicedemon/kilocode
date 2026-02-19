// kilocode_change - new file

/**
 * Help Command
 *
 * Displays usage information, lists all commands with descriptions,
 * and shows command-specific help.
 */

import type { ParsedArgs, CLIOptions, Command, CommandResult, CommandInfo } from "../types"
import { successResult } from "../types"

// =============================================================================
// VERSION INFO
// =============================================================================

/**
 * CLI version - should match framework version
 */
const CLI_VERSION = "1.0.0"

/**
 * CLI name
 */
const CLI_NAME = "kilo-framework"

// =============================================================================
// TYPES
// =============================================================================

interface HelpOptions {
	all: boolean
	format: "text" | "markdown" | "json"
	showExamples: boolean
}

interface HelpResult {
	helpText: string
	commands: CommandInfo[]
}

// =============================================================================
// BUILT-IN COMMANDS INFO
// =============================================================================

/**
 * Information about built-in commands
 */
const BUILTIN_COMMANDS: CommandInfo[] = [
	{
		name: "start",
		description: "Initialize and start the SDLC pipeline",
		aliases: ["run", "init"],
		category: "pipeline",
	},
	{
		name: "status",
		description: "Display current SDLC state and progress",
		aliases: ["st", "info"],
		category: "pipeline",
	},
	{
		name: "scan",
		description: "Run deep code analysis scans",
		aliases: ["analyze"],
		category: "analysis",
	},
	{
		name: "bootstrap",
		description: "Initialize and configure the framework environment",
		aliases: ["init", "setup"],
		category: "setup",
	},
	{
		name: "help",
		description: "Display help information",
		aliases: ["h", "?"],
		category: "utility",
	},
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse help options from command arguments
 */
function parseHelpOptions(args: ParsedArgs): HelpOptions {
	return {
		all: Boolean(args.all || args.a),
		format: (args.format as HelpOptions["format"]) ?? "text",
		showExamples: Boolean(args.examples || args.e),
	}
}

/**
 * Get command info by name
 */
function getCommandInfo(name: string): CommandInfo | undefined {
	return BUILTIN_COMMANDS.find((c) => c.name === name || c.aliases?.includes(name))
}

// =============================================================================
// OUTPUT FORMATTING
// =============================================================================

/**
 * Format help as text
 */
function formatHelpText(
	commandName?: string,
	options?: HelpOptions,
	colorEnabled = true
): string {
	const lines: string[] = []
	const bold = colorEnabled ? "\x1b[1m" : ""
	const reset = colorEnabled ? "\x1b[0m" : ""
	const cyan = colorEnabled ? "\x1b[36m" : ""
	const green = colorEnabled ? "\x1b[32m" : ""
	const gray = colorEnabled ? "\x1b[90m" : ""

	// If specific command requested
	if (commandName && commandName !== "help") {
		return formatCommandHelp(commandName, colorEnabled)
	}

	// General help
	lines.push("")
	lines.push(`${bold}${CLI_NAME}${reset} v${CLI_VERSION}`)
	lines.push("")
	lines.push("AI Agentic Autonomous SDLC Framework")
	lines.push("")
	lines.push(`${bold}USAGE${reset}`)
	lines.push(`  ${CLI_NAME} [OPTIONS] <COMMAND>`)
	lines.push("")
	lines.push(`${bold}COMMANDS${reset}`)

	// Group commands by category
	const categories = groupCommandsByCategory(BUILTIN_COMMANDS)

	for (const [category, commands] of Object.entries(categories)) {
		lines.push("")
		lines.push(`  ${cyan}${category.toUpperCase()}${reset}`)

		for (const cmd of commands) {
			const aliases = cmd.aliases ? ` (${cmd.aliases.join(", ")})` : ""
			lines.push(`    ${green}${cmd.name}${reset}${gray}${aliases}${reset}`)
			lines.push(`      ${cmd.description}`)
		}
	}

	lines.push("")
	lines.push(`${bold}GLOBAL OPTIONS${reset}`)
	lines.push(`  -v, --verbose        Enable verbose output`)
	lines.push(`  -j, --json           Output in JSON format`)
	lines.push(`  -q, --quiet          Suppress all output except errors`)
	lines.push(`  --no-color           Disable colored output`)
	lines.push(`  -c, --config <path>  Path to configuration file`)
	lines.push(`  --cwd <path>         Working directory`)
	lines.push(`  -d, --dry-run        Dry run mode (no side effects)`)
	lines.push(`  -f, --force          Force operation even if unsafe`)
	lines.push(`  -y, --non-interactive  Non-interactive mode`)
	lines.push(`  --log-level <level>  Log level (debug, info, warn, error)`)
	lines.push(`  --version            Show version information`)
	lines.push(`  -h, --help           Show this help message`)

	lines.push("")
	lines.push(`${bold}EXAMPLES${reset}`)
	lines.push(`  ${gray}# Bootstrap the framework${reset}`)
	lines.push(`  ${CLI_NAME} bootstrap`)
	lines.push("")
	lines.push(`  ${gray}# Start the SDLC pipeline${reset}`)
	lines.push(`  ${CLI_NAME} start`)
	lines.push("")
	lines.push(`  ${gray}# Check pipeline status${reset}`)
	lines.push(`  ${CLI_NAME} status`)
	lines.push("")
	lines.push(`  ${gray}# Run security scan${reset}`)
	lines.push(`  ${CLI_NAME} scan --passes security`)
	lines.push("")
	lines.push(`  ${gray}# Get help for a command${reset}`)
	lines.push(`  ${CLI_NAME} help start`)

	lines.push("")
	lines.push(`${bold}DOCUMENTATION${reset}`)
	lines.push("  https://github.com/kilocode/kilo-framework#readme")

	lines.push("")

	return lines.join("\n")
}

/**
 * Format help for a specific command
 */
function formatCommandHelp(commandName: string, colorEnabled = true): string {
	const lines: string[] = []
	const bold = colorEnabled ? "\x1b[1m" : ""
	const reset = colorEnabled ? "\x1b[0m" : ""
	const cyan = colorEnabled ? "\x1b[36m" : ""
	const green = colorEnabled ? "\x1b[32m" : ""
	const gray = colorEnabled ? "\x1b[90m" : ""

	const cmd = getCommandInfo(commandName)
	if (!cmd) {
		lines.push(`Unknown command: ${commandName}`)
		lines.push(`Run '${CLI_NAME} help' for a list of available commands.`)
		return lines.join("\n")
	}

	lines.push("")
	lines.push(`${bold}${CLI_NAME} ${cmd.name}${reset}`)
	lines.push("")
	lines.push(`${cmd.description}`)
	lines.push("")

	// Usage
	lines.push(`${bold}USAGE${reset}`)
	const aliases = cmd.aliases ? `|${cmd.aliases.join("|")}` : ""
	lines.push(`  ${CLI_NAME} ${cmd.name}${aliases} [OPTIONS]`)
	lines.push("")

	// Command-specific options based on command
	lines.push(`${bold}OPTIONS${reset}`)

	switch (cmd.name) {
		case "start":
			lines.push(`  --phase <phase>           Phase to start from`)
			lines.push(`                            (research, planning, implementation, verification)`)
			lines.push(`  --checkpoint <id>         Resume from a specific checkpoint ID`)
			lines.push(`  --skip-to <phase>         Skip directly to a specific phase`)
			lines.push(`  --max-iterations <n>      Maximum iterations for implementation phase`)
			lines.push(`  --continuous-scan         Enable continuous scanning during implementation`)
			break

		case "status":
			lines.push(`  -d, --detailed            Show detailed information including timestamps`)
			lines.push(`  -f, --format <format>     Output format (text, json, markdown)`)
			lines.push(`  -r, --resources           Show resource usage information`)
			lines.push(`  -p, --phase <phase>       Filter to show only a specific phase`)
			lines.push(`  --task-status <status>    Filter tasks by status`)
			break

		case "scan":
			lines.push(`  -p, --passes <passes>     Comma-separated list of scan passes to run`)
			lines.push(`                            (anti-patterns, architecture, performance, security)`)
			lines.push(`  -o, --output <path>       Output file path for results`)
			lines.push(`  -f, --format <format>     Output format (text, json, markdown, sarif)`)
			lines.push(`  --min-severity <level>    Minimum severity level to report`)
			lines.push(`                            (critical, high, medium, low, info)`)
			lines.push(`  --fail-on-findings        Exit with error code if findings are found`)
			lines.push(`  --max-findings <n>        Maximum number of findings to report`)
			lines.push(`  --include <patterns>      Comma-separated glob patterns to include`)
			lines.push(`  --exclude <patterns>      Comma-separated glob patterns to exclude`)
			break

		case "bootstrap":
			lines.push(`  --skip-dependencies       Skip dependency installation`)
			lines.push(`  --skip-mcp                Skip MCP server configuration`)
			lines.push(`  --skip-config             Skip configuration file generation`)
			lines.push(`  --skip-health-check       Skip health checks`)
			lines.push(`  -f, --overwrite           Overwrite existing configuration files`)
			lines.push(`  --mcp-servers <servers>   Comma-separated list of MCP servers to configure`)
			break

		case "help":
			lines.push(`  -a, --all                 Show all commands including hidden ones`)
			lines.push(`  -f, --format <format>     Output format (text, markdown, json)`)
			lines.push(`  -e, --examples            Show usage examples`)
			break
	}

	lines.push("")

	// Examples
	lines.push(`${bold}EXAMPLES${reset}`)

	switch (cmd.name) {
		case "start":
			lines.push(`  ${gray}# Start from the beginning${reset}`)
			lines.push(`  ${CLI_NAME} start`)
			lines.push("")
			lines.push(`  ${gray}# Start from planning phase${reset}`)
			lines.push(`  ${CLI_NAME} start --phase planning`)
			lines.push("")
			lines.push(`  ${gray}# Resume from checkpoint${reset}`)
			lines.push(`  ${CLI_NAME} start --checkpoint cp-123456`)
			break

		case "status":
			lines.push(`  ${gray}# Show basic status${reset}`)
			lines.push(`  ${CLI_NAME} status`)
			lines.push("")
			lines.push(`  ${gray}# Show detailed status in JSON${reset}`)
			lines.push(`  ${CLI_NAME} status --detailed --format json`)
			break

		case "scan":
			lines.push(`  ${gray}# Run all scans${reset}`)
			lines.push(`  ${CLI_NAME} scan`)
			lines.push("")
			lines.push(`  ${gray}# Run only security scan${reset}`)
			lines.push(`  ${CLI_NAME} scan --passes security`)
			lines.push("")
			lines.push(`  ${gray}# Output to SARIF file${reset}`)
			lines.push(`  ${CLI_NAME} scan --format sarif --output results.sarif`)
			break

		case "bootstrap":
			lines.push(`  ${gray}# Full bootstrap${reset}`)
			lines.push(`  ${CLI_NAME} bootstrap`)
			lines.push("")
			lines.push(`  ${gray}# Skip dependency installation${reset}`)
			lines.push(`  ${CLI_NAME} bootstrap --skip-dependencies`)
			lines.push("")
			lines.push(`  ${gray}# Overwrite existing config${reset}`)
			lines.push(`  ${CLI_NAME} bootstrap --overwrite`)
			break

		default:
			lines.push(`  ${CLI_NAME} ${cmd.name}`)
	}

	lines.push("")

	return lines.join("\n")
}

/**
 * Format help as markdown
 */
function formatHelpMarkdown(): string {
	const lines: string[] = []

	lines.push(`# ${CLI_NAME} CLI Reference`)
	lines.push("")
	lines.push(`Version: ${CLI_VERSION}`)
	lines.push("")

	lines.push("## Usage")
	lines.push("")
	lines.push("```bash")
	lines.push(`${CLI_NAME} [OPTIONS] <COMMAND>`)
	lines.push("```")
	lines.push("")

	lines.push("## Commands")
	lines.push("")

	const categories = groupCommandsByCategory(BUILTIN_COMMANDS)

	for (const [category, commands] of Object.entries(categories)) {
		lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`)
		lines.push("")
		lines.push("| Command | Description |")
		lines.push("|---------|-------------|")

		for (const cmd of commands) {
			lines.push(`| \`${cmd.name}\` | ${cmd.description} |`)
		}
		lines.push("")
	}

	lines.push("## Global Options")
	lines.push("")
	lines.push("| Option | Description |")
	lines.push("|--------|-------------|")
	lines.push("| `-v, --verbose` | Enable verbose output |")
	lines.push("| `-j, --json` | Output in JSON format |")
	lines.push("| `-q, --quiet` | Suppress all output except errors |")
	lines.push("| `--no-color` | Disable colored output |")
	lines.push("| `-c, --config <path>` | Path to configuration file |")
	lines.push("| `--cwd <path>` | Working directory |")
	lines.push("| `-d, --dry-run` | Dry run mode (no side effects) |")
	lines.push("| `-f, --force` | Force operation even if unsafe |")
	lines.push("| `-y, --non-interactive` | Non-interactive mode |")
	lines.push("| `--log-level <level>` | Log level (debug, info, warn, error) |")
	lines.push("| `--version` | Show version information |")
	lines.push("| `-h, --help` | Show help message |")
	lines.push("")

	return lines.join("\n")
}

/**
 * Format help as JSON
 */
function formatHelpJson(): string {
	return JSON.stringify(
		{
			name: CLI_NAME,
			version: CLI_VERSION,
			commands: BUILTIN_COMMANDS,
		},
		null,
		2
	)
}

/**
 * Group commands by category
 */
function groupCommandsByCategory(
	commands: CommandInfo[]
): Record<string, CommandInfo[]> {
	const groups: Record<string, CommandInfo[]> = {}

	for (const cmd of commands) {
		const category = cmd.category ?? "general"
		if (!groups[category]) {
			groups[category] = []
		}
		groups[category].push(cmd)
	}

	return groups
}

// =============================================================================
// COMMAND IMPLEMENTATION
// =============================================================================

/**
 * Help command handler
 */
async function handleHelp(args: ParsedArgs, options: CLIOptions): Promise<CommandResult> {
	const helpOptions = parseHelpOptions(args)

	// Get the command name from positional arguments
	const commandName = args._[0]

	// Format output based on format option
	let helpText: string
	switch (helpOptions.format) {
		case "json":
			helpText = formatHelpJson()
			break
		case "markdown":
			helpText = formatHelpMarkdown()
			break
		default:
			helpText = formatHelpText(commandName, helpOptions, options.color)
	}

	// Output the help text
	console.log(helpText)

	return successResult({
		helpText,
		commands: BUILTIN_COMMANDS,
	})
}

// =============================================================================
// COMMAND EXPORT
// =============================================================================

/**
 * Help command definition
 */
export const helpCommand: Command = {
	name: "help",
	description: "Display help information",
	longDescription: `
Display usage information, list all commands with descriptions,
or show detailed help for a specific command.
	`.trim(),
	examples: [
		"kilo-framework help",
		"kilo-framework help start",
		"kilo-framework help --format markdown",
		"kilo-framework --help",
	],
	options: [
		{
			longFlag: "--all",
			shortFlag: "-a",
			description: "Show all commands including hidden ones",
			type: "boolean",
			defaultValue: false,
		},
		{
			longFlag: "--format",
			shortFlag: "-f",
			description: "Output format (text, markdown, json)",
			type: "string",
			defaultValue: "text",
		},
		{
			longFlag: "--examples",
			shortFlag: "-e",
			description: "Show usage examples",
			type: "boolean",
			defaultValue: false,
		},
	],
	arguments: [
		{
			name: "command",
			description: "Command to show help for",
			required: false,
		},
	],
	handler: handleHelp,
	aliases: ["h", "?"],
	category: "utility",
}

export { handleHelp }