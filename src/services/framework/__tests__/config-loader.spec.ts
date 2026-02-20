import {
	loadConfig,
	getDefaultConfig,
	validateConfig,
	loadConfigFromPath,
	saveConfig,
	substituteEnvVarsDeep,
	deepMerge,
} from "../config-loader"
import type { FrameworkConfig } from "../types"
import { FrameworkConfigError } from "../types"

vi.mock("fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("fs/promises")>()
	return {
		...actual,
		access: vi.fn(),
		readFile: vi.fn(),
		mkdir: vi.fn(),
		writeFile: vi.fn(),
	}
})

vi.mock("yaml", async (importOriginal) => {
	const actual = await importOriginal<typeof import("yaml")>()
	return {
		...actual,
		parse: vi.fn(),
		stringify: vi.fn(),
	}
})

vi.mock("path", async (importOriginal) => {
	const actual = await importOriginal<typeof import("path")>()
	return {
		...actual,
		join: vi.fn(actual.join),
		dirname: vi.fn(actual.dirname),
	}
})

const mockFs = vi.mocked(await import("fs/promises"), true)
const mockYaml = vi.mocked(await import("yaml"), true)
const mockPath = vi.mocked(await import("path"), true)

describe("config-loader", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFs.access.mockResolvedValue(undefined as any)
		mockFs.readFile.mockImplementation((filePath: Parameters<typeof mockFs.readFile>[0]) => {
			const pathValue = typeof filePath === "string" ? filePath : (filePath?.toString?.() ?? "")
			const normalizedPath = pathValue.replace(/\\/g, "/")
			if (normalizedPath.includes(".framework/schema.json")) {
				return Promise.resolve("{}")
			}
			return Promise.resolve("")
		})
		mockFs.mkdir.mockResolvedValue(undefined as any)
		mockFs.writeFile.mockResolvedValue(undefined as any)
		mockYaml.parse.mockReturnValue({})
	})

	describe("getDefaultConfig()", () => {
		it("returns the default configuration structure", () => {
			const config = getDefaultConfig()
			expect(config).toMatchObject({
				framework: expect.objectContaining({
					name: "AI Agentic Autonomous SDLC Framework",
				}),
				sdlc: expect.any(Object),
				scanner: expect.any(Object),
				waste_detection: expect.any(Object),
				cost_oversight: expect.any(Object),
				webhooks: expect.any(Object),
				bootstrap: expect.any(Object),
				modes: expect.any(Object),
				voice: expect.any(Object),
				logging: expect.any(Object),
			})
			expect(config.sdlc.research.enabled).toBe(true)
			expect(config.scanner.enabled).toBe(true)
			expect(config.modes.requirements).toEqual({
				enabled: true,
				config: ".framework/modes/requirements.yaml",
			})
		})
	})

	describe("loadConfig()", () => {
		const workspacePath = "/workspace"

		beforeEach(() => {
			// Mock getCwd to return workspace path
			vi.doMock("../config-loader", () => {
				const actual = vi.importActual("../config-loader")
				return {
					...actual,
					getCwd: () => workspacePath,
				}
			})
		})

		it("loads default config when no config file exists", async () => {
			mockFs.access.mockRejectedValue({ code: "ENOENT" } as any)

			const config = await loadConfig()
			expect(config).toEqual(getDefaultConfig())
			expect(mockFs.access).toHaveBeenCalledWith(expect.stringMatching(/\.framework[\\/]+config/))
			expect(mockFs.readFile).toHaveBeenCalledWith(
				expect.stringMatching(/\.framework[\\/]+schema\.json$/),
				"utf-8",
			)
		})

		it("merges project config with defaults", async () => {
			const projectConfig = { sdlc: { research: { enabled: false } } }
			mockYaml.parse.mockReturnValueOnce(projectConfig)

			mockFs.access.mockResolvedValueOnce(undefined as any)
			mockFs.readFile.mockResolvedValueOnce("sdlc:\n  research:\n    enabled: false")

			const config = await loadConfig()
			expect(config.sdlc.research.enabled).toBe(false)
			expect(mockFs.readFile).toHaveBeenCalledWith(
				expect.stringMatching(/\.framework[\\/]+config\.yaml$/),
				"utf-8",
			)
			expect(mockYaml.parse).toHaveBeenCalledWith("sdlc:\n  research:\n    enabled: false")
		})

		it("applies environment variable substitution", async () => {
			const projectConfig = { webhooks: { github: { secret: "${GITHUB_SECRET}" } } }
			process.env.GITHUB_SECRET = "mysecret"

			mockYaml.parse.mockReturnValueOnce(projectConfig)
			mockFs.access.mockResolvedValueOnce(undefined as any)
			mockFs.readFile.mockResolvedValueOnce("webhooks:\n  github:\n    secret: ${GITHUB_SECRET}")

			const config = await loadConfig()
			expect(config.webhooks.github.secret).toBe("mysecret")
		})

		it("skips env substitution when skipEnvSubstitution=true", async () => {
			const projectConfig = { webhooks: { github: { secret: "${GITHUB_SECRET}" } } }
			process.env.GITHUB_SECRET = "mysecret"

			mockYaml.parse.mockReturnValueOnce(projectConfig)
			mockFs.access.mockResolvedValueOnce(undefined as any)

			const config = await loadConfig({ skipEnvSubstitution: true })
			expect(config.webhooks.github.secret).toBe("${GITHUB_SECRET}")
		})

		it("validates config structure", async () => {
			const config = await loadConfig()
			expect(() => validateConfig(config)).not.toThrow()
		})

		it("throws FrameworkConfigError on invalid structure", () => {
			const invalidConfig = { missing: "framework" }
			expect(() => validateConfig(invalidConfig as any)).toThrow(FrameworkConfigError)
			expect(() => validateConfig(invalidConfig as any)).toThrow("Missing required field: framework")
		})
	})

	describe("loadConfigFromPath()", () => {
		it("loads config from specified path and merges with defaults", async () => {
			const configPath = "/path/to/config.yaml"
			const fileConfig = { sdlc: { research: { timeout: 900 } } }
			mockYaml.parse.mockReturnValueOnce(fileConfig)
			mockFs.readFile.mockResolvedValueOnce("sdlc:\n  research:\n    timeout: 900")

			const config = await loadConfigFromPath(configPath)
			expect(config.sdlc.research.timeout).toBe(900)
			expect(mockFs.readFile).toHaveBeenCalledWith(configPath, "utf-8")
		})

		it("handles missing file gracefully", async () => {
			const configPath = "/nonexistent.yaml"
			mockFs.readFile.mockRejectedValueOnce({ code: "ENOENT" } as any)

			const config = await loadConfigFromPath(configPath)
			expect(config).toEqual(getDefaultConfig())
		})
	})

	describe("saveConfig()", () => {
		it("saves config as YAML", async () => {
			const configPath = "/path/to/config.yaml"
			const config: FrameworkConfig = getDefaultConfig() as FrameworkConfig
			mockPath.dirname.mockReturnValueOnce("/path/to")
			mockYaml.stringify.mockReturnValueOnce("yaml content")

			await saveConfig(config, configPath, "yaml")
			expect(mockFs.mkdir).toHaveBeenCalledWith("/path/to", { recursive: true })
			expect(mockYaml.stringify).toHaveBeenCalledWith(config, { lineWidth: 0 })
			expect(mockFs.writeFile).toHaveBeenCalledWith(configPath, "yaml content", "utf-8")
		})

		it("saves config as JSON", async () => {
			const configPath = "/path/to/config.json"
			const config: FrameworkConfig = getDefaultConfig() as FrameworkConfig
			mockPath.dirname.mockReturnValueOnce("/path/to")

			await saveConfig(config, configPath, "json")
			expect(mockFs.writeFile).toHaveBeenCalledWith(configPath, JSON.stringify(config, null, 2), "utf-8")
		})
	})

	describe("env var substitution", () => {
		it("substitutes simple env vars", () => {
			process.env.TEST_VAR = "value"
			const result = substituteEnvVarsDeep("${TEST_VAR}" as any)
			expect(result).toBe("value")
		})

		it("uses default values ${VAR:-default}", () => {
			const result = substituteEnvVarsDeep("${NONEXISTENT:-fallback}" as any)
			expect(result).toBe("fallback")
		})

		it("handles nested objects", () => {
			process.env.NESTED = "nestedvalue"
			const obj = { key: { subkey: "${NESTED}" } }
			const result = substituteEnvVarsDeep(obj as any)
			expect(result.key.subkey).toBe("nestedvalue")
		})
	})

	describe("deepMerge()", () => {
		it("merges objects deeply", () => {
			const target: Record<string, unknown> = { a: 1, b: { c: 2 } }
			const source: Record<string, unknown> = { b: { d: 3 }, e: 4 }
			const result = deepMerge(target, source)
			expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 })
		})

		it("overrides arrays", () => {
			const target = { arr: [1, 2] }
			const source = { arr: [3, 4] }
			const result = deepMerge(target, source)
			expect(result.arr).toEqual([3, 4])
		})
	})
})
