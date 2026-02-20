import * as fs from "fs/promises"
import * as path from "path"
import { SdlcStateManager, createSdlcStateManager } from "../state-manager"
import type { SdlcState, SdlcPhaseName, TaskState, TaskStatus } from "../types"
import { StateManagerError } from "../types"

vi.mock("fs/promises")
vi.mock("path")

const mockFs = vi.mocked(fs)
const mockPath = vi.mocked(path)

describe("state-manager", () => {
	let manager: SdlcStateManager
	const workspacePath = "/workspace"
	const stateFile = path.join(workspacePath, ".framework/state.json")

	beforeEach(async () => {
		vi.clearAllMocks()
		mockFs.readFile.mockResolvedValue(
			JSON.stringify({
				framework_version: "1.0.0",
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
				current_phase: null,
				phases: {},
				checkpoint_count: 0,
			} as SdlcState),
		)
		mockFs.mkdir.mockResolvedValue(undefined as any)
		mockFs.writeFile.mockResolvedValue(undefined as any)
		;(mockFs.readdir as unknown as { mockResolvedValue: (value: string[]) => void }).mockResolvedValue([])
		mockPath.join.mockImplementation((...args) => args.join("/"))
		mockPath.dirname.mockImplementation((p) => p.split("/").slice(0, -1).join("/"))

		manager = new SdlcStateManager({ workspacePath })
		await manager.initialize()
	})

	describe("initialize()", () => {
		it("loads existing state", async () => {
			const state = manager.getState()
			expect(state.framework_version).toBe("1.0.0")
			expect(mockFs.readFile).toHaveBeenCalledWith(stateFile, "utf-8")
		})

		it("creates new state if no file exists", async () => {
			mockFs.readFile.mockRejectedValueOnce({ code: "ENOENT" } as any)
			const newManager = new SdlcStateManager({ workspacePath })
			await newManager.initialize()
			expect(mockFs.writeFile).toHaveBeenCalled()
			const state = newManager.getState()
			expect(state.phases).toEqual({
				research: expect.objectContaining({ name: "research", active: false, tasks: [] }),
				planning: expect.objectContaining({ name: "planning", active: false, tasks: [] }),
				implementation: expect.objectContaining({ name: "implementation", active: false, tasks: [] }),
				verification: expect.objectContaining({ name: "verification", active: false, tasks: [] }),
			})
		})
	})

	describe("transitionTo()", () => {
		it("transitions to new phase and completes previous", async () => {
			const state = manager.getState()
			state.current_phase = "research" as SdlcPhaseName
			state.phases.research.active = true

			await manager.transitionTo("planning" as SdlcPhaseName)

			const newState = manager.getState()
			expect(newState.current_phase).toBe("planning")
			expect(newState.phases.research.active).toBe(false)
			expect(newState.phases.research.completed_at).toBeDefined()
			expect(newState.phases.planning.active).toBe(true)
			expect(mockFs.writeFile).toHaveBeenCalled()
		})
	})

	describe("addTask()", () => {
		it("adds task to phase", async () => {
			const task = await manager.addTask("planning" as SdlcPhaseName, "Design API")
			expect(task.id).toMatch(/^task-/)
			expect(task.name).toBe("Design API")
			expect(task.status).toBe("pending")
			expect(mockFs.writeFile).toHaveBeenCalled()
		})
	})

	describe("updateTaskStatus()", () => {
		it("updates task status", async () => {
			await manager.addTask("planning" as SdlcPhaseName, "Design API")
			const state = manager.getState()
			const taskId = state.phases.planning.tasks[0].id

			const updated = await manager.updateTaskStatus("planning" as SdlcPhaseName, taskId, "completed")
			expect(updated.status).toBe("completed")
			expect(updated.completed_at).toBeDefined()
		})

		it("throws if task not found", async () => {
			await expect(
				manager.updateTaskStatus("planning" as SdlcPhaseName, "nonexistent", "completed" as TaskStatus),
			).rejects.toThrow(StateManagerError)
		})
	})

	describe("createCheckpoint()", () => {
		it("creates checkpoint and increments count", async () => {
			const checkpoint = await manager.createCheckpoint("Test checkpoint")
			expect(checkpoint.id).toMatch(/^checkpoint-0001$/)
			expect(checkpoint.description).toBe("Test checkpoint")
			const state = manager.getState()
			expect(state.checkpoint_count).toBe(1)
			expect(mockFs.writeFile).toHaveBeenNthCalledWith(
				2,
				expect.stringContaining("checkpoints/checkpoint-0001.json"),
				expect.any(String),
			)
		})
	})

	describe("restoreCheckpoint()", () => {
		it("restores from checkpoint", async () => {
			const checkpointPath = path.join(workspacePath, ".framework/checkpoints/checkpoint-0001.json")
			const checkpointState = {
				state: { current_phase: "planning" as SdlcPhaseName },
				checkpoint: { id: "checkpoint-0001" },
			}
			mockFs.readFile.mockResolvedValueOnce(JSON.stringify(checkpointState))

			const restored = await manager.restoreCheckpoint("checkpoint-0001")
			expect(restored.current_phase).toBe("planning")
		})

		it("throws if checkpoint not found", async () => {
			mockFs.readFile.mockRejectedValueOnce({ code: "ENOENT" } as any)
			await expect(manager.restoreCheckpoint("missing")).rejects.toThrow(StateManagerError)
		})
	})

	describe("listCheckpoints()", () => {
		it("lists checkpoints", async () => {
			const checkpointDir = path.join(workspacePath, ".framework/checkpoints")
			;(mockFs.readdir as unknown as { mockResolvedValueOnce: (value: string[]) => void }).mockResolvedValueOnce([
				"checkpoint-0001.json",
			])
			mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ checkpoint: { id: "checkpoint-0001" } }))

			const checkpoints = await manager.listCheckpoints()
			expect(checkpoints).toHaveLength(1)
			expect(checkpoints[0].id).toBe("checkpoint-0001")
		})

		it("returns empty if no checkpoints", async () => {
			mockFs.readdir.mockRejectedValueOnce({ code: "ENOENT" } as any)
			const checkpoints = await manager.listCheckpoints()
			expect(checkpoints).toHaveLength(0)
		})
	})

	describe("createSdlcStateManager()", () => {
		it("creates and initializes manager", async () => {
			const mgr = await createSdlcStateManager({ workspacePath })
			expect(mgr).toBeInstanceOf(SdlcStateManager)
		})
	})
})
