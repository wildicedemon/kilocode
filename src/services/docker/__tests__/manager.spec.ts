// kilocode_change - new file
import { EventEmitter } from "events"
import { DockerManager } from "../manager"
import type { MockedFunction } from "vitest"
import { spawn } from "child_process"

vi.mock("child_process", () => ({
	spawn: vi.fn(),
}))

vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
	},
	env: {
		openExternal: vi.fn(),
	},
	Uri: {
		parse: vi.fn((url: string) => ({ toString: () => url })),
	},
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

describe("DockerManager", () => {
	const mockSpawn = spawn as MockedFunction<typeof spawn>

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns true when docker is installed", async () => {
		mockSpawn.mockImplementationOnce(() => createMockProcess({ code: 0 }))
		const manager = new DockerManager("linux")
		await expect(manager.checkDockerInstalled()).resolves.toBe(true)
	})

	it("returns false when docker is not installed", async () => {
		mockSpawn.mockImplementationOnce(() => createMockProcess({ code: 1, stderr: "not found" }))
		const manager = new DockerManager("linux")
		await expect(manager.checkDockerInstalled()).resolves.toBe(false)
	})

	it("returns true when docker daemon is running", async () => {
		mockSpawn.mockImplementationOnce(() => createMockProcess({ code: 0 }))
		const manager = new DockerManager("linux")
		await expect(manager.isDockerRunning()).resolves.toBe(true)
	})

	it("opens install guide when selected", async () => {
		const vscode = await import("vscode")
		vi.mocked(vscode.window.showInformationMessage).mockResolvedValue("Open Docker Desktop for Windows")
		const manager = new DockerManager("win32")
		await manager.offerInstallation()
		expect(vscode.env.openExternal).toHaveBeenCalled()
	})
})
