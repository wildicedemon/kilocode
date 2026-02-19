// kilocode_change - new file

/**
 * Deep Scanner Service - Pattern Matcher
 *
 * This module provides pattern matching utilities for the deep scanner,
 * including regex patterns, AST patterns, and pattern loading from repertoire.
 */

import * as fs from "fs/promises"
import * as path from "path"
import type {
	PatternDefinition,
	PatternRepertoire,
	Finding,
	FindingSeverity,
	ScanPass,
	FileInfo,
	PatternMatcherError,
} from "./types"
import { PatternMatcherError as PatternMatcherErrorClass } from "./types"

// =============================================================================
// PATTERN CACHE
// =============================================================================

/**
 * Cache for compiled regex patterns
 */
interface PatternCache {
	regex: Map<string, RegExp>
	patterns: Map<string, PatternDefinition>
	repertoire: PatternRepertoire | null
	lastLoaded: number
}

/**
 * Global pattern cache
 */
const patternCache: PatternCache = {
	regex: new Map(),
	patterns: new Map(),
	repertoire: null,
	lastLoaded: 0,
}

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000

// =============================================================================
// DEFAULT PATTERNS
// =============================================================================

/**
 * Default patterns for anti-patterns pass
 */
const DEFAULT_ANTI_PATTERNS: PatternDefinition[] = [
	{
		id: "any-type-usage",
		name: "Any Type Usage",
		description: "Usage of 'any' type reduces type safety",
		pass: "anti-patterns",
		severity: "medium",
		matchType: "regex",
		pattern: ":\\s*any\\b",
		filePatterns: ["**/*.ts", "**/*.tsx"],
		suggestion: "Replace 'any' with a specific type or 'unknown'",
		enabled: true,
	},
	{
		id: "console-log",
		name: "Console Log Statement",
		description: "Console log statements should be removed in production",
		pass: "anti-patterns",
		severity: "low",
		matchType: "regex",
		pattern: "console\\.(log|debug|info|warn|error)\\s*\\(",
		filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		suggestion: "Remove console statement or use a proper logging library",
		enabled: true,
	},
	{
		id: "empty-catch",
		name: "Empty Catch Block",
		description: "Empty catch blocks silently swallow errors",
		pass: "anti-patterns",
		severity: "high",
		matchType: "regex",
		pattern: "catch\\s*\\([^)]*\\)\\s*\\{\\s*\\}",
		filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		suggestion: "Handle the error or at least log it",
		enabled: true,
	},
	{
		id: "todo-without-issue",
		name: "TODO Without Issue Reference",
		description: "TODO comments should reference an issue tracker",
		pass: "anti-patterns",
		severity: "low",
		matchType: "regex",
		pattern: "//\\s*TODO(?![^(]*\\))",
		filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		suggestion: "Add issue reference: TODO(#issue-number) or TODO(@owner)",
		enabled: true,
	},
]

/**
 * Default patterns for architecture pass
 */
const DEFAULT_ARCHITECTURE_PATTERNS: PatternDefinition[] = [
	{
		id: "circular-dependency-risk",
		name: "Potential Circular Dependency",
		description: "Import from relative parent path may indicate circular dependency",
		pass: "architecture",
		severity: "medium",
		matchType: "regex",
		pattern: "from\\s+['\"]\\.\\./\\.\\./\\.\\./\\.\\./",
		filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		suggestion: "Consider restructuring to avoid deep relative imports",
		enabled: true,
	},
	{
		id: "large-file",
		name: "Large File",
		description: "Files over 500 lines may be hard to maintain",
		pass: "architecture",
		severity: "info",
		matchType: "semantic",
		suggestion: "Consider splitting into smaller modules",
		enabled: true,
	},
]

/**
 * Default patterns for performance pass
 */
const DEFAULT_PERFORMANCE_PATTERNS: PatternDefinition[] = [
	{
		id: "sync-recursive",
		name: "Synchronous Recursive Call",
		description: "Recursive calls without async can cause stack overflow",
		pass: "performance",
		severity: "medium",
		matchType: "regex",
		pattern: "function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*\\1\\s*\\(",
		filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		suggestion: "Consider using iteration or making recursive calls async",
		enabled: true,
	},
	{
		id: "nested-loop-o2",
		name: "Nested Loop (O(n²))",
		description: "Nested loops can cause performance issues with large datasets",
		pass: "performance",
		severity: "low",
		matchType: "semantic",
		suggestion: "Consider using a Map or Set for O(1) lookups",
		enabled: true,
	},
]

/**
 * Default patterns for security pass
 */
const DEFAULT_SECURITY_PATTERNS: PatternDefinition[] = [
	{
		id: "hardcoded-secret",
		name: "Potential Hardcoded Secret",
		description: "Hardcoded secrets should be moved to environment variables",
		pass: "security",
		severity: "critical",
		matchType: "regex",
		pattern: "(password|secret|api_key|apikey|token|auth)\\s*[=:]\\s*['\"][^'\"]+['\"]",
		filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		suggestion: "Move secrets to environment variables or a secrets manager",
		enabled: true,
	},
	{
		id: "sql-injection-risk",
		name: "SQL Injection Risk",
		description: "String concatenation in SQL queries can lead to injection",
		pass: "security",
		severity: "critical",
		matchType: "regex",
		pattern: "(query|execute|sql)\\s*\\(\\s*[`'\"]+.*\\+",
		filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		suggestion: "Use parameterized queries instead of string concatenation",
		enabled: true,
	},
	{
		id: "eval-usage",
		name: "Eval Usage",
		description: "eval() can execute arbitrary code and is a security risk",
		pass: "security",
		severity: "critical",
		matchType: "regex",
		pattern: "\\beval\\s*\\(",
		filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		suggestion: "Avoid eval() - use safer alternatives like JSON.parse for JSON",
		enabled: true,
	},
	{
		id: "innerhtml-usage",
		name: "innerHTML Usage",
		description: "innerHTML can lead to XSS vulnerabilities",
		pass: "security",
		severity: "high",
		matchType: "regex",
		pattern: "\\.innerHTML\\s*=",
		filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		suggestion: "Use textContent or DOM APIs instead, or sanitize HTML",
		enabled: true,
	},
]

/**
 * All default patterns organized by pass
 */
const DEFAULT_PATTERNS: Record<ScanPass, PatternDefinition[]> = {
	"anti-patterns": DEFAULT_ANTI_PATTERNS,
	architecture: DEFAULT_ARCHITECTURE_PATTERNS,
	performance: DEFAULT_PERFORMANCE_PATTERNS,
	security: DEFAULT_SECURITY_PATTERNS,
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets the current working directory safely
 */
function getCwd(): string {
	const proc = (globalThis as unknown as { process?: { cwd?: () => string } }).process
	return proc?.cwd?.() ?? "."
}

/**
 * Type guard for ENOENT errors
 */
function isEnoentError(error: unknown): boolean {
	return (
		error !== null &&
		typeof error === "object" &&
		"code" in error &&
		(error as { code: string }).code === "ENOENT"
	)
}

/**
 * Checks if a file matches a glob pattern (simplified implementation)
 */
function matchesGlobPattern(filePath: string, pattern: string): boolean {
	// Convert glob pattern to regex (simplified)
	const regexPattern = pattern
		.replace(/\*\*/g, "<<<DOUBLE_STAR>>>")
		.replace(/\*/g, "[^/]*")
		.replace(/<<<DOUBLE_STAR>>>/g, ".*")
		.replace(/\?/g, "[^/]")
		.replace(/\./g, "\\.")

	const regex = new RegExp(`^${regexPattern}$`)
	return regex.test(filePath)
}

/**
 * Checks if a file matches any of the given patterns
 */
function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
	return patterns.some((pattern) => matchesGlobPattern(filePath, pattern))
}

/**
 * Generates a unique finding ID
 */
function generateFindingId(): string {
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 8)
	return `finding-${timestamp}-${random}`
}

// =============================================================================
// PATTERN MATCHER CLASS
// =============================================================================

/**
 * Pattern Matcher
 *
 * Loads and matches patterns against file contents.
 * Supports regex, AST, and semantic pattern matching.
 */
export class PatternMatcher {
	private readonly workspacePath: string
	private readonly repertoirePath: string
	private readonly cacheEnabled: boolean

	/**
	 * Creates a new PatternMatcher instance
	 *
	 * @param options - Configuration options
	 */
	constructor(options?: {
		/** Workspace root path */
		workspacePath?: string
		/** Path to pattern repertoire file */
		repertoirePath?: string
		/** Enable pattern caching */
		cacheEnabled?: boolean
	}) {
		this.workspacePath = options?.workspacePath ?? getCwd()
		this.repertoirePath =
			options?.repertoirePath ?? path.join(this.workspacePath, ".framework/scanner-repertoire.md")
		this.cacheEnabled = options?.cacheEnabled ?? true
	}

	/**
	 * Loads patterns from the repertoire file.
	 * Falls back to default patterns if no repertoire exists.
	 *
	 * @returns The loaded pattern repertoire
	 */
	async loadRepertoire(): Promise<PatternRepertoire> {
		// Check cache
		if (this.cacheEnabled && patternCache.repertoire && Date.now() - patternCache.lastLoaded < CACHE_TTL) {
			return patternCache.repertoire
		}

		try {
			const content = await fs.readFile(this.repertoirePath, "utf-8")
			const repertoire = this.parseRepertoire(content)

			// Update cache
			if (this.cacheEnabled) {
				patternCache.repertoire = repertoire
				patternCache.lastLoaded = Date.now()

				// Update pattern cache
				for (const pattern of repertoire.patterns) {
					patternCache.patterns.set(pattern.id, pattern)
				}
			}

			return repertoire
		} catch (error) {
			if (isEnoentError(error)) {
				// Return default patterns if no repertoire file
				return this.getDefaultRepertoire()
			}
			throw new PatternMatcherErrorClass(
				`Failed to load repertoire: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : undefined,
			)
		}
	}

	/**
	 * Gets patterns for a specific scan pass
	 *
	 * @param pass - The scan pass
	 * @returns Array of patterns for the pass
	 */
	async getPatternsForPass(pass: ScanPass): Promise<PatternDefinition[]> {
		const repertoire = await this.loadRepertoire()
		return repertoire.patterns.filter((p) => p.pass === pass && p.enabled)
	}

	/**
	 * Gets a specific pattern by ID
	 *
	 * @param patternId - The pattern ID
	 * @returns The pattern definition or undefined
	 */
	async getPattern(patternId: string): Promise<PatternDefinition | undefined> {
		// Check cache first
		if (this.cacheEnabled && patternCache.patterns.has(patternId)) {
			return patternCache.patterns.get(patternId)
		}

		const repertoire = await this.loadRepertoire()
		return repertoire.patterns.find((p) => p.id === patternId)
	}

	/**
	 * Matches a file against all patterns for a pass
	 *
	 * @param fileInfo - File information
	 * @param pass - The scan pass
	 * @returns Array of findings
	 */
	async matchFile(fileInfo: FileInfo, pass: ScanPass): Promise<Finding[]> {
		const patterns = await this.getPatternsForPass(pass)
		const findings: Finding[] = []

		for (const pattern of patterns) {
			// Check if pattern applies to this file
			if (pattern.filePatterns && !matchesAnyPattern(fileInfo.path, pattern.filePatterns)) {
				continue
			}

			// Check exclusions
			if (pattern.excludePatterns && matchesAnyPattern(fileInfo.path, pattern.excludePatterns)) {
				continue
			}

			// Match based on pattern type
			const patternFindings = await this.matchPattern(fileInfo, pattern)
			findings.push(...patternFindings)
		}

		return findings
	}

	/**
	 * Matches a file against a specific pattern
	 *
	 * @param fileInfo - File information
	 * @param pattern - The pattern to match
	 * @returns Array of findings
	 */
	async matchPattern(fileInfo: FileInfo, pattern: PatternDefinition): Promise<Finding[]> {
		if (!fileInfo.content) {
			return []
		}

		switch (pattern.matchType) {
			case "regex":
				return this.matchRegexPattern(fileInfo, pattern)
			case "ast":
				return this.matchAstPattern(fileInfo, pattern)
			case "semantic":
				return this.matchSemanticPattern(fileInfo, pattern)
			case "hybrid":
				return this.matchHybridPattern(fileInfo, pattern)
			default:
				return []
		}
	}

	/**
	 * Clears the pattern cache
	 */
	clearCache(): void {
		patternCache.regex.clear()
		patternCache.patterns.clear()
		patternCache.repertoire = null
		patternCache.lastLoaded = 0
	}

	// =============================================================================
	// PRIVATE METHODS
	// =============================================================================

	/**
	 * Matches a regex pattern against file content
	 */
	private async matchRegexPattern(fileInfo: FileInfo, pattern: PatternDefinition): Promise<Finding[]> {
		if (!pattern.pattern || !fileInfo.content) {
			return []
		}

		const findings: Finding[] = []
		let regex: RegExp

		try {
			// Check cache for compiled regex
			if (this.cacheEnabled && patternCache.regex.has(pattern.pattern)) {
				regex = patternCache.regex.get(pattern.pattern)!
			} else {
				regex = new RegExp(pattern.pattern, "gm")
				if (this.cacheEnabled) {
					patternCache.regex.set(pattern.pattern, regex)
				}
			}
		} catch (error) {
			throw new PatternMatcherErrorClass(
				`Invalid regex pattern '${pattern.pattern}': ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : undefined,
				pattern.id,
			)
		}

		// Find all matches
		const lines = fileInfo.content.split("\n")
		let match: RegExpExecArray | null

		while ((match = regex.exec(fileInfo.content)) !== null) {
			// Find line and column
			const beforeMatch = fileInfo.content.substring(0, match.index)
			const line = beforeMatch.split("\n").length
			const lastNewline = beforeMatch.lastIndexOf("\n")
			const column = match.index - lastNewline

			// Get severity
			const severity = this.resolveSeverity(pattern.severity, match[0])

			// Create finding
			const finding: Finding = {
				id: generateFindingId(),
				severity,
				message: `${pattern.name}: ${pattern.description}`,
				file: fileInfo.path,
				line,
				column,
				pass: pattern.pass,
				codeSnippet: this.extractCodeSnippet(lines, line - 1),
				suggestion: pattern.suggestion,
				patternId: pattern.id,
				timestamp: new Date().toISOString(),
			}

			findings.push(finding)
		}

		return findings
	}

	/**
	 * Matches an AST pattern against file content
	 * Note: This is a placeholder for future AST-based matching
	 */
	private async matchAstPattern(fileInfo: FileInfo, pattern: PatternDefinition): Promise<Finding[]> {
		// AST matching would require a parser like @babel/parser or typescript
		// For now, return empty array as this is a placeholder
		console.warn(`AST pattern matching not yet implemented for pattern: ${pattern.id}`)
		return []
	}

	/**
	 * Matches a semantic pattern against file content
	 * Note: This is a placeholder for future semantic matching
	 */
	private async matchSemanticPattern(fileInfo: FileInfo, pattern: PatternDefinition): Promise<Finding[]> {
		// Semantic matching would require integration with code-index or AI
		// For now, handle specific known patterns
		if (pattern.id === "large-file" && fileInfo.content) {
			const lines = fileInfo.content.split("\n").length
			if (lines > 500) {
				return [
					{
						id: generateFindingId(),
						severity: this.resolveSeverity(pattern.severity),
						message: `${pattern.name}: File has ${lines} lines`,
						file: fileInfo.path,
						line: 1,
						column: 1,
						pass: pattern.pass,
						suggestion: pattern.suggestion,
						patternId: pattern.id,
						timestamp: new Date().toISOString(),
					},
				]
			}
		}

		if (pattern.id === "nested-loop-o2" && fileInfo.content) {
			// Simple heuristic for nested loops
			const nestedLoopPattern = /for\s*\([^)]+\)\s*\{[^}]*for\s*\(/g
			const matches = fileInfo.content.match(nestedLoopPattern)
			if (matches) {
				return matches.map((_, index) => ({
					id: generateFindingId(),
					severity: this.resolveSeverity(pattern.severity),
					message: `${pattern.name}: Potential O(n²) complexity`,
					file: fileInfo.path,
					line: 1, // Would need proper line calculation
					column: 1,
					pass: pattern.pass,
					suggestion: pattern.suggestion,
					patternId: pattern.id,
					timestamp: new Date().toISOString(),
				}))
			}
		}

		return []
	}

	/**
	 * Matches a hybrid pattern (regex + AST) against file content
	 */
	private async matchHybridPattern(fileInfo: FileInfo, pattern: PatternDefinition): Promise<Finding[]> {
		// First do regex matching
		const regexFindings = await this.matchRegexPattern(fileInfo, pattern)

		// Then do AST matching (when implemented)
		const astFindings = await this.matchAstPattern(fileInfo, pattern)

		// Combine and deduplicate
		return [...regexFindings, ...astFindings]
	}

	/**
	 * Resolves pattern severity, handling dynamic severity
	 */
	private resolveSeverity(severity: FindingSeverity | "dynamic", matchText?: string): FindingSeverity {
		if (severity !== "dynamic") {
			return severity
		}

		// Dynamic severity based on match context
		// This is a simplified implementation
		if (matchText?.toLowerCase().includes("password")) {
			return "critical"
		}
		if (matchText?.toLowerCase().includes("secret")) {
			return "critical"
		}
		return "high"
	}

	/**
	 * Extracts a code snippet around a line
	 */
	private extractCodeSnippet(lines: string[], lineIndex: number, contextLines = 2): string {
		const start = Math.max(0, lineIndex - contextLines)
		const end = Math.min(lines.length, lineIndex + contextLines + 1)

		return lines
			.slice(start, end)
			.map((line, i) => {
				const lineNum = start + i + 1
				const marker = lineNum === lineIndex + 1 ? ">" : " "
				return `${marker} ${lineNum.toString().padStart(4)} | ${line}`
			})
			.join("\n")
	}

	/**
	 * Parses a repertoire file content
	 */
	private parseRepertoire(content: string): PatternRepertoire {
		// For now, parse as JSON if it looks like JSON
		// In the future, this could parse a markdown format
		try {
			const trimmed = content.trim()
			if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
				const parsed = JSON.parse(trimmed)
				if (Array.isArray(parsed)) {
					// Array of patterns
					return {
						version: "1.0.0",
						updated_at: new Date().toISOString(),
						categories: [],
						patterns: parsed,
					}
				}
				return parsed as PatternRepertoire
			}

			// Try to parse as markdown with frontmatter
			return this.parseMarkdownRepertoire(content)
		} catch (error) {
			throw new PatternMatcherErrorClass(
				`Failed to parse repertoire: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : undefined,
			)
		}
	}

	/**
	 * Parses a markdown repertoire file
	 */
	private parseMarkdownRepertoire(content: string): PatternRepertoire {
		// Simple markdown parsing - look for pattern definitions in code blocks
		const patterns: PatternDefinition[] = []
		const codeBlockRegex = /```json\n([\s\S]*?)\n```/g

		let match: RegExpExecArray | null
		while ((match = codeBlockRegex.exec(content)) !== null) {
			try {
				const pattern = JSON.parse(match[1]) as PatternDefinition
				if (pattern.id && pattern.name && pattern.pass) {
					patterns.push(pattern)
				}
			} catch {
				// Skip invalid JSON blocks
			}
		}

		return {
			version: "1.0.0",
			updated_at: new Date().toISOString(),
			categories: [],
			patterns,
		}
	}

	/**
	 * Gets the default pattern repertoire
	 */
	private getDefaultRepertoire(): PatternRepertoire {
		const allPatterns: PatternDefinition[] = [
			...DEFAULT_PATTERNS["anti-patterns"],
			...DEFAULT_PATTERNS.architecture,
			...DEFAULT_PATTERNS.performance,
			...DEFAULT_PATTERNS.security,
		]

		return {
			version: "1.0.0",
			updated_at: new Date().toISOString(),
			categories: [
				{
					id: "anti-patterns",
					name: "Anti-Patterns",
					description: "Common code anti-patterns and code smells",
					patterns: DEFAULT_PATTERNS["anti-patterns"],
				},
				{
					id: "architecture",
					name: "Architecture",
					description: "Architecture and design issues",
					patterns: DEFAULT_PATTERNS.architecture,
				},
				{
					id: "performance",
					name: "Performance",
					description: "Performance optimization opportunities",
					patterns: DEFAULT_PATTERNS.performance,
				},
				{
					id: "security",
					name: "Security",
					description: "Security vulnerabilities and risks",
					patterns: DEFAULT_PATTERNS.security,
				},
			],
			patterns: allPatterns,
		}
	}
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new PatternMatcher instance
 *
 * @param options - Configuration options
 * @returns The pattern matcher instance
 */
export function createPatternMatcher(options?: {
	workspacePath?: string
	repertoirePath?: string
	cacheEnabled?: boolean
}): PatternMatcher {
	return new PatternMatcher(options)
}
