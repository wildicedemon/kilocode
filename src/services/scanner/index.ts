// kilocode_change - new file

/**
 * Deep Scanner Service
 *
 * This module provides deep code analysis capabilities for Kilo Code,
 * including:
 *
 * - Multiple scan passes (anti-patterns, architecture, performance, security)
 * - Pattern matching with regex, AST, and semantic patterns
 * - State persistence and continuous scanning mode
 * - Progress reporting via events/callbacks
 *
 * @example
 * ```typescript
 * import {
 *   DeepScanner,
 *   createDeepScanner,
 *   type Finding,
 *   type ScanPass,
 * } from "@kilocode/scanner"
 *
 * // Create and initialize scanner
 * const scanner = await createDeepScanner({
 *   config: {
 *     enabled: true,
 *     passes: ['security', 'anti-patterns'],
 *   },
 *   onProgress: (event) => console.log(event.message),
 * })
 *
 * // Run a specific scan pass
 * const securityFindings = await scanner.run('security')
 *
 * // Run all configured passes
 * const allFindings = await scanner.run()
 *
 * // Start continuous scanning
 * await scanner.continuousScan()
 *
 * // Stop when done
 * scanner.stop()
 * ```
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Scan pass types
export type { ScanPass, FindingSeverity } from "./types"
export { ALL_SCAN_PASSES } from "./types"

// Finding types
export type { Finding, FindingFilter } from "./types"

// State types
export type { ScannerState, ScanPassState } from "./types"

// Configuration types
export type {
	ScannerConfig,
	ProgressCallback,
	ScanProgressEvent,
	ScanProgressEventType,
	DeepScannerOptions,
} from "./types"
export { DEFAULT_SCANNER_CONFIG } from "./types"

// Pattern types
export type {
	PatternDefinition,
	PatternMatchType,
	PatternSeverityMapping,
	PatternCategory,
	PatternRepertoire,
} from "./types"

// Result types
export type { ScanResult, ScanPassResult } from "./types"

// File info types
export type { FileInfo } from "./types"

// Error types
export { ScannerError, PatternMatcherError } from "./types"

// =============================================================================
// SCANNER EXPORTS
// =============================================================================

/**
 * DeepScanner class for running code analysis
 */
export { DeepScanner, createDeepScanner } from "./deep-scanner"

// =============================================================================
// PATTERN MATCHER EXPORTS
// =============================================================================

/**
 * PatternMatcher class for pattern matching utilities
 */
export { PatternMatcher, createPatternMatcher } from "./pattern-matcher"
