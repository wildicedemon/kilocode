// kilocode_change - new file
import { spawn } from "child_process"
import * as path from "path"
import * as os from "os"
import * as fs from "fs/promises"

export type QdrantStatus = {
	exists: boolean
	running: boolean
	status?: string
	health?: string
	version?: string
}

type CommandResult = {
	stdout: string
	stderr: string
	code: number
}

type QdrantManagerOptions = {
	workspacePath?: string
	globalStoragePath?: string
	dataPath?: string
}

export class QdrantManager {
	public readonly containerName = "kilo-qdrant"
	public readonly port = 6333
	public readonly dataPath: string

	constructor(options: QdrantManagerOptions = {}) {
		this.dataPath = this.resolveDataPath(options)
	}

	public async isRunning(): Promise<boolean> {
		const info = await this.inspectContainer()
		return Boolean(info?.State?.Running)
	}

	public async start(): Promise<void> {
		const inspect = await this.inspectContainer()
		if (inspect?.State?.Running) {
			return
		}
		if (inspect) {
			const result = await this.runDocker(["start", this.containerName])
			if (result.code !== 0) {
				throw new Error(result.stderr || "Failed to start Qdrant container")
			}
			return
		}
		await fs.mkdir(this.dataPath, { recursive: true })
		const result = await this.runDocker([
			"run",
			"-d",
			"--name",
			this.containerName,
			"-p",
			`${this.port}:${this.port}`,
			"-v",
			`${this.dataPath}:/qdrant/storage",
			"qdrant/qdrant:latest",
		])
		if (result.code !== 0) {
			const message = this.normalizeDockerError(result.stderr)
			throw new Error(message)
		}
	}

	public async stop(): Promise<void> {
		const inspect = await this.inspectContainer()
		if (!inspect?.State?.Running) {
			return
		}
		const result = await this.runDocker(["stop", this.containerName])
		if (result.code !== 0) {
			throw new Error(result.stderr || "Failed to stop Qdrant container")
		}
	}

	public async getStatus(): Promise<QdrantStatus> {
		const inspect = await this.inspectContainer()
		if (!inspect) {
			return { exists: false, running: false }
		}
		const running = Boolean(inspect.State?.Running)
		const health = inspect.State?.Health?.Status
		const version = running ? await this.getContainerVersion() : undefined
		return {
			exists: true,
			running,
			status: inspect.State?.Status,
			health,
			version,
		}
	}

	public async waitForHealthy(options: { timeoutMs?: number; intervalMs?: number } = {}): Promise<void> {
		const timeoutMs = options.timeoutMs ?? 30000
		const intervalMs = options.intervalMs ?? 1000
		const start = Date.now()
		while (Date.now() - start < timeoutMs) {
			const healthy = await this.checkHealthEndpoint()
			if (healthy) {
				return
			}
			await new Promise((resolve) => setTimeout(resolve, intervalMs))
		}
		throw new Error("Qdrant health check timed out")
	}

	private resolveDataPath(options: QdrantManagerOptions): string {
		if (options.dataPath) {
			return options.dataPath
		}
		if (options.workspacePath) {
			return path.join(options.workspacePath, ".kilo", "qdrant-data")
		}
		if (options.globalStoragePath) {
			return path.join(options.globalStoragePath, "qdrant-data")
		}
		return path.join(os.homedir(), ".kilo", "qdrant-data")
	}

	private async inspectContainer(): Promise<any | undefined> {
		const result = await this.runDocker(["inspect", this.containerName])
		if (result.code !== 0) {
			return undefined
		}
		try {
			const parsed = JSON.parse(result.stdout)
			return parsed[0]
		} catch {
			return undefined
		}
	}

	private async getContainerVersion(): Promise<string | undefined> {
		const result = await this.runDocker(["exec", this.containerName, "/qdrant/qdrant", "--version"])
		if (result.code !== 0) {
			return undefined
		}
		return result.stdout.trim() || undefined
	}

	private async checkHealthEndpoint(): Promise<boolean> {
		try {
			const response = await fetch(`http://localhost:${this.port}/healthz`)
			return response.ok
		} catch {
			return false
		}
	}

	private normalizeDockerError(stderr: string): string {
		if (stderr.includes("port is already allocated") || stderr.includes("Bind for")) {
			return `Port ${this.port} is already in use. Stop the process using this port or configure Qdrant to use a different port.`
		}
		return stderr || "Failed to start Qdrant container"
	}

	private async runDocker(args: string[]): Promise<CommandResult> {
		return new Promise((resolve) => {
			const child = spawn("docker", args, { shell: true, windowsHide: true })
			let stdout = ""
			let stderr = ""
			child.stdout?.on("data", (data: unknown) => {
				stdout += String(data)
			})
			child.stderr?.on("data", (data: unknown) => {
				stderr += String(data)
			})
			child.on("close", (code: number | null) => {
				resolve({ stdout, stderr, code: code ?? 1 })
			})
			child.on("error", (error: Error) => {
				resolve({ stdout: "", stderr: error.message, code: 1 })
			})
		})
	}
}
