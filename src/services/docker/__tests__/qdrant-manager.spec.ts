// kilocode_change - new file
import { EventEmitter } from "events"
import { QdrantManager } from "../qdrant-manager"
import { spawn } from "child_process"
import type { MockedFunction } from "vitest"
import * as fs from "fs/promises"

vi.mock("child_process", () => ({
	spawn: vi.fn(),
}))

vi.mock("fs/promises", () => ({
	mkdir: vi.fn(),
}))

type MockProcess = EventEmitter & { stdout: EventEmitter; stderr: EventEmitter }

const createMockProcess = (options: { stdout?: string; stderr?: string; code?: number; error?: Error }) => {
	const proc = new EventEmitter() as MockProcess
	proc.stdout = new EventEmitter()
	proc.stderr = new EventEmitter()
	queueMicrotask(() => {
		if (options.stdout) {
			proc.stdout.emit("data", options.stdout)
		}
		if (options.stderr) {
			proc.stderr.emit("data", options.stderr)
		}
		if (options.error) {
			proc.emit("error", options.error)
			return
		}
		proc.emit("close", options.code ?? 0)
	})
	return proc
}

describe("QdrantManager", () => {
	const mockSpawn = spawn as MockedFunction<typeof spawn>

	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("reports running container", async () => {
		const inspectResponse = JSON.stringify([{ State: { Running: true, Status: "running" } }])
		mockSpawn.mockImplementationOnce(() => createMockProcess({ code: 0, stdout: inspectResponse }))
		const manager = new QdrantManager({ workspacePath: "/workspace" })
		await expect(manager.isRunning()).resolves.toBe(true)
	})

	it("starts existing stopped container", async () => {
		const inspectResponse = JSON.stringify([{ State: { Running: false, Status: "exited" } }])
		mockSpawn
			.mockImplementationOnce(() => createMockProcess({ code: 0, stdout: inspectResponse }))
			.mockImplementationOnce(() => createMockProcess({ code: 0 }))
		const manager = new QdrantManager({ workspacePath: "/workspace" })
		await manager.start()
		expect(mockSpawn).toHaveBeenCalledWith("docker", ["start", "kilo-qdrant"], {
			shell: true,
			windowsHide: true,
		})
	})

	it("runs new container when missing", async () => {
		mockSpawn
			.mockImplementationOnce(() => createMockProcess({ code: 1, stderr: "no such container" }))
			.mockImplementationOnce(() => createMockProcess({ code: 0 }))
		const manager = new QdrantManager({ workspacePath: "/workspace" })
		await manager.start()
		expect(fs.mkdir).toHaveBeenCalled()
		const runCall = mockSpawn.mock.calls[1]
		expect(runCall?.[1]).toContain("run")
		expect(runCall?.[1]).toContain("qdrant/qdrant:latest")
	})

	it("waits for health endpoint", async () => {
		vi.useFakeTimers()
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }))
		const manager = new QdrantManager({ workspacePath: "/workspace" })
		const waitPromise = manager.waitForHealthy({ timeoutMs: 1000, intervalMs: 100 })
		await vi.advanceTimersByTimeAsync(100)
		await expect(waitPromise).resolves.toBeUndefined()
	})
})
