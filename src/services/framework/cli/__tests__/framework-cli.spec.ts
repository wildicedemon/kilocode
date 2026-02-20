import { FrameworkCLI, createCLI, main } from "../index"
import type { ParsedArgs, CLIOptions, CommandResult } from "../types"
import { startCommand, statusCommand } from "../commands"

vi.mock("process", () => ({
	argv: [],
}))

describe("FrameworkCLI", () => {
	let cli: FrameworkCLI

	beforeEach(() => {
		cli = createCLI({ verbose: true })
	})

	it("registers built-in commands", () => {
		expect(cli.getAllCommands()).toHaveLength(5)
		expect(cli.getCommand("start")).toBeDefined()
		expect(cli.getCommand("status")).toBeDefined()
	})

	it("handles --version", async () => {
		const mockProcess = vi.spyOn(require("process"), "argv")
		mockProcess.mockReturnValue(["node", "cli.js", "--version"])

		const exitCode = await cli.run(["--version"])
		expect(exitCode).toBe(0)
	})

	it("handles --help", async () => {
		const exitCode = await cli.run(["--help"])
		expect(exitCode).toBe(0)
	})

	it("throws UnknownCommandError for unknown command", async () => {
		await expect(cli.run(["unknown"])).rejects.toThrow("Unknown command: unknown")
	})

	describe("parseArgs()", () => {
		it("parses positional command", () => {
			const parsed = (cli as any)["parseArgs"](["start", "arg1"])
			expect(parsed.command).toBe("start")
			expect(parsed._).toEqual(["arg1"])
		})

		it("parses long options", () => {
			const parsed = (cli as any)["parseArgs"](["--verbose", "--config", "config.yaml"])
			expect(parsed.verbose).toBe(true)
			expect(parsed.config).toBe("config.yaml")
		})

		it("parses short options", () => {
			const parsed = (cli as any)["parseArgs"](["-v"])
			expect(parsed.v).toBe(true)
		})

		it("parses --no-color", () => {
			const parsed = (cli as any)["parseArgs"](["--no-color"])
			expect(parsed.color).toBe(false)
		})
	})

	describe("TextFormatter", () => {
		it("formats success result", () => {
			const formatter = cli["formatter"] as any
			const result: CommandResult = { status: "success", exitCode: 0, message: "Done" }
			const output = formatter.formatResult(result)
			expect(output).toContain("✓ Done")
		})
	})
})
