// kilocode_change - new file: PersonaPlex configuration management

import type { PersonaConfig, VoiceConfig } from "./types"

/**
 * Persona definition schema for validation
 */
export interface PersonaDefinition {
	/** Schema version */
	schemaVersion: string

	/** Persona configuration */
	persona: PersonaConfig

	/** Metadata about the persona definition */
	metadata?: {
		author?: string
		version?: string
		tags?: string[]
		source?: string
	}
}

/**
 * Default persona configuration
 */
export const DEFAULT_PERSONA: PersonaConfig = {
	id: "default",
	name: "Default Assistant",
	description: "The default Kilo Code assistant persona",
	systemPrompt: "You are a helpful coding assistant.",
	isActive: true,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
}

/**
 * PersonaManager - Manages persona configurations for PersonaPlex integration
 *
 * This is a scaffolding class with placeholder implementations for future
 * persona management integration.
 *
 * @example
 * ```typescript
 * const manager = new PersonaManager()
 * await manager.loadPersona('./personas/assistant.json')
 * const persona = manager.getActivePersona()
 * ```
 */
export class PersonaManager {
	private personas: Map<string, PersonaConfig> = new Map()
	private activePersonaId: string | undefined
	private configPath: string | undefined

	/**
	 * Load persona configuration from a file path
	 *
	 * @param configPath - Path to the persona configuration file
	 * @returns The loaded persona configuration
	 *
	 * @example
	 * ```typescript
	 * const persona = await manager.loadPersona('./personas/expert.json')
	 * console.log('Loaded persona:', persona.name)
	 * ```
	 */
	async loadPersona(configPath: string): Promise<PersonaConfig> {
		// TODO: Implement actual file loading
		// TODO: Validate persona schema
		// TODO: Handle file not found errors
		// TODO: Support JSON and YAML formats

		this.configPath = configPath

		// Placeholder: Return default persona
		// In actual implementation, this would load from the file
		const persona: PersonaConfig = {
			...DEFAULT_PERSONA,
			id: `persona-${Date.now()}`,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		this.personas.set(persona.id, persona)

		if (!this.activePersonaId) {
			this.activePersonaId = persona.id
		}

		return persona
	}

	/**
	 * Load multiple personas from a directory
	 *
	 * @param directoryPath - Path to directory containing persona files
	 * @returns Array of loaded persona configurations
	 */
	async loadPersonasFromDirectory(directoryPath: string): Promise<PersonaConfig[]> {
		// TODO: Scan directory for persona files
		// TODO: Load each valid persona file
		// TODO: Handle invalid files gracefully

		console.log(`[PersonaManager] Loading personas from: ${directoryPath}`)

		return []
	}

	/**
	 * Get the currently active persona
	 *
	 * @returns The active persona configuration, or undefined if none
	 */
	getActivePersona(): PersonaConfig | undefined {
		if (!this.activePersonaId) {
			return undefined
		}

		return this.personas.get(this.activePersonaId)
	}

	/**
	 * Set the active persona by ID
	 *
	 * @param personaId - The ID of the persona to activate
	 * @throws Error if persona ID is not found
	 *
	 * @example
	 * ```typescript
	 * manager.setPersona('expert-coder')
	 * ```
	 */
	setPersona(personaId: string): void {
		if (!this.personas.has(personaId)) {
			throw new Error(`Persona not found: ${personaId}`)
		}

		// Deactivate current persona
		const currentPersona = this.getActivePersona()
		if (currentPersona) {
			currentPersona.isActive = false
		}

		// Activate new persona
		const newPersona = this.personas.get(personaId)!
		newPersona.isActive = true
		this.activePersonaId = personaId
	}

	/**
	 * Get voice settings for a specific persona
	 *
	 * @param personaId - The ID of the persona (defaults to active persona)
	 * @returns Voice configuration for the persona, or undefined
	 *
	 * @example
	 * ```typescript
	 * const voice = manager.getPersonaVoice('expert-coder')
	 * if (voice) {
	 *   await tts.speak(text, { voice })
	 * }
	 * ```
	 */
	getPersonaVoice(personaId?: string): VoiceConfig | undefined {
		const id = personaId ?? this.activePersonaId
		if (!id) {
			return undefined
		}

		const persona = this.personas.get(id)
		return persona?.voice
	}

	/**
	 * Get a persona by ID
	 *
	 * @param personaId - The ID of the persona
	 * @returns The persona configuration, or undefined if not found
	 */
	getPersona(personaId: string): PersonaConfig | undefined {
		return this.personas.get(personaId)
	}

	/**
	 * Get all loaded personas
	 *
	 * @returns Array of all persona configurations
	 */
	getAllPersonas(): PersonaConfig[] {
		return Array.from(this.personas.values())
	}

	/**
	 * Create a new persona
	 *
	 * @param config - Persona configuration (without id, createdAt, updatedAt)
	 * @returns The created persona with generated ID
	 */
	createPersona(config: Omit<PersonaConfig, "id" | "createdAt" | "updatedAt">): PersonaConfig {
		const persona: PersonaConfig = {
			...config,
			id: `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		this.personas.set(persona.id, persona)
		return persona
	}

	/**
	 * Update an existing persona
	 *
	 * @param personaId - The ID of the persona to update
	 * @param updates - Partial persona configuration to merge
	 * @returns The updated persona
	 * @throws Error if persona not found
	 */
	updatePersona(personaId: string, updates: Partial<PersonaConfig>): PersonaConfig {
		const existing = this.personas.get(personaId)
		if (!existing) {
			throw new Error(`Persona not found: ${personaId}`)
		}

		const updated: PersonaConfig = {
			...existing,
			...updates,
			id: existing.id, // Preserve ID
			updatedAt: new Date().toISOString(),
		}

		this.personas.set(personaId, updated)
		return updated
	}

	/**
	 * Delete a persona
	 *
	 * @param personaId - The ID of the persona to delete
	 * @throws Error if persona is currently active
	 */
	deletePersona(personaId: string): void {
		if (this.activePersonaId === personaId) {
			throw new Error("Cannot delete the active persona")
		}

		this.personas.delete(personaId)
	}

	/**
	 * Save persona configuration to file
	 *
	 * @param personaId - The ID of the persona to save
	 * @param filePath - Optional file path (defaults to original load path)
	 */
	async savePersona(personaId: string, filePath?: string): Promise<void> {
		const persona = this.personas.get(personaId)
		if (!persona) {
			throw new Error(`Persona not found: ${personaId}`)
		}

		// TODO: Implement actual file saving
		// TODO: Support JSON and YAML formats
		// TODO: Validate write permissions

		const path = filePath ?? this.configPath
		if (!path) {
			throw new Error("No file path specified for saving")
		}

		console.log(`[PersonaManager] Saving persona ${personaId} to ${path}`)
	}

	/**
	 * Export persona to a portable format
	 *
	 * @param personaId - The ID of the persona to export
	 * @returns Persona definition object
	 */
	exportPersona(personaId: string): PersonaDefinition {
		const persona = this.personas.get(personaId)
		if (!persona) {
			throw new Error(`Persona not found: ${personaId}`)
		}

		return {
			schemaVersion: "1.0.0",
			persona: { ...persona },
			metadata: {
				version: "1.0.0",
				source: "kilo-code",
			},
		}
	}

	/**
	 * Import a persona from a definition object
	 *
	 * @param definition - Persona definition to import
	 * @returns The imported persona configuration
	 */
	importPersona(definition: PersonaDefinition): PersonaConfig {
		// TODO: Validate schema version
		// TODO: Validate persona structure

		const persona: PersonaConfig = {
			...definition.persona,
			id: definition.persona.id || `imported-${Date.now()}`,
			createdAt: definition.persona.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		this.personas.set(persona.id, persona)
		return persona
	}

	/**
	 * Validate a persona configuration
	 *
	 * @param persona - Persona configuration to validate
	 * @returns Validation result with any errors
	 */
	validatePersona(persona: unknown): { valid: boolean; errors: string[] } {
		const errors: string[] = []

		if (!persona || typeof persona !== "object") {
			return { valid: false, errors: ["Persona must be an object"] }
		}

		const config = persona as Partial<PersonaConfig>

		if (!config.name || typeof config.name !== "string") {
			errors.push("Persona must have a valid 'name' string")
		}

		if (config.voice) {
			if (!config.voice.provider || typeof config.voice.provider !== "string") {
				errors.push("Voice must have a valid 'provider' string")
			}
			if (!config.voice.voiceId || typeof config.voice.voiceId !== "string") {
				errors.push("Voice must have a valid 'voiceId' string")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this.personas.clear()
		this.activePersonaId = undefined
		this.configPath = undefined
	}
}

// Singleton instance for convenience
let defaultInstance: PersonaManager | null = null

/**
 * Get the default PersonaManager instance
 */
export function getPersonaManager(): PersonaManager {
	if (!defaultInstance) {
		defaultInstance = new PersonaManager()
	}
	return defaultInstance
}

/**
 * Reset the default instance (useful for testing)
 */
export function resetPersonaManager(): void {
	if (defaultInstance) {
		defaultInstance.dispose()
		defaultInstance = null
	}
}
