// kilocode_change - new file

/**
 * Bootstrap Secret Validation
 *
 * This module provides functions to validate API keys and secrets
 * required for the Kilo Framework, including KILO_API_KEY and
 * provider API keys (OpenAI, Anthropic, etc.).
 */

import type {
	SecretConfig,
	SecretStatus,
	SecretValidationResult,
} from "../types"

// =============================================================================
// DEFAULT SECRET CONFIGURATIONS
// =============================================================================

/**
 * Default required secrets for Kilo Framework
 */
export const DEFAULT_REQUIRED_SECRETS: SecretConfig[] = [
	{
		envVar: "KILO_API_KEY",
		name: "Kilo API Key",
		required: false,
		description: "API key for Kilo Code services",
		documentationUrl: "https://kilo.ai/docs/api-keys",
	},
]

/**
 * Provider API key configurations
 */
export const PROVIDER_SECRETS: SecretConfig[] = [
	{
		envVar: "OPENAI_API_KEY",
		name: "OpenAI API Key",
		required: false,
		validationPattern: /^sk-[a-zA-Z0-9]{20,}$/,
		description: "API key for OpenAI models (GPT-4, etc.)",
		documentationUrl: "https://platform.openai.com/api-keys",
	},
	{
		envVar: "ANTHROPIC_API_KEY",
		name: "Anthropic API Key",
		required: false,
		validationPattern: /^sk-ant-[a-zA-Z0-9-]{20,}$/,
		description: "API key for Anthropic models (Claude, etc.)",
		documentationUrl: "https://console.anthropic.com/settings/keys",
	},
	{
		envVar: "GOOGLE_API_KEY",
		name: "Google API Key",
		required: false,
		validationPattern: /^AIza[a-zA-Z0-9_-]{35}$/,
		description: "API key for Google AI models (Gemini, etc.)",
		documentationUrl: "https://aistudio.google.com/app/apikey",
	},
	{
		envVar: "GROQ_API_KEY",
		name: "Groq API Key",
		required: false,
		validationPattern: /^gsk_[a-zA-Z0-9]{20,}$/,
		description: "API key for Groq models",
		documentationUrl: "https://console.groq.com/keys",
	},
	{
		envVar: "OPENROUTER_API_KEY",
		name: "OpenRouter API Key",
		required: false,
		validationPattern: /^sk-or-[a-zA-Z0-9]{20,}$/,
		description: "API key for OpenRouter model gateway",
		documentationUrl: "https://openrouter.ai/keys",
	},
	{
		envVar: "MISTRAL_API_KEY",
		name: "Mistral API Key",
		required: false,
		validationPattern: /^[a-zA-Z0-9]{20,}$/,
		description: "API key for Mistral models",
		documentationUrl: "https://console.mistral.ai/api-keys",
	},
	{
		envVar: "DEEPSEEK_API_KEY",
		name: "DeepSeek API Key",
		required: false,
		validationPattern: /^sk-[a-zA-Z0-9]{20,}$/,
		description: "API key for DeepSeek models",
		documentationUrl: "https://platform.deepseek.com/api_keys",
	},
	{
		envVar: "AZURE_OPENAI_API_KEY",
		name: "Azure OpenAI API Key",
		required: false,
		description: "API key for Azure OpenAI services",
		documentationUrl: "https://portal.azure.com/",
	},
	{
		envVar: "AWS_ACCESS_KEY_ID",
		name: "AWS Access Key ID",
		required: false,
		validationPattern: /^AKIA[A-Z0-9]{16}$/,
		description: "AWS access key for Bedrock models",
		documentationUrl: "https://aws.amazon.com/console/",
	},
	{
		envVar: "LANGFUSE_PUBLIC_KEY",
		name: "Langfuse Public Key",
		required: false,
		description: "Public key for Langfuse observability",
		documentationUrl: "https://cloud.langfuse.com/",
	},
	{
		envVar: "LANGFUSE_SECRET_KEY",
		name: "Langfuse Secret Key",
		required: false,
		description: "Secret key for Langfuse observability",
		documentationUrl: "https://cloud.langfuse.com/",
	},
]

/**
 * All known secrets
 */
export const ALL_KNOWN_SECRETS = [
	...DEFAULT_REQUIRED_SECRETS,
	...PROVIDER_SECRETS,
]

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get environment variables safely
 */
function getEnv(): Record<string, string | undefined> {
	const proc = (globalThis as unknown as { 
		process?: { 
			env?: Record<string, string | undefined>
		} 
	}).process

	return proc?.env ?? {}
}

/**
 * Check if a value is a placeholder
 */
function isPlaceholder(value: string): boolean {
	const placeholderPatterns = [
		/^\$\{.*\}$/, // ${VAR_NAME}
		/^<.*>$/, // <placeholder>
		/^your[_-].*_key$/i, // your_api_key, your-api-key
		/^xxx+$/i, // xxx
		/^placeholder$/i,
		/^changeme$/i,
		/^todo$/i,
	]

	return placeholderPatterns.some((pattern) => pattern.test(value.trim()))
}

/**
 * Validate a secret value against its pattern
 */
function validateSecretValue(value: string, pattern?: RegExp): { valid: boolean; reason?: string } {
	if (!value || value.trim() === "") {
		return { valid: false, reason: "Empty value" }
	}

	if (isPlaceholder(value)) {
		return { valid: false, reason: "Placeholder value" }
	}

	if (pattern && !pattern.test(value)) {
		return { valid: false, reason: "Invalid format" }
	}

	return { valid: true }
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate a single secret
 */
export function validateSecret(secret: SecretConfig): SecretValidationResult {
	const env = getEnv()
	const value = env[secret.envVar]

	// Check if secret exists
	if (!value) {
		return {
			secret,
			status: "missing",
			message: `${secret.name} is not set`,
			isPlaceholder: false,
		}
	}

	// Check if it's a placeholder
	if (isPlaceholder(value)) {
		return {
			secret,
			status: "placeholder",
			message: `${secret.name} has a placeholder value`,
			isPlaceholder: true,
		}
	}

	// Validate format if pattern exists
	if (secret.validationPattern) {
		const validation = validateSecretValue(value, secret.validationPattern)
		if (!validation.valid) {
			return {
				secret,
				status: "invalid",
				message: `${secret.name}: ${validation.reason}`,
				isPlaceholder: false,
			}
		}
	}

	return {
		secret,
		status: "valid",
		message: `${secret.name} is set`,
		isPlaceholder: false,
	}
}

/**
 * Validate multiple secrets
 */
export function validateSecrets(
	secrets: SecretConfig[]
): SecretValidationResult[] {
	return secrets.map(validateSecret)
}

/**
 * Validate all known secrets
 */
export function validateAllSecrets(): SecretValidationResult[] {
	return validateSecrets(ALL_KNOWN_SECRETS)
}

/**
 * Validate only required secrets
 */
export function validateRequiredSecrets(): SecretValidationResult[] {
	const requiredSecrets = ALL_KNOWN_SECRETS.filter((s) => s.required)
	return validateSecrets(requiredSecrets)
}

/**
 * Check if all required secrets are valid
 */
export function allRequiredSecretsValid(results: SecretValidationResult[]): boolean {
	return results
		.filter((r) => r.secret.required)
		.every((r) => r.status === "valid")
}

/**
 * Get summary of secret validation results
 */
export function getSecretValidationSummary(results: SecretValidationResult[]): {
	valid: number
	missing: number
	invalid: number
	placeholder: number
	total: number
	allRequiredValid: boolean
} {
	let valid = 0
	let missing = 0
	let invalid = 0
	let placeholder = 0

	for (const result of results) {
		switch (result.status) {
			case "valid":
				valid++
				break
			case "missing":
				missing++
				break
			case "invalid":
				invalid++
				break
			case "placeholder":
				placeholder++
				break
		}
	}

	return {
		valid,
		missing,
		invalid,
		placeholder,
		total: results.length,
		allRequiredValid: allRequiredSecretsValid(results),
	}
}

/**
 * Get list of missing required secrets
 */
export function getMissingRequiredSecrets(results: SecretValidationResult[]): SecretConfig[] {
	return results
		.filter((r) => r.secret.required && r.status !== "valid")
		.map((r) => r.secret)
}

/**
 * Generate a report of secret status
 */
export function generateSecretReport(results: SecretValidationResult[]): string {
	const lines: string[] = [
		"# Secret Validation Report",
		"",
		"## Summary",
		"",
	]

	const summary = getSecretValidationSummary(results)
	lines.push(`- Valid: ${summary.valid}`)
	lines.push(`- Missing: ${summary.missing}`)
	lines.push(`- Invalid: ${summary.invalid}`)
	lines.push(`- Placeholder: ${summary.placeholder}`)
	lines.push("")

	// Group by status
	const byStatus: Record<SecretStatus, SecretValidationResult[]> = {
		valid: [],
		missing: [],
		invalid: [],
		placeholder: [],
	}

	for (const result of results) {
		byStatus[result.status].push(result)
	}

	// Report each category
	if (byStatus.missing.length > 0) {
		lines.push("## Missing Secrets")
		lines.push("")
		for (const result of byStatus.missing) {
			lines.push(`- **${result.secret.name}** (\`${result.secret.envVar}\`)`)
			if (result.secret.description) {
				lines.push(`  - ${result.secret.description}`)
			}
			if (result.secret.documentationUrl) {
				lines.push(`  - Documentation: ${result.secret.documentationUrl}`)
			}
		}
		lines.push("")
	}

	if (byStatus.invalid.length > 0) {
		lines.push("## Invalid Secrets")
		lines.push("")
		for (const result of byStatus.invalid) {
			lines.push(`- **${result.secret.name}** (\`${result.secret.envVar}\`): ${result.message}`)
		}
		lines.push("")
	}

	if (byStatus.placeholder.length > 0) {
		lines.push("## Placeholder Secrets")
		lines.push("")
		for (const result of byStatus.placeholder) {
			lines.push(`- **${result.secret.name}** (\`${result.secret.envVar}\`)`)
		}
		lines.push("")
	}

	return lines.join("\n")
}
