// kilocode_change - new file: Voice/PersonaPlex integration type definitions

/**
 * Voice configuration for text-to-speech and speech recognition
 */
export interface VoiceConfig {
	/** Unique identifier for the voice configuration */
	id: string

	/** Display name for the voice */
	name: string

	/** Language code (e.g., 'en-US', 'es-ES') */
	language: string

	/** Voice provider (e.g., 'openai', 'elevenlabs', 'azure') */
	provider: string

	/** Voice identifier from the provider */
	voiceId: string

	/** Speech rate (0.5 to 2.0, default 1.0) */
	rate?: number

	/** Pitch adjustment (-20 to 20, default 0) */
	pitch?: number

	/** Volume level (0 to 100, default 100) */
	volume?: number

	/** Custom provider-specific settings */
	providerSettings?: Record<string, unknown>
}

/**
 * Persona configuration for PersonaPlex integration
 */
export interface PersonaConfig {
	/** Unique identifier for the persona */
	id: string

	/** Display name for the persona */
	name: string

	/** Optional description of the persona's characteristics */
	description?: string

	/** System prompt/instructions for the persona */
	systemPrompt?: string

	/** Voice configuration for this persona */
	voice?: VoiceConfig

	/** Avatar/icon URL for the persona */
	avatarUrl?: string

	/** Personality traits (provider-specific) */
	traits?: Record<string, unknown>

	/** Whether this persona is active */
	isActive?: boolean

	/** Creation timestamp */
	createdAt?: string

	/** Last modified timestamp */
	updatedAt?: string
}

/**
 * Voice command structure
 */
export interface VoiceCommand {
	/** Unique identifier for the command instance */
	id: string

	/** The transcribed text from voice input */
	text: string

	/** Confidence score (0 to 1) */
	confidence: number

	/** Language detected or used */
	language: string

	/** Timestamp when the command was received */
	timestamp: number

	/** Optional intent classification */
	intent?: VoiceCommandIntent

	/** Optional entities extracted from the command */
	entities?: VoiceCommandEntity[]

	/** Raw audio data (if available) */
	audioData?: ArrayBuffer

	/** Duration of the voice input in milliseconds */
	duration?: number
}

/**
 * Intent classification for voice commands
 */
export interface VoiceCommandIntent {
	/** The classified intent name */
	name: string

	/** Confidence score for the intent classification (0 to 1) */
	confidence: number

	/** Optional sub-intent or action */
	action?: string
}

/**
 * Entity extracted from voice command
 */
export interface VoiceCommandEntity {
	/** Entity type (e.g., 'file', 'command', 'parameter') */
	type: string

	/** The extracted value */
	value: string

	/** Start position in the original text */
	startIndex: number

	/** End position in the original text */
	endIndex: number

	/** Confidence score for the extraction (0 to 1) */
	confidence: number
}

/**
 * Voice event types
 */
export type VoiceEventType =
	| "listening_started"
	| "listening_stopped"
	| "speech_detected"
	| "speech_recognized"
	| "command_processed"
	| "tts_started"
	| "tts_completed"
	| "tts_error"
	| "error"

/**
 * Voice event structure
 */
export interface VoiceEvent {
	/** Event type */
	type: VoiceEventType

	/** Timestamp when the event occurred */
	timestamp: number

	/** Event-specific data */
	data?: unknown

	/** Optional error information */
	error?: {
		message: string
		code?: string
		details?: unknown
	}
}

/**
 * Options for speech synthesis
 */
export interface SpeechSynthesisOptions {
	/** Voice configuration to use (overrides default) */
	voice?: VoiceConfig | string

	/** Speech rate (0.5 to 2.0) */
	rate?: number

	/** Pitch adjustment (-20 to 20) */
	pitch?: number

	/** Volume level (0 to 100) */
	volume?: number

	/** Whether to wait for completion before returning */
	waitForCompletion?: boolean

	/** Callback for synthesis progress */
	onProgress?: (progress: number) => void

	/** Callback when synthesis starts */
	onStart?: () => void

	/** Callback when synthesis completes */
	onComplete?: () => void

	/** Callback for errors */
	onError?: (error: Error) => void
}

/**
 * Voice integration status
 */
export interface VoiceIntegrationStatus {
	/** Whether voice integration is initialized */
	isInitialized: boolean

	/** Whether currently listening for voice input */
	isListening: boolean

	/** Whether currently speaking */
	isSpeaking: boolean

	/** Current active persona (if any) */
	activePersonaId?: string

	/** Available voices */
	availableVoices: VoiceConfig[]

	/** Available personas */
	availablePersonas: PersonaConfig[]

	/** Last error (if any) */
	lastError?: {
		message: string
		code?: string
		timestamp: number
	}
}

/**
 * Command handler function type
 */
export type VoiceCommandHandler = (command: VoiceCommand) => Promise<VoiceCommandResult> | VoiceCommandResult

/**
 * Result of processing a voice command
 */
export interface VoiceCommandResult {
	/** Whether the command was handled successfully */
	success: boolean

	/** Response message (for TTS feedback) */
	message?: string

	/** Action to take (if any) */
	action?: {
		type: string
		payload?: unknown
	}

	/** Whether to speak the response */
	speakResponse?: boolean

	/** Error information (if failed) */
	error?: {
		message: string
		code?: string
	}
}

/**
 * Route pattern for command routing
 */
export interface VoiceRoutePattern {
	/** Regex pattern or string to match */
	pattern: string | RegExp

	/** Whether the pattern is a regex */
	isRegex: boolean

	/** Case-sensitive matching */
	caseSensitive?: boolean

	/** Handler for matched commands */
	handler: VoiceCommandHandler

	/** Optional description of the route */
	description?: string

	/** Priority for route matching (higher = first) */
	priority?: number
}

/**
 * SDLC operation types for built-in commands
 */
export type SDLCOperation =
	| "create_file"
	| "read_file"
	| "edit_file"
	| "delete_file"
	| "run_command"
	| "search"
	| "git_commit"
	| "git_push"
	| "git_pull"
	| "open_file"
	| "navigate"
	| "explain"
	| "refactor"
	| "test"
	| "debug"

/**
 * Built-in voice command definition
 */
export interface BuiltInVoiceCommand {
	/** Command identifier */
	id: string

	/** Command patterns to match */
	patterns: string[]

	/** Description of what the command does */
	description: string

	/** SDLC operation this command maps to */
	operation: SDLCOperation

	/** Example phrases */
	examples: string[]

	/** Whether the command is enabled */
	enabled: boolean
}

/**
 * Voice integration configuration
 */
export interface VoiceIntegrationConfig {
	/** Enable voice input */
	enableVoiceInput?: boolean

	/** Enable text-to-speech output */
	enableTTS?: boolean

	/** Default voice configuration */
	defaultVoice?: VoiceConfig

	/** Default persona ID */
	defaultPersonaId?: string

	/** Language for voice recognition */
	recognitionLanguage?: string

	/** Wake word configuration */
	wakeWord?: {
		enabled: boolean
		word: string
		sensitivity: number
	}

	/** Silence detection configuration */
	silenceDetection?: {
		enabled: boolean
		timeoutMs: number
		threshold: number
	}

	/** Command routing configuration */
	commandRouting?: {
		/** Enable built-in SDLC commands */
		enableBuiltInCommands: boolean
		/** Custom command routes */
		customRoutes: VoiceRoutePattern[]
	}

	/** TTS configuration */
	tts?: {
		/** Auto-speak responses */
		autoSpeak: boolean
		/** Queue mode for multiple messages */
		queueMode: "sequential" | "interrupt" | "parallel"
	}
}
