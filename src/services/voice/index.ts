// kilocode_change - new file: Voice/PersonaPlex integration public exports

// Type definitions
export * from "./types"

// Voice integration
export { VoiceIntegration, getVoiceIntegration, resetVoiceIntegration } from "./integration"

// Persona management
export {
	PersonaManager,
	getPersonaManager,
	resetPersonaManager,
	DEFAULT_PERSONA,
	type PersonaDefinition,
} from "./persona-config"

// Command routing
export {
	VoiceCommandRouter,
	getVoiceCommandRouter,
	resetVoiceCommandRouter,
} from "./command-routing"
