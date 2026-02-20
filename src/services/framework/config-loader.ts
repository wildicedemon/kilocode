/**
 * AI Agentic Autonomous SDLC Framework - Configuration Loader
 *
 * This module provides hierarchical configuration loading with:
 * - Default configuration values
 * - Project-level configuration (.framework/config.yaml)
 * - User-level configuration
 * - Environment variable substitution
 * - JSON schema validation
 */

import * as fs from "fs/promises"
import * as path from "path"
import * as yaml from "yaml"
import type { FrameworkConfig, ConfigLoadOptions } from "./types"
import { FrameworkConfigError } from "./types"

/**
 * Default framework configuration
 */
const DEFAULT_CONFIG: FrameworkConfig = {
	framework: {
		name: "AI Agentic Autonomous SDLC Framework",
		version: "1.0.0",
		description: "Autonomous software development lifecycle management for Kilo Code",
	},
	sdlc: {
		research: {
			enabled: true,
			timeout: 1800,
			checkpoint_interval: 300,
		},
		planning: {
			enabled: true,
			timeout: 1200,
			checkpoint_interval: 300,
		},
		implementation: {
			enabled: true,
			timeout: 3600,
			checkpoint_interval: 600,
			max_iterations: 10,
		},
		verification: {
			enabled: true,
			timeout: 1800,
			checkpoint_interval: 300,
			test_coverage_threshold: 80,
		},
	},
	scanner: {
		enabled: true,
		passes: ["anti-patterns", "architecture", "performance", "security"],
		continuous: true,
		state_file: ".framework/scanner-state.md",
		repertoire_file: ".framework/scanner-repertoire.md",
		mcp_servers: ["codegraph-context"],
	},
	waste_detection: {
		enabled: true,
		token_thresholds: {
			warn: 15000,
			pause: 30000,
		},
		loop_detection: true,
		alert_channels: ["console", "langfuse"],
	},
	cost_oversight: {
		enabled: true,
		budget_per_task: 10.0,
		budget_per_phase: 50.0,
		currency: "USD",
		langfuse_integration: true,
	},
	webhooks: {
		enabled: false,
		port: 3000,
		github: {
			enabled: false,
			secret: "${GITHUB_WEBHOOK_SECRET}",
			events: ["issues", "pull_request", "workflow_run"],
		},
	},
	bootstrap: {
		auto_check_updates: true,
		mcp_servers: {
			"codegraph-context": {
				enabled: true,
				package: "@kilocode/mcp-codegraph",
			},
			"rag-memory": {
				enabled: true,
				package: "@kilocode/mcp-rag-memory",
			},
			taskmaster: {
				enabled: true,
				package: "@kilocode/mcp-taskmaster",
			},
		},
	},
	modes: {
		orchestrator: {
			enabled: true,
			config: ".framework/modes/orchestrator.yaml",
		},
		requirements: {
			enabled: true,
			config: ".framework/modes/requirements.yaml",
		},
		// kilocode_change start
		architect: {
			enabled: true,
			config: ".framework/modes/architect.yaml",
		},
		// kilocode_change end
		scanner: {
			enabled: true,
			config: ".framework/modes/scanner.yaml",
		},
		review: {
			enabled: true,
			config: ".framework/modes/review.yaml",
		},
	},
	voice: {
		enabled: false,
		personaPlex: {
			enabled: false,
			config_path: ".framework/voice/personas.yaml",
		},
	},
	logging: {
		level: "info",
		output: ".framework/logs/",
		rotation: "daily",
	},
}

/**
 * Configuration file search locations in order of priority (highest first)
 */
const CONFIG_PATHS = [".framework/config.yaml", ".framework/config.yml", ".framework/config.json"]

/**
 * Substitutes environment variables in a string value.
 * Supports ${VAR_NAME} and ${VAR_NAME:-default} syntax.
 *
 * @param value - The string value to process
 * @returns The value with environment variables substituted
 */
function substituteEnvVars(value: string): string {
	// Match ${VAR_NAME} or ${VAR_NAME:-default}
	const envVarPattern = /\$\{([^}:]+)(?::-([^}]*))?\}/g

	return value.replace(envVarPattern, (_, varName: string, defaultValue?: string) => {
		// Access process.env safely
		const envValue = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
			?.env?.[varName]
		if (envValue !== undefined && envValue !== "") {
			return envValue
		}
		if (defaultValue !== undefined) {
			return defaultValue
		}
		// Return original if no value and no default
		return `\${${varName}}`
	})
}

/**
 * Recursively substitutes environment variables in an object.
 *
 * @param obj - The object to process
 * @returns The object with environment variables substituted
 */
// kilocode_change start
export function substituteEnvVarsDeep<T>(obj: T): T {
	if (typeof obj === "string") {
		return substituteEnvVars(obj) as T
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => substituteEnvVarsDeep(item)) as T
	}

	if (obj !== null && typeof obj === "object") {
		const result: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(obj)) {
			result[key] = substituteEnvVarsDeep(value)
		}
		return result as T
	}

	return obj
}

/**
 * Deep merges two objects, with the second object taking precedence.
 *
 * @param target - The base object
 * @param source - The object to merge into target
 * @returns The merged object
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
	if (target === null || target === undefined) {
		return source as T
	}
	if (source === null || source === undefined) {
		return target
	}

	if (typeof target !== "object" || typeof source !== "object") {
		return source as T
	}

	if (Array.isArray(target) || Array.isArray(source)) {
		return source as T
	}

	const result = { ...target } as Record<string, unknown>
	const sourceRecord = source as Record<string, unknown>

	for (const key of Object.keys(sourceRecord)) {
		const sourceValue = sourceRecord[key]
		const targetValue = (target as Record<string, unknown>)[key]

		if (
			sourceValue !== null &&
			typeof sourceValue === "object" &&
			!Array.isArray(sourceValue) &&
			targetValue !== null &&
			typeof targetValue === "object" &&
			!Array.isArray(targetValue)
		) {
			// Recursively merge objects
			result[key] = deepMerge(targetValue, sourceValue)
		} else {
			// Override with source value
			result[key] = sourceValue
		}
	}

	return result as T
}
// kilocode_change end

/**
 * Validates that a configuration object has all required fields.
 * This is a runtime validation that checks the structure matches FrameworkConfig.
 *
 * @param config - The configuration object to validate
 * @throws FrameworkConfigError if validation fails
 */
function validateConfigStructure(config: unknown): asserts config is FrameworkConfig {
	if (!config || typeof config !== "object") {
		throw new FrameworkConfigError("Configuration must be a non-null object")
	}

	const cfg = config as Record<string, unknown>

	// Validate framework metadata
	if (!cfg.framework || typeof cfg.framework !== "object") {
		throw new FrameworkConfigError("Missing required field: framework")
	}
	const framework = cfg.framework as Record<string, unknown>
	if (typeof framework.name !== "string" || framework.name.length === 0) {
		throw new FrameworkConfigError("framework.name must be a non-empty string")
	}
	if (typeof framework.version !== "string") {
		throw new FrameworkConfigError("framework.version must be a string")
	}
	if (typeof framework.description !== "string") {
		throw new FrameworkConfigError("framework.description must be a string")
	}

	// Validate SDLC configuration
	if (!cfg.sdlc || typeof cfg.sdlc !== "object") {
		throw new FrameworkConfigError("Missing required field: sdlc")
	}

	// Validate scanner configuration
	if (!cfg.scanner || typeof cfg.scanner !== "object") {
		throw new FrameworkConfigError("Missing required field: scanner")
	}

	// Validate waste_detection configuration
	if (!cfg.waste_detection || typeof cfg.waste_detection !== "object") {
		throw new FrameworkConfigError("Missing required field: waste_detection")
	}

	// Validate cost_oversight configuration
	if (!cfg.cost_oversight || typeof cfg.cost_oversight !== "object") {
		throw new FrameworkConfigError("Missing required field: cost_oversight")
	}

	// Validate webhooks configuration
	if (!cfg.webhooks || typeof cfg.webhooks !== "object") {
		throw new FrameworkConfigError("Missing required field: webhooks")
	}

	// Validate bootstrap configuration
	if (!cfg.bootstrap || typeof cfg.bootstrap !== "object") {
		throw new FrameworkConfigError("Missing required field: bootstrap")
	}

	// Validate modes configuration
	if (!cfg.modes || typeof cfg.modes !== "object") {
		throw new FrameworkConfigError("Missing required field: modes")
	}

	// Validate voice configuration
	if (!cfg.voice || typeof cfg.voice !== "object") {
		throw new FrameworkConfigError("Missing required field: voice")
	}

	// Validate logging configuration
	if (!cfg.logging || typeof cfg.logging !== "object") {
		throw new FrameworkConfigError("Missing required field: logging")
	}
}

/**
 * Validates configuration against the JSON schema.
 * Loads the schema from .framework/schema.json if available.
 *
 * @param config - The configuration to validate
 * @param workspacePath - The workspace root path
 * @throws FrameworkConfigError if validation fails
 */
async function validateAgainstSchema(config: FrameworkConfig, workspacePath: string): Promise<void> {
	const schemaPath = path.join(workspacePath, ".framework", "schema.json")

	try {
		const schemaContent = await fs.readFile(schemaPath, "utf-8")
		const schema = JSON.parse(schemaContent)

		// Basic schema validation - check required properties
		if (schema.required && Array.isArray(schema.required)) {
			for (const requiredField of schema.required) {
				if (!(requiredField in config)) {
					throw new FrameworkConfigError(`Missing required field: ${requiredField}`)
				}
			}
		}

		// Validate nested properties based on schema
		if (schema.properties) {
			validateSchemaProperties(config as unknown as Record<string, unknown>, schema.properties, "")
		}
	} catch (error) {
		if (isEnoentError(error)) {
			// Schema file doesn't exist, skip schema validation
			return
		}
		throw error
	}
}

/**
 * Type guard for ENOENT errors
 */
function isEnoentError(error: unknown): boolean {
	return (
		error !== null && typeof error === "object" && "code" in error && (error as { code: string }).code === "ENOENT"
	)
}

/**
 * Recursively validates object properties against schema definition.
 *
 * @param obj - The object to validate
 * @param schemaProps - The schema properties definition
 * @param path - Current path for error messages
 * @throws FrameworkConfigError if validation fails
 */
function validateSchemaProperties(
	obj: Record<string, unknown>,
	schemaProps: Record<string, unknown>,
	path: string,
): void {
	for (const [key, propSchema] of Object.entries(schemaProps)) {
		if (key === "additionalProperties" || key === "required") {
			continue
		}

		const currentPath = path ? `${path}.${key}` : key
		const value = obj[key]

		if (propSchema && typeof propSchema === "object") {
			const schema = propSchema as Record<string, unknown>

			// Check type
			if (schema.type && value !== undefined) {
				const expectedType = schema.type as string
				const actualType = Array.isArray(value) ? "array" : typeof value

				if (expectedType === "integer") {
					if (typeof value !== "number" || !Number.isInteger(value)) {
						throw new FrameworkConfigError(`${currentPath} must be an integer, got ${actualType}`)
					}
				} else if (expectedType === "array") {
					if (!Array.isArray(value)) {
						throw new FrameworkConfigError(`${currentPath} must be an array, got ${actualType}`)
					}
				} else if (expectedType !== actualType) {
					throw new FrameworkConfigError(`${currentPath} must be ${expectedType}, got ${actualType}`)
				}
			}

			// Check enum values
			if (schema.enum && value !== undefined) {
				const enumValues = schema.enum as unknown[]
				if (!enumValues.includes(value)) {
					throw new FrameworkConfigError(
						`${currentPath} must be one of: ${enumValues.join(", ")}, got ${value}`,
					)
				}
			}

			// Check minimum for numbers
			if (schema.minimum !== undefined && typeof value === "number") {
				const min = schema.minimum as number
				if (value < min) {
					throw new FrameworkConfigError(`${currentPath} must be >= ${min}, got ${value}`)
				}
			}

			// Check maximum for numbers
			if (schema.maximum !== undefined && typeof value === "number") {
				const max = schema.maximum as number
				if (value > max) {
					throw new FrameworkConfigError(`${currentPath} must be <= ${max}, got ${value}`)
				}
			}

			// Recursively validate nested objects
			if (schema.properties && typeof value === "object" && value !== null) {
				validateSchemaProperties(
					value as Record<string, unknown>,
					schema.properties as Record<string, unknown>,
					currentPath,
				)
			}
		}
	}
}

/**
 * Loads configuration from a file (YAML or JSON).
 *
 * @param filePath - Path to the configuration file
 * @returns The parsed configuration object
 * @throws FrameworkConfigError if the file cannot be read or parsed
 */
async function loadConfigFile(filePath: string): Promise<Partial<FrameworkConfig>> {
	try {
		const content = await fs.readFile(filePath, "utf-8")

		if (filePath.endsWith(".json")) {
			return JSON.parse(content)
		}

		// Parse YAML
		return yaml.parse(content) as Partial<FrameworkConfig>
	} catch (error) {
		if (isEnoentError(error)) {
			return {}
		}
		throw new FrameworkConfigError(
			`Failed to load configuration from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
			error instanceof Error ? error : undefined,
		)
	}
}

/**
 * Finds the first existing configuration file in the search paths.
 *
 * @param basePath - The base directory to search from
 * @returns The path to the found configuration file, or null if none found
 */
async function findConfigFile(basePath: string): Promise<string | null> {
	for (const configPath of CONFIG_PATHS) {
		const fullPath = path.join(basePath, configPath)
		try {
			await fs.access(fullPath)
			return fullPath
		} catch {
			// Continue to next path
		}
	}
	return null
}

/**
 * Gets the current working directory safely.
 */
function getCwd(): string {
	// Access process.cwd() safely for environments where process might not be available
	const proc = (globalThis as unknown as { process?: { cwd?: () => string } }).process
	return proc?.cwd?.() ?? "."
}

/**
 * Gets the default framework configuration.
 * This returns a deep copy of the default configuration.
 *
 * @returns The default FrameworkConfig
 */
export function getDefaultConfig(): FrameworkConfig {
	return JSON.parse(JSON.stringify(DEFAULT_CONFIG))
}

/**
 * Validates a configuration object and returns a typed FrameworkConfig.
 *
 * @param config - The configuration object to validate
 * @returns The validated FrameworkConfig
 * @throws FrameworkConfigError if validation fails
 */
export function validateConfig(config: unknown): FrameworkConfig {
	validateConfigStructure(config)
	return config as FrameworkConfig
}

/**
 * Loads the framework configuration with hierarchical merging.
 *
 * The loading order is (later values override earlier):
 * 1. Default configuration
 * 2. Project-level configuration (.framework/config.yaml)
 * 3. User-specified configuration file (if configPath provided)
 *
 * Environment variable substitution is applied after merging.
 *
 * @param options - Configuration loading options
 * @returns The loaded and validated FrameworkConfig
 * @throws FrameworkConfigError if loading or validation fails
 */
export async function loadConfig(options: ConfigLoadOptions = {}): Promise<FrameworkConfig> {
	const { configPath, skipEnvSubstitution = false, skipValidation = false } = options

	// Start with default configuration
	let config = getDefaultConfig()

	// Determine workspace path
	const workspacePath = getCwd()

	// Load project-level configuration
	const projectConfigPath = configPath || (await findConfigFile(workspacePath))

	if (projectConfigPath) {
		const projectConfig = await loadConfigFile(projectConfigPath)
		config = deepMerge(config, projectConfig)
	}

	// Apply environment variable substitution
	if (!skipEnvSubstitution) {
		config = substituteEnvVarsDeep(config)
	}

	// Validate configuration
	if (!skipValidation) {
		validateConfigStructure(config)
		await validateAgainstSchema(config, workspacePath)
	}

	return config
}

/**
 * Loads configuration from a specific path.
 * This is a convenience function for loading configuration without hierarchy.
 *
 * @param configPath - Path to the configuration file
 * @param options - Configuration loading options
 * @returns The loaded and validated FrameworkConfig
 * @throws FrameworkConfigError if loading or validation fails
 */
export async function loadConfigFromPath(
	configPath: string,
	options: Omit<ConfigLoadOptions, "configPath"> = {},
): Promise<FrameworkConfig> {
	const { skipEnvSubstitution = false, skipValidation = false } = options

	// Start with default configuration
	let config = getDefaultConfig()

	// Load specified configuration file
	const fileConfig = await loadConfigFile(configPath)
	config = deepMerge(config, fileConfig)

	// Apply environment variable substitution
	if (!skipEnvSubstitution) {
		config = substituteEnvVarsDeep(config)
	}

	// Validate configuration
	if (!skipValidation) {
		validateConfigStructure(config)
	}

	return config
}

/**
 * Saves configuration to a file.
 *
 * @param config - The configuration to save
 * @param filePath - Path to save the configuration to
 * @param format - Output format ('yaml' or 'json')
 * @throws FrameworkConfigError if saving fails
 */
export async function saveConfig(
	config: FrameworkConfig,
	filePath: string,
	format: "yaml" | "json" = "yaml",
): Promise<void> {
	try {
		// Ensure directory exists
		const dir = path.dirname(filePath)
		await fs.mkdir(dir, { recursive: true })

		let content: string
		if (format === "json") {
			content = JSON.stringify(config, null, 2)
		} else {
			content = yaml.stringify(config, { lineWidth: 0 })
		}

		await fs.writeFile(filePath, content, "utf-8")
	} catch (error) {
		throw new FrameworkConfigError(
			`Failed to save configuration to ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
			error instanceof Error ? error : undefined,
		)
	}
}
