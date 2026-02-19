// kilocode_change - new file: Voice command routing

import type {
	VoiceCommand,
	VoiceCommandHandler,
	VoiceCommandResult,
	VoiceRoutePattern,
	BuiltInVoiceCommand,
	SDLCOperation,
} from "./types"

/**
 * Route match result
 */
interface RouteMatch {
	pattern: VoiceRoutePattern
	match: RegExpMatchArray | null
}

/**
 * Built-in SDLC voice commands
 */
const BUILT_IN_COMMANDS: BuiltInVoiceCommand[] = [
	{
		id: "create_file",
		patterns: ["create (a )?new file", "make (a )?new file", "create file", "new file"],
		description: "Create a new file",
		operation: "create_file",
		examples: ["create a new file", "make a new file called utils", "new file test.ts"],
		enabled: true,
	},
	{
		id: "read_file",
		patterns: ["read (the )?file", "open (the )?file", "show (the )?file", "display (the )?file"],
		description: "Read or open a file",
		operation: "read_file",
		examples: ["read the file", "open file src/index.ts", "show the config file"],
		enabled: true,
	},
	{
		id: "edit_file",
		patterns: [
			"edit (the )?file",
			"modify (the )?file",
			"change (the )?file",
			"update (the )?file",
		],
		description: "Edit an existing file",
		operation: "edit_file",
		examples: ["edit the file", "modify the config", "change the index file"],
		enabled: true,
	},
	{
		id: "delete_file",
		patterns: ["delete (the )?file", "remove (the )?file", "trash (the )?file"],
		description: "Delete a file",
		operation: "delete_file",
		examples: ["delete the file", "remove file test.ts"],
		enabled: true,
	},
	{
		id: "run_command",
		patterns: [
			"run (the )?command",
			"execute (the )?command",
			"run",
			"execute",
			"start (the )?command",
		],
		description: "Run a terminal command",
		operation: "run_command",
		examples: ["run npm install", "execute the build", "run tests"],
		enabled: true,
	},
	{
		id: "search",
		patterns: [
			"search for",
			"find",
			"look for",
			"search (in )?(the )?code",
			"grep for",
		],
		description: "Search the codebase",
		operation: "search",
		examples: ["search for function", "find the TODO", "look for error handling"],
		enabled: true,
	},
	{
		id: "git_commit",
		patterns: [
			"commit (the )?changes",
			"git commit",
			"create (a )?commit",
			"make (a )?commit",
		],
		description: "Commit changes to git",
		operation: "git_commit",
		examples: ["commit the changes", "git commit with message", "create a commit"],
		enabled: true,
	},
	{
		id: "git_push",
		patterns: ["push (to )?(the )?remote", "git push", "push (the )?changes"],
		description: "Push changes to remote",
		operation: "git_push",
		examples: ["push to remote", "git push", "push the changes"],
		enabled: true,
	},
	{
		id: "git_pull",
		patterns: ["pull (from )?(the )?remote", "git pull", "pull (the )?changes"],
		description: "Pull changes from remote",
		operation: "git_pull",
		examples: ["pull from remote", "git pull", "pull the latest changes"],
		enabled: true,
	},
	{
		id: "open_file",
		patterns: ["open (the )?file", "show (the )?file", "display (the )?file"],
		description: "Open a file in the editor",
		operation: "open_file",
		examples: ["open file src/index.ts", "show the readme"],
		enabled: true,
	},
	{
		id: "navigate",
		patterns: [
			"go to",
			"navigate to",
			"jump to",
			"open (the )?(file|line|function|class)",
		],
		description: "Navigate to a location",
		operation: "navigate",
		examples: ["go to line 50", "navigate to function", "jump to class"],
		enabled: true,
	},
	{
		id: "explain",
		patterns: [
			"explain (the )?code",
			"what does (this )?code do",
			"tell me about (the )?code",
			"describe (the )?code",
		],
		description: "Explain code functionality",
		operation: "explain",
		examples: ["explain this code", "what does this function do"],
		enabled: true,
	},
	{
		id: "refactor",
		patterns: [
			"refactor (the )?code",
			"clean up (the )?code",
			"improve (the )?code",
			"restructure (the )?code",
		],
		description: "Refactor code",
		operation: "refactor",
		examples: ["refactor this function", "clean up the code"],
		enabled: true,
	},
	{
		id: "test",
		patterns: [
			"run (the )?tests",
			"test (the )?code",
			"write (a )?test",
			"create (a )?test",
		],
		description: "Run or create tests",
		operation: "test",
		examples: ["run the tests", "test this function", "write a test for this"],
		enabled: true,
	},
	{
		id: "debug",
		patterns: [
			"debug (the )?code",
			"fix (the )?bug",
			"find (the )?bug",
			"debug (this )?error",
		],
		description: "Debug code or errors",
		operation: "debug",
		examples: ["debug this error", "fix the bug", "find the issue"],
		enabled: true,
	},
]

/**
 * VoiceCommandRouter - Routes voice commands to appropriate handlers
 *
 * This is a scaffolding class with placeholder implementations for future
 * voice command routing integration.
 *
 * @example
 * ```typescript
 * const router = new VoiceCommandRouter()
 * router.registerRoute(/create file/i, async (cmd) => {
 *   return { success: true, message: 'File created' }
 * })
 * const result = await router.route(voiceCommand)
 * ```
 */
export class VoiceCommandRouter {
	private routes: VoiceRoutePattern[] = []
	private builtInHandlers: Map<SDLCOperation, VoiceCommandHandler> = new Map()
	private enabledBuiltInCommands: Set<string> = new Set()

	constructor() {
		// Initialize with built-in commands enabled
		this.initializeBuiltInCommands()
	}

	/**
	 * Route a voice command to the appropriate handler
	 *
	 * @param command - The voice command to route
	 * @returns The result of processing the command
	 *
	 * @example
	 * ```typescript
	 * const result = await router.route({
	 *   id: 'cmd-1',
	 *   text: 'create a new file called utils',
	 *   confidence: 0.95,
	 *   language: 'en-US',
	 *   timestamp: Date.now()
	 * })
	 * ```
	 */
	async route(command: VoiceCommand): Promise<VoiceCommandResult> {
		// Try to match against registered routes
		const match = this.matchCommand(command.text)

		if (match) {
			try {
				return await match.pattern.handler(command)
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				return {
					success: false,
					error: {
						message,
						code: "HANDLER_ERROR",
					},
				}
			}
		}

		// Try built-in commands
		const builtInMatch = this.matchBuiltInCommand(command.text)
		if (builtInMatch) {
			const handler = this.builtInHandlers.get(builtInMatch.operation)
			if (handler) {
				try {
					return await handler(command)
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					return {
						success: false,
						error: {
							message,
							code: "BUILTIN_HANDLER_ERROR",
						},
					}
				}
			}
		}

		return {
			success: false,
			message: "No matching route found for command",
			error: {
				message: "Unrecognized command",
				code: "NO_MATCH",
			},
		}
	}

	/**
	 * Register a custom command route
	 *
	 * @param pattern - Pattern to match (string or regex)
	 * @param handler - Handler function for matched commands
	 *
	 * @example
	 * ```typescript
	 * router.registerRoute(/deploy (to )?(?<env>\w+)/i, async (cmd) => {
	 *   const env = cmd.entities?.find(e => e.type === 'env')?.value
	 *   return { success: true, message: `Deploying to ${env}` }
	 * })
	 * ```
	 */
	registerRoute(
		pattern: string | RegExp,
		handler: VoiceCommandHandler,
		options?: { description?: string; priority?: number; caseSensitive?: boolean }
	): void {
		const routePattern: VoiceRoutePattern = {
			pattern,
			isRegex: pattern instanceof RegExp,
			caseSensitive: options?.caseSensitive ?? false,
			handler,
			description: options?.description,
			priority: options?.priority ?? 0,
		}

		this.routes.push(routePattern)

		// Sort by priority (higher first)
		this.routes.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
	}

	/**
	 * Unregister a command route
	 *
	 * @param pattern - The pattern to unregister
	 */
	unregisterRoute(pattern: string | RegExp): void {
		const patternStr = pattern.toString()
		this.routes = this.routes.filter((r) => r.pattern.toString() !== patternStr)
	}

	/**
	 * Match input against registered routes
	 *
	 * @param input - The voice input text
	 * @returns The matched route pattern, or undefined
	 */
	matchCommand(input: string): RouteMatch | undefined {
		const normalizedInput = input.toLowerCase().trim()

		for (const route of this.routes) {
			let match: RegExpMatchArray | null = null

			if (route.isRegex) {
				const regex = route.pattern as RegExp
				match = normalizedInput.match(regex)
			} else {
				const patternStr = route.caseSensitive
					? (route.pattern as string)
					: (route.pattern as string).toLowerCase()
				const inputToMatch = route.caseSensitive ? input : normalizedInput

				if (inputToMatch.includes(patternStr)) {
					// Create a pseudo-match for string patterns
					const index = inputToMatch.indexOf(patternStr)
					match = {
						0: patternStr,
						index,
						input: inputToMatch,
						length: 1,
						groups: undefined,
					} as RegExpMatchArray
				}
			}

			if (match) {
				return { pattern: route, match }
			}
		}

		return undefined
	}

	/**
	 * Register a handler for a built-in SDLC operation
	 *
	 * @param operation - The SDLC operation
	 * @param handler - The handler function
	 */
	registerBuiltInHandler(operation: SDLCOperation, handler: VoiceCommandHandler): void {
		this.builtInHandlers.set(operation, handler)
	}

	/**
	 * Enable or disable a built-in command
	 *
	 * @param commandId - The built-in command ID
	 * @param enabled - Whether to enable the command
	 */
	setBuiltInCommandEnabled(commandId: string, enabled: boolean): void {
		if (enabled) {
			this.enabledBuiltInCommands.add(commandId)
		} else {
			this.enabledBuiltInCommands.delete(commandId)
		}
	}

	/**
	 * Get all built-in commands
	 *
	 * @returns Array of built-in voice commands
	 */
	getBuiltInCommands(): BuiltInVoiceCommand[] {
		return BUILT_IN_COMMANDS.map((cmd) => ({
			...cmd,
			enabled: this.enabledBuiltInCommands.has(cmd.id),
		}))
	}

	/**
	 * Extract entities from a voice command
	 *
	 * @param command - The voice command
	 * @param patterns - Entity patterns to extract
	 * @returns The command with extracted entities
	 */
	extractEntities(
		command: VoiceCommand,
		patterns: Array<{ type: string; pattern: RegExp }>
	): VoiceCommand {
		const entities = command.entities ?? []
		const text = command.text.toLowerCase()

		for (const { type, pattern } of patterns) {
			const match = text.match(pattern)
			if (match) {
				entities.push({
					type,
					value: match[1] ?? match[0],
					startIndex: match.index ?? 0,
					endIndex: (match.index ?? 0) + match[0].length,
					confidence: 0.9,
				})
			}
		}

		return { ...command, entities }
	}

	/**
	 * Initialize built-in commands
	 */
	private initializeBuiltInCommands(): void {
		// Enable all built-in commands by default
		for (const cmd of BUILT_IN_COMMANDS) {
			if (cmd.enabled) {
				this.enabledBuiltInCommands.add(cmd.id)
			}
		}

		// Register placeholder handlers for built-in operations
		// These will be replaced with actual implementations
		for (const cmd of BUILT_IN_COMMANDS) {
			this.builtInHandlers.set(cmd.operation, this.createPlaceholderHandler(cmd.operation))
		}
	}

	/**
	 * Match input against built-in commands
	 */
	private matchBuiltInCommand(input: string): BuiltInVoiceCommand | undefined {
		const normalizedInput = input.toLowerCase().trim()

		for (const cmd of BUILT_IN_COMMANDS) {
			if (!this.enabledBuiltInCommands.has(cmd.id)) {
				continue
			}

			for (const pattern of cmd.patterns) {
				const regex = new RegExp(pattern, "i")
				if (regex.test(normalizedInput)) {
					return cmd
				}
			}
		}

		return undefined
	}

	/**
	 * Create a placeholder handler for a built-in operation
	 */
	private createPlaceholderHandler(operation: SDLCOperation): VoiceCommandHandler {
		return async (command: VoiceCommand): Promise<VoiceCommandResult> => {
			// Placeholder implementation
			// TODO: Connect to actual SDLC operations
			console.log(`[VoiceCommandRouter] Placeholder handler for: ${operation}`)
			console.log(`[VoiceCommandRouter] Command text: ${command.text}`)

			return {
				success: true,
				message: `Command "${operation}" recognized but not yet implemented. Text: "${command.text}"`,
				action: {
					type: operation,
					payload: { text: command.text },
				},
			}
		}
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this.routes = []
		this.builtInHandlers.clear()
		this.enabledBuiltInCommands.clear()
	}
}

// Singleton instance for convenience
let defaultInstance: VoiceCommandRouter | null = null

/**
 * Get the default VoiceCommandRouter instance
 */
export function getVoiceCommandRouter(): VoiceCommandRouter {
	if (!defaultInstance) {
		defaultInstance = new VoiceCommandRouter()
	}
	return defaultInstance
}

/**
 * Reset the default instance (useful for testing)
 */
export function resetVoiceCommandRouter(): void {
	if (defaultInstance) {
		defaultInstance.dispose()
		defaultInstance = null
	}
}
