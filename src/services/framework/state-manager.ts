/**
 * AI Agentic Autonomous SDLC Framework - State Manager
 *
 * This module provides SDLC state management including:
 * - State persistence to .framework/state.json
 * - Phase transitions
 * - Checkpoint management
 * - Task tracking
 */

import * as fs from "fs/promises"
import * as path from "path"
import type {
	SdlcState,
	SdlcPhaseName,
	PhaseState,
	TaskState,
	TaskStatus,
	CheckpointInfo,
} from "./types"
import { StateManagerError } from "./types"

/**
 * Default state file path relative to workspace root
 */
const DEFAULT_STATE_FILE = ".framework/state.json"

/**
 * Checkpoint directory for storing checkpoint data
 */
const CHECKPOINT_DIR = ".framework/checkpoints"

/**
 * Creates an initial empty phase state
 *
 * @param name - The phase name
 * @returns The initial phase state
 */
function createInitialPhaseState(name: SdlcPhaseName): PhaseState {
	return {
		name,
		active: false,
		tasks: [],
	}
}

/**
 * Creates an initial SDLC state
 *
 * @param frameworkVersion - The framework version
 * @returns The initial SDLC state
 */
function createInitialState(frameworkVersion: string): SdlcState {
	const now = new Date().toISOString()
	return {
		framework_version: frameworkVersion,
		created_at: now,
		updated_at: now,
		current_phase: null,
		phases: {
			research: createInitialPhaseState("research"),
			planning: createInitialPhaseState("planning"),
			implementation: createInitialPhaseState("implementation"),
			verification: createInitialPhaseState("verification"),
		},
		checkpoint_count: 0,
	}
}

/**
 * Type guard for ENOENT errors
 */
function isEnoentError(error: unknown): boolean {
	return error !== null &&
		typeof error === "object" &&
		"code" in error &&
		(error as { code: string }).code === "ENOENT"
}

/**
 * Gets the current working directory safely
 */
function getCwd(): string {
	const proc = (globalThis as unknown as { process?: { cwd?: () => string } }).process
	return proc?.cwd?.() ?? "."
}

/**
 * SDLC State Manager
 *
 * Manages the state of the software development lifecycle, including
 * phase transitions, task tracking, and checkpoint management.
 */
export class SdlcStateManager {
	private state: SdlcState | null = null
	private readonly stateFilePath: string
	private readonly workspacePath: string
	private readonly frameworkVersion: string

	/**
	 * Creates a new SdlcStateManager instance
	 *
	 * @param options - Configuration options
	 */
	constructor(options?: {
		/** Path to state file (defaults to .framework/state.json) */
		stateFilePath?: string
		/** Workspace root path (defaults to current working directory) */
		workspacePath?: string
		/** Framework version for state tracking */
		frameworkVersion?: string
	}) {
		this.workspacePath = options?.workspacePath ?? getCwd()
		this.stateFilePath = options?.stateFilePath ?? path.join(this.workspacePath, DEFAULT_STATE_FILE)
		this.frameworkVersion = options?.frameworkVersion ?? "1.0.0"
	}

	/**
	 * Initializes the state manager.
	 * Loads existing state or creates a new one if none exists.
	 *
	 * @returns The initialized state
	 * @throws StateManagerError if initialization fails
	 */
	async initialize(): Promise<SdlcState> {
		try {
			// Try to load existing state
			this.state = await this.loadState()
			return this.state
		} catch (error) {
			if (isEnoentError(error)) {
				// No existing state, create new
				this.state = createInitialState(this.frameworkVersion)
				await this.saveState()
				return this.state
			}
			throw new StateManagerError(
				`Failed to initialize state manager: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : undefined,
			)
		}
	}

	/**
	 * Gets the current SDLC state.
	 * Throws if not initialized.
	 *
	 * @returns The current state
	 * @throws StateManagerError if not initialized
	 */
	getState(): SdlcState {
		if (!this.state) {
			throw new StateManagerError("State manager not initialized. Call initialize() first.")
		}
		return this.state
	}

	/**
	 * Gets the current active phase name.
	 *
	 * @returns The current phase name, or null if no phase is active
	 */
	getCurrentPhase(): SdlcPhaseName | null {
		return this.getState().current_phase
	}

	/**
	 * Gets the state for a specific phase.
	 *
	 * @param phaseName - The phase name
	 * @returns The phase state
	 */
	getPhaseState(phaseName: SdlcPhaseName): PhaseState {
		return this.getState().phases[phaseName]
	}

	/**
	 * Transitions to a new phase.
	 * Completes the current phase (if any) and activates the new phase.
	 *
	 * @param phaseName - The phase to transition to
	 * @returns The updated state
	 * @throws StateManagerError if transition fails
	 */
	async transitionTo(phaseName: SdlcPhaseName): Promise<SdlcState> {
		const state = this.getState()
		const now = new Date().toISOString()

		// Complete current phase if any
		if (state.current_phase) {
			const currentPhase = state.phases[state.current_phase]
			currentPhase.active = false
			currentPhase.completed_at = now
		}

		// Activate new phase
		const newPhase = state.phases[phaseName]
		newPhase.active = true
		newPhase.started_at = now

		// Update current phase
		state.current_phase = phaseName
		state.updated_at = now

		await this.saveState()
		return state
	}

	/**
	 * Adds a task to a phase.
	 *
	 * @param phaseName - The phase to add the task to
	 * @param taskName - The task name/description
	 * @param metadata - Optional task metadata
	 * @returns The created task state
	 */
	async addTask(
		phaseName: SdlcPhaseName,
		taskName: string,
		metadata?: Record<string, unknown>,
	): Promise<TaskState> {
		const state = this.getState()
		const phase = state.phases[phaseName]
		const now = new Date().toISOString()

		const task: TaskState = {
			id: this.generateTaskId(),
			name: taskName,
			status: "pending",
			created_at: now,
			updated_at: now,
			metadata,
		}

		phase.tasks.push(task)
		state.updated_at = now

		await this.saveState()
		return task
	}

	/**
	 * Updates a task's status.
	 *
	 * @param phaseName - The phase containing the task
	 * @param taskId - The task ID
	 * @param status - The new status
	 * @param error - Optional error message if task failed
	 * @returns The updated task state
	 * @throws StateManagerError if task not found
	 */
	async updateTaskStatus(
		phaseName: SdlcPhaseName,
		taskId: string,
		status: TaskStatus,
		error?: string,
	): Promise<TaskState> {
		const state = this.getState()
		const phase = state.phases[phaseName]
		const task = phase.tasks.find((t) => t.id === taskId)

		if (!task) {
			throw new StateManagerError(`Task not found: ${taskId} in phase ${phaseName}`)
		}

		const now = new Date().toISOString()
		task.status = status
		task.updated_at = now
		task.error = error

		if (status === "completed" || status === "failed" || status === "cancelled") {
			task.completed_at = now
		}

		state.updated_at = now

		await this.saveState()
		return task
	}

	/**
	 * Creates a checkpoint of the current state.
	 *
	 * @param description - Optional checkpoint description
	 * @returns The checkpoint information
	 */
	async createCheckpoint(description?: string): Promise<CheckpointInfo> {
		const state = this.getState()
		const now = new Date().toISOString()

		// Increment checkpoint count
		state.checkpoint_count += 1
		const checkpointId = `checkpoint-${state.checkpoint_count.toString().padStart(4, "0")}`

		const checkpoint: CheckpointInfo = {
			id: checkpointId,
			created_at: now,
			phase: state.current_phase ?? "research",
			description,
		}

		// Save checkpoint to file
		await this.saveCheckpoint(checkpoint, state)

		state.updated_at = now
		await this.saveState()

		return checkpoint
	}

	/**
	 * Restores state from a checkpoint.
	 *
	 * @param checkpointId - The checkpoint ID to restore
	 * @returns The restored state
	 * @throws StateManagerError if checkpoint not found
	 */
	async restoreCheckpoint(checkpointId: string): Promise<SdlcState> {
		try {
			const checkpointPath = path.join(this.workspacePath, CHECKPOINT_DIR, `${checkpointId}.json`)
			const content = await fs.readFile(checkpointPath, "utf-8")
			const data = JSON.parse(content) as { state: SdlcState; checkpoint: CheckpointInfo }

			this.state = data.state
			await this.saveState()

			return this.state
		} catch (error) {
			if (isEnoentError(error)) {
				throw new StateManagerError(`Checkpoint not found: ${checkpointId}`)
			}
			throw new StateManagerError(
				`Failed to restore checkpoint ${checkpointId}: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : undefined,
			)
		}
	}

	/**
	 * Lists all available checkpoints.
	 *
	 * @returns Array of checkpoint information
	 */
	async listCheckpoints(): Promise<CheckpointInfo[]> {
		const checkpointDir = path.join(this.workspacePath, CHECKPOINT_DIR)

		try {
			const files = await fs.readdir(checkpointDir)
			const checkpoints: CheckpointInfo[] = []

			for (const file of files) {
				if (file.endsWith(".json")) {
					const content = await fs.readFile(path.join(checkpointDir, file), "utf-8")
					const data = JSON.parse(content) as { checkpoint: CheckpointInfo }
					checkpoints.push(data.checkpoint)
				}
			}

			// Sort by creation date (oldest first)
			checkpoints.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

			return checkpoints
		} catch (error) {
			if (isEnoentError(error)) {
				return []
			}
			throw new StateManagerError(
				`Failed to list checkpoints: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : undefined,
			)
		}
	}

	/**
	 * Saves the current state to disk.
	 *
	 * @throws StateManagerError if save fails
	 */
	async saveState(): Promise<void> {
		if (!this.state) {
			throw new StateManagerError("No state to save")
		}

		try {
			// Ensure directory exists
			const dir = path.dirname(this.stateFilePath)
			await fs.mkdir(dir, { recursive: true })

			// Write state
			const content = JSON.stringify(this.state, null, 2)
			await fs.writeFile(this.stateFilePath, content, "utf-8")
		} catch (error) {
			throw new StateManagerError(
				`Failed to save state: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : undefined,
			)
		}
	}

	/**
	 * Loads state from disk.
	 *
	 * @returns The loaded state
	 * @throws StateManagerError if load fails
	 */
	async loadState(): Promise<SdlcState> {
		try {
			const content = await fs.readFile(this.stateFilePath, "utf-8")
			this.state = JSON.parse(content) as SdlcState
			return this.state
		} catch (error) {
			if (isEnoentError(error)) {
				throw error // Re-throw ENOENT to allow handling
			}
			throw new StateManagerError(
				`Failed to load state: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : undefined,
			)
		}
	}

	/**
	 * Resets the state to initial values.
	 *
	 * @returns The new initial state
	 */
	async resetState(): Promise<SdlcState> {
		this.state = createInitialState(this.frameworkVersion)
		await this.saveState()
		return this.state
	}

	/**
	 * Gets all tasks for a phase.
	 *
	 * @param phaseName - The phase name
	 * @returns Array of task states
	 */
	getTasks(phaseName: SdlcPhaseName): TaskState[] {
		return this.getPhaseState(phaseName).tasks
	}

	/**
	 * Gets a specific task by ID.
	 *
	 * @param phaseName - The phase name
	 * @param taskId - The task ID
	 * @returns The task state, or undefined if not found
	 */
	getTask(phaseName: SdlcPhaseName, taskId: string): TaskState | undefined {
		return this.getPhaseState(phaseName).tasks.find((t) => t.id === taskId)
	}

	/**
	 * Generates a unique task ID.
	 *
	 * @returns A unique task ID
	 */
	private generateTaskId(): string {
		const timestamp = Date.now().toString(36)
		const random = Math.random().toString(36).substring(2, 8)
		return `task-${timestamp}-${random}`
	}

	/**
	 * Saves a checkpoint to disk.
	 *
	 * @param checkpoint - The checkpoint info
	 * @param state - The state to save
	 */
	private async saveCheckpoint(checkpoint: CheckpointInfo, state: SdlcState): Promise<void> {
		const checkpointDir = path.join(this.workspacePath, CHECKPOINT_DIR)
		const checkpointPath = path.join(checkpointDir, `${checkpoint.id}.json`)

		await fs.mkdir(checkpointDir, { recursive: true })

		const data = {
			checkpoint,
			state,
		}

		await fs.writeFile(checkpointPath, JSON.stringify(data, null, 2), "utf-8")
	}
}

/**
 * Creates a new SdlcStateManager instance and initializes it.
 *
 * @param options - Configuration options
 * @returns The initialized state manager
 */
export async function createSdlcStateManager(options?: {
	stateFilePath?: string
	workspacePath?: string
	frameworkVersion?: string
}): Promise<SdlcStateManager> {
	const manager = new SdlcStateManager(options)
	await manager.initialize()
	return manager
}