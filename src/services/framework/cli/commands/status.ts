// kilocode_change - new file

/**
 * Status Command
 *
 * Displays the current SDLC state, phase progress, active tasks,
 * and resource usage information.
 */

import type { ParsedArgs, CLIOptions, Command, CommandResult } from "../types"
import { successResult, errorResult } from "../types"
import type { SdlcPhaseName, TaskStatus, PhaseState, TaskState } from "../../types"
import { SdlcStateManager, createSdlcStateManager } from "../../index"

// =============================================================================
// TYPES
// =============================================================================

interface StatusOptions {
	detailed: boolean
	format: "text" | "json" | "markdown"
	showResources: boolean
	phase?: SdlcPhaseName
	taskStatus?: TaskStatus
}

interface PhaseStatusInfo {
	name: SdlcPhaseName
	active: boolean
	completed: boolean
	taskCount: number
	completedTasks: number
	startedAt?: string
	completedAt?: string
}

interface TaskStatusInfo {
	id: string
	name: string
	status: TaskStatus
	phase: SdlcPhaseName
	createdAt: string
	updatedAt: string
}

interface ResourceUsageInfo {
	memoryUsage: number
	cpuUsage: number
	tokensUsed: number
	estimatedCost: number
	currency: string
}

interface StatusResult {
	currentPhase: SdlcPhaseName | null
	phases: PhaseStatusInfo[]
	activeTasks: TaskStatusInfo[]
	resources?: ResourceUsageInfo
	lastCheckpoint?: string
	duration?: number
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse status options from command arguments
 */
function parseStatusOptions(args: ParsedArgs): StatusOptions {
	return {
		detailed: Boolean(args.detailed || args.d),
		format: (args.format as StatusOptions["format"]) ?? "text",
		showResources: Boolean(args.resources || args.r),
		phase: args.phase as SdlcPhaseName | undefined,
		taskStatus: args["task-status"] as TaskStatus | undefined,
	}
}

/**
 * Check if a phase is completed
 */
function isPhaseCompleted(phase: PhaseState): boolean {
	return !phase.active && phase.tasks.length > 0 && phase.tasks.every((t) => t.status === "completed")
}

/**
 * Count completed tasks in a phase
 */
function countCompletedTasks(phase: PhaseState): number {
	return phase.tasks.filter((t) => t.status === "completed").length
}

/**
 * Get memory usage in bytes
 */
function getMemoryUsage(): number {
	const proc = (globalThis as unknown as { process?: { memoryUsage?: () => { heapUsed: number } } }).process
	return proc?.memoryUsage?.()?.heapUsed ?? 0
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B"
	const k = 1024
	const sizes = ["B", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
	if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
	return `${(ms / 3600000).toFixed(1)}h`
}

/**
 * Format status for display
 */
function formatStatus(status: TaskStatus): string {
	const statusMap: Record<TaskStatus, string> = {
		pending: "⏳ Pending",
		in_progress: "🔄 In Progress",
		completed: "✓ Completed",
		failed: "✗ Failed",
		cancelled: "⊘ Cancelled",
	}
	return statusMap[status] ?? status
}

// =============================================================================
// OUTPUT FORMATTING
// =============================================================================

/**
 * Format status as text
 */
function formatStatusText(result: StatusResult, detailed: boolean): string {
	const lines: string[] = []

	// Header
	lines.push("═".repeat(50))
	lines.push("  SDLC Pipeline Status")
	lines.push("═".repeat(50))
	lines.push("")

	// Current phase
	if (result.currentPhase) {
		lines.push(`Current Phase: ${result.currentPhase.toUpperCase()}`)
	} else {
		lines.push("Current Phase: Not started")
	}
	lines.push("")

	// Phase summary
	lines.push("─".repeat(50))
	lines.push("  Phase Progress")
	lines.push("─".repeat(50))

	for (const phase of result.phases) {
		const status = phase.active ? "▶" : phase.completed ? "✓" : "○"
		const progress = phase.taskCount > 0 ? ` (${phase.completedTasks}/${phase.taskCount})` : ""
		lines.push(`  ${status} ${phase.name.padEnd(15)} ${progress}`)

		if (detailed && phase.startedAt) {
			lines.push(`      Started: ${phase.startedAt}`)
			if (phase.completedAt) {
				lines.push(`      Completed: ${phase.completedAt}`)
			}
		}
	}
	lines.push("")

	// Active tasks
	if (result.activeTasks.length > 0) {
		lines.push("─".repeat(50))
		lines.push("  Active Tasks")
		lines.push("─".repeat(50))

		for (const task of result.activeTasks) {
			lines.push(`  • ${task.name}`)
			lines.push(`    ID: ${task.id}`)
			lines.push(`    Status: ${formatStatus(task.status)}`)
			lines.push(`    Phase: ${task.phase}`)

			if (detailed) {
				lines.push(`    Created: ${task.createdAt}`)
				lines.push(`    Updated: ${task.updatedAt}`)
			}
			lines.push("")
		}
	}

	// Resources
	if (result.resources) {
		lines.push("─".repeat(50))
		lines.push("  Resource Usage")
		lines.push("─".repeat(50))
		lines.push(`  Memory: ${formatBytes(result.resources.memoryUsage)}`)
		lines.push(`  Tokens: ${result.resources.tokensUsed.toLocaleString()}`)
		lines.push(`  Est. Cost: ${result.resources.currency} ${result.resources.estimatedCost.toFixed(4)}`)
		lines.push("")
	}

	// Last checkpoint
	if (result.lastCheckpoint) {
		lines.push(`Last Checkpoint: ${result.lastCheckpoint}`)
	}

	// Duration
	if (result.duration) {
		lines.push(`Session Duration: ${formatDuration(result.duration)}`)
	}

	lines.push("═".repeat(50))

	return lines.join("\n")
}

/**
 * Format status as markdown
 */
function formatStatusMarkdown(result: StatusResult): string {
	const lines: string[] = []

	lines.push("# SDLC Pipeline Status")
	lines.push("")

	// Current phase
	lines.push("## Current State")
	lines.push("")
	if (result.currentPhase) {
		lines.push(`**Current Phase:** ${result.currentPhase}`)
	} else {
		lines.push("**Current Phase:** Not started")
	}
	lines.push("")

	// Phase table
	lines.push("## Phase Progress")
	lines.push("")
	lines.push("| Phase | Status | Tasks |")
	lines.push("|-------|--------|-------|")

	for (const phase of result.phases) {
		const status = phase.active ? "▶ Active" : phase.completed ? "✓ Done" : "○ Pending"
		const tasks = `${phase.completedTasks}/${phase.taskCount}`
		lines.push(`| ${phase.name} | ${status} | ${tasks} |`)
	}
	lines.push("")

	// Active tasks
	if (result.activeTasks.length > 0) {
		lines.push("## Active Tasks")
		lines.push("")
		lines.push("| ID | Name | Status | Phase |")
		lines.push("|----|------|--------|-------|")

		for (const task of result.activeTasks) {
			lines.push(`| ${task.id} | ${task.name} | ${task.status} | ${task.phase} |`)
		}
		lines.push("")
	}

	// Resources
	if (result.resources) {
		lines.push("## Resource Usage")
		lines.push("")
		lines.push(`- **Memory:** ${formatBytes(result.resources.memoryUsage)}`)
		lines.push(`- **Tokens:** ${result.resources.tokensUsed.toLocaleString()}`)
		lines.push(`- **Est. Cost:** ${result.resources.currency} ${result.resources.estimatedCost.toFixed(4)}`)
		lines.push("")
	}

	return lines.join("\n")
}

// =============================================================================
// COMMAND IMPLEMENTATION
// =============================================================================

/**
 * Status command handler
 */
async function handleStatus(args: ParsedArgs, options: CLIOptions): Promise<CommandResult> {
	const statusOptions = parseStatusOptions(args)

	try {
		// Initialize state manager
		let stateManager: SdlcStateManager
		try {
			stateManager = await createSdlcStateManager()
		} catch {
			stateManager = new SdlcStateManager()
			await stateManager.initialize()
		}

		// Get current state
		const state = await stateManager.getState()

		// Build phase status info
		const phases: PhaseStatusInfo[] = (
			["research", "planning", "implementation", "verification"] as SdlcPhaseName[]
		).map((name) => {
			const phaseState = state.phases[name]
			return {
				name,
				active: phaseState.active,
				completed: isPhaseCompleted(phaseState),
				taskCount: phaseState.tasks.length,
				completedTasks: countCompletedTasks(phaseState),
				startedAt: phaseState.started_at,
				completedAt: phaseState.completed_at,
			}
		})

		// Filter by phase if specified
		const filteredPhases = statusOptions.phase
			? phases.filter((p) => p.name === statusOptions.phase)
			: phases

		// Get active tasks
		let activeTasks: TaskStatusInfo[] = []
		for (const [phaseName, phaseState] of Object.entries(state.phases)) {
			for (const task of phaseState.tasks) {
				// Filter by task status if specified
				if (statusOptions.taskStatus && task.status !== statusOptions.taskStatus) {
					continue
				}

				// Include active tasks or all if detailed
				if (task.status === "in_progress" || statusOptions.detailed) {
					activeTasks.push({
						id: task.id,
						name: task.name,
						status: task.status,
						phase: phaseName as SdlcPhaseName,
						createdAt: task.created_at,
						updatedAt: task.updated_at,
					})
				}
			}
		}

		// Build result
		const result: StatusResult = {
			currentPhase: state.current_phase,
			phases: filteredPhases,
			activeTasks,
			lastCheckpoint: state.checkpoint_count > 0 ? `cp-${state.checkpoint_count}` : undefined,
		}

		// Add resource usage if requested
		if (statusOptions.showResources) {
			result.resources = {
				memoryUsage: getMemoryUsage(),
				cpuUsage: 0, // Would need a proper CPU monitoring solution
				tokensUsed: 0, // Would need integration with token tracking
				estimatedCost: 0,
				currency: "USD",
			}
		}

		// Calculate session duration if we have a start time
		if (state.created_at) {
			const startTime = new Date(state.created_at).getTime()
			result.duration = Date.now() - startTime
		}

		// Format output
		let output: string
		switch (statusOptions.format) {
			case "json":
				output = JSON.stringify(result, null, 2)
				break
			case "markdown":
				output = formatStatusMarkdown(result)
				break
			default:
				output = formatStatusText(result, statusOptions.detailed)
		}

		if (!options.quiet) {
			console.log(output)
		}

		return successResult(result)
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error))
		return errorResult(err)
	}
}

// =============================================================================
// COMMAND EXPORT
// =============================================================================

/**
 * Status command definition
 */
export const statusCommand: Command = {
	name: "status",
	description: "Display current SDLC state and progress",
	longDescription: `
Shows the current state of the SDLC pipeline including:
- Current phase
- Progress for each phase
- Active tasks
- Resource usage (with --resources flag)
	`.trim(),
	examples: [
		"kilo-framework status",
		"kilo-framework status --detailed",
		"kilo-framework status --phase implementation",
		"kilo-framework status --format json",
		"kilo-framework status --resources",
	],
	options: [
		{
			longFlag: "--detailed",
			shortFlag: "-d",
			description: "Show detailed information including timestamps",
			type: "boolean",
			defaultValue: false,
		},
		{
			longFlag: "--format",
			shortFlag: "-f",
			description: "Output format (text, json, markdown)",
			type: "string",
			defaultValue: "text",
		},
		{
			longFlag: "--resources",
			shortFlag: "-r",
			description: "Show resource usage information",
			type: "boolean",
			defaultValue: false,
		},
		{
			longFlag: "--phase",
			shortFlag: "-p",
			description: "Filter to show only a specific phase",
			type: "string",
		},
		{
			longFlag: "--task-status",
			description: "Filter tasks by status",
			type: "string",
		},
	],
	handler: handleStatus,
	aliases: ["st", "info"],
	category: "pipeline",
}

export { handleStatus }