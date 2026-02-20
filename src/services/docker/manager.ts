// kilocode_change - new file
import * as vscode from "vscode"
import { spawn } from "child_process"

export type DockerInstallInstructions = {
	win32: { label: string; url: string }
	darwin: { label: string; url: string }
	linux: { label: string; url: string }
	default: { label: string; url: string }
}

type CommandResult = {
	stdout: string
	stderr: string
	code: number
}

export class DockerManager {
	private readonly platform: NodeJS.Platform

	constructor(platform: NodeJS.Platform = process.platform) {
		this.platform = platform
	}

	public async checkDockerInstalled(): Promise<boolean> {
		const result = await this.runCommand("docker", ["--version"])
		return result.code === 0
	}

	public async isDockerRunning(): Promise<boolean> {
		const result = await this.runCommand("docker", ["info"])
		return result.code === 0
	}

	public async offerInstallation(): Promise<void> {
		const instructions = this.getInstallInstructions()
		const current =
			this.platform === "win32"
				? instructions.win32
				: this.platform === "darwin"
					? instructions.darwin
					: this.platform === "linux"
						? instructions.linux
						: instructions.default
		const selection = await vscode.window.showInformationMessage(
			"Docker is required to run a local Qdrant container.",
			`Open ${current.label}`,
			"Later",
		)
		if (selection === `Open ${current.label}`) {
			await vscode.env.openExternal(vscode.Uri.parse(current.url))
		}
	}

	public getInstallInstructions(): DockerInstallInstructions {
		return {
			win32: {
				label: "Docker Desktop for Windows",
				url: "https://docs.docker.com/desktop/install/windows-install/",
			},
			darwin: {
				label: "Docker Desktop for Mac",
				url: "https://docs.docker.com/desktop/install/mac-install/",
			},
			linux: {
				label: "Docker Engine for Linux",
				url: "https://docs.docker.com/engine/install/",
			},
			default: {
				label: "Docker Installation Guide",
				url: "https://docs.docker.com/get-docker/",
			},
		}
	}

	private async runCommand(command: string, args: string[]): Promise<CommandResult> {
		return new Promise((resolve) => {
			const child = spawn(command, args, { shell: true, windowsHide: true })
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
