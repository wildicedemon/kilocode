// kilocode_change - new file

/**
 * Scan Command
 *
 * Initializes the Deep Scanner and runs specified or all passes,
 * outputting findings with options to save to file.
 */

import * as fs from "fs/promises"
import * as path from "path"
import type { ParsedArgs, CLIOptions, Command, CommandResult } from "../types"
import { successResult, errorResult } from "../types"
import type { ScanPass, Finding, FindingSeverity, ScanResult } from "../../../scanner/types"
import { DeepScanner, createDeepScanner, ALL_SCAN_PASSES } from "../../../scanner/index"

// =============================================================================
// TYPES
// =============================================================================

interface ScanOptions {
	passes?: ScanPass[]
	output?: string
	format: "text" | "json" | "markdown" | "sarif"
	minSeverity: FindingSeverity
	failOnFindings: boolean
	maxFindings: number
	include?: string[]
	exclude?: string[]
}

interface ScanCommandResult {
	totalFindings: number
	findingsBySeverity: Record<string, number>
	findingsByPass: Record<string, number>
	duration: number
	filesScanned: number
	outputFile?: string
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse scan options from command arguments
 */
function parseScanOptions(args: ParsedArgs): ScanOptions {
	// Parse passes
	let passes: ScanPass[] | undefined
	if (args.passes && typeof args.passes === "string") {
		passes = args.passes.split(",").map((p) => p.trim()) as ScanPass[]
	} else if (args.passes && Array.isArray(args.passes)) {
		passes = args.passes as ScanPass[]
	}

	// Parse include/exclude patterns
	let include: string[] | undefined
	let exclude: string[] | undefined

	if (args.include && typeof args.include === "string") {
		include = args.include.split(",").map((p) => p.trim())
	} else if (args.include && Array.isArray(args.include)) {
		include = args.include
	}

	if (args.exclude && typeof args.exclude === "string") {
		exclude = args.exclude.split(",").map((p) => p.trim())
	} else if (args.exclude && Array.isArray(args.exclude)) {
		exclude = args.exclude
	}

	return {
		passes,
		output: typeof args.output === "string" ? args.output : undefined,
		format: (args.format as ScanOptions["format"]) ?? "text",
		minSeverity: (args["min-severity"] as FindingSeverity) ?? "low",
		failOnFindings: Boolean(args["fail-on-findings"]),
		maxFindings: typeof args["max-findings"] === "number" ? args["max-findings"] : 100,
		include,
		exclude,
	}
}

/**
 * Severity order for comparison
 */
const SEVERITY_ORDER: Record<FindingSeverity, number> = {
	critical: 5,
	high: 4,
	medium: 3,
	low: 2,
	info: 1,
}

/**
 * Check if a finding meets the minimum severity threshold
 */
function meetsMinSeverity(finding: Finding, minSeverity: FindingSeverity): boolean {
	return SEVERITY_ORDER[finding.severity] >= SEVERITY_ORDER[minSeverity]
}

/**
 * Get severity color code for terminal output
 */
function getSeverityColor(severity: FindingSeverity): number {
	const colorMap: Record<FindingSeverity, number> = {
		critical: 35, // magenta
		high: 31, // red
		medium: 33, // yellow
		low: 34, // blue
		info: 90, // gray
	}
	return colorMap[severity]
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: FindingSeverity): string {
	const iconMap: Record<FindingSeverity, string> = {
		critical: "🔴",
		high: "🟠",
		medium: "🟡",
		low: "🔵",
		info: "⚪",
	}
	return iconMap[severity]
}

// =============================================================================
// OUTPUT FORMATTING
// =============================================================================

/**
 * Format findings as text
 */
function formatFindingsText(findings: Finding[], colorEnabled: boolean): string {
	const lines: string[] = []

	// Group by severity
	const bySeverity = groupFindingsBySeverity(findings)

	lines.push("═".repeat(60))
	lines.push("  Scan Results")
	lines.push("═".repeat(60))
	lines.push("")

	// Summary
	lines.push("─".repeat(60))
	lines.push("  Summary")
	lines.push("─".repeat(60))
	lines.push(`  Total Findings: ${findings.length}`)

	for (const severity of ["critical", "high", "medium", "low", "info"] as FindingSeverity[]) {
		const count = bySeverity[severity]?.length ?? 0
		if (count > 0) {
			const icon = getSeverityIcon(severity)
			lines.push(`  ${icon} ${severity.toUpperCase()}: ${count}`)
		}
	}
	lines.push("")

	// Findings by pass
	const byPass = groupFindingsByPass(findings)
	lines.push("─".repeat(60))
	lines.push("  Findings by Pass")
	lines.push("─".repeat(60))
	for (const [pass, passFindings] of Object.entries(byPass)) {
		lines.push(`  ${pass}: ${passFindings.length} findings`)
	}
	lines.push("")

	// Detailed findings
	if (findings.length > 0) {
		lines.push("─".repeat(60))
		lines.push("  Detailed Findings")
		lines.push("─".repeat(60))

		for (const finding of findings) {
			const icon = getSeverityIcon(finding.severity)
			const severityText = colorEnabled
				? `\x1b[${getSeverityColor(finding.severity)}m${finding.severity.toUpperCase()}\x1b[0m`
				: finding.severity.toUpperCase()

			lines.push("")
			lines.push(`  ${icon} [${severityText}] ${finding.pass}`)
			lines.push(`     ${finding.message}`)
			lines.push(`     📁 ${finding.file}:${finding.line}:${finding.column}`)

			if (finding.codeSnippet) {
				lines.push(`     ┌──`)
				for (const line of finding.codeSnippet.split("\n").slice(0, 5)) {
					lines.push(`     │ ${line}`)
				}
				lines.push(`     └──`)
			}

			if (finding.suggestion) {
				lines.push(`     💡 ${finding.suggestion}`)
			}
		}
	}

	lines.push("")
	lines.push("═".repeat(60))

	return lines.join("\n")
}

/**
 * Format findings as markdown
 */
function formatFindingsMarkdown(findings: Finding[]): string {
	const lines: string[] = []

	lines.push("# Scan Results")
	lines.push("")

	// Summary
	lines.push("## Summary")
	lines.push("")
	lines.push(`**Total Findings:** ${findings.length}`)
	lines.push("")

	const bySeverity = groupFindingsBySeverity(findings)
	lines.push("| Severity | Count |")
	lines.push("|----------|-------|")

	for (const severity of ["critical", "high", "medium", "low", "info"] as FindingSeverity[]) {
		const count = bySeverity[severity]?.length ?? 0
		if (count > 0) {
			lines.push(`| ${severity} | ${count} |`)
		}
	}
	lines.push("")

	// Detailed findings
	if (findings.length > 0) {
		lines.push("## Findings")
		lines.push("")

		for (const finding of findings) {
			lines.push(`### [${finding.severity.toUpperCase()}] ${finding.pass}`)
			lines.push("")
			lines.push(`**File:** \`${finding.file}:${finding.line}:${finding.column}\``)
			lines.push("")
			lines.push(finding.message)
			lines.push("")

			if (finding.suggestion) {
				lines.push(`**Suggestion:** ${finding.suggestion}`)
				lines.push("")
			}
		}
	}

	return lines.join("\n")
}

/**
 * Format findings as SARIF (Static Analysis Results Interchange Format)
 */
function formatFindingsSarif(findings: Finding[]): string {
	const sarif = {
		$schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
		version: "2.1.0",
		runs: [
			{
				tool: {
					driver: {
						name: "Kilo Framework Deep Scanner",
						version: "1.0.0",
						informationUri: "https://github.com/kilocode/kilo-framework",
					},
				},
				results: findings.map((finding) => ({
					ruleId: finding.patternId ?? finding.pass,
					level: severityToSarifLevel(finding.severity),
					message: {
						text: finding.message,
					},
					locations: [
						{
							physicalLocation: {
								artifactLocation: {
									uri: finding.file,
								},
								region: {
									startLine: finding.line,
									startColumn: finding.column,
								},
							},
						},
					],
				})),
			},
		],
	}

	return JSON.stringify(sarif, null, 2)
}

/**
 * Convert severity to SARIF level
 */
function severityToSarifLevel(severity: FindingSeverity): string {
	const levelMap: Record<FindingSeverity, string> = {
		critical: "error",
		high: "error",
		medium: "warning",
		low: "note",
		info: "none",
	}
	return levelMap[severity]
}

/**
 * Group findings by severity
 */
function groupFindingsBySeverity(findings: Finding[]): Record<FindingSeverity, Finding[]> {
	const groups: Record<string, Finding[]> = {}

	for (const finding of findings) {
		if (!groups[finding.severity]) {
			groups[finding.severity] = []
		}
		groups[finding.severity].push(finding)
	}

	return groups as Record<FindingSeverity, Finding[]>
}

/**
 * Group findings by pass
 */
function groupFindingsByPass(findings: Finding[]): Record<string, Finding[]> {
	const groups: Record<string, Finding[]> = {}

	for (const finding of findings) {
		if (!groups[finding.pass]) {
			groups[finding.pass] = []
		}
		groups[finding.pass].push(finding)
	}

	return groups
}

// =============================================================================
// COMMAND IMPLEMENTATION
// =============================================================================

/**
 * Scan command handler
 */
async function handleScan(args: ParsedArgs, options: CLIOptions): Promise<CommandResult> {
	const scanOptions = parseScanOptions(args)
	const startTime = Date.now()

	try {
		if (!options.quiet) {
			console.log("Initializing Deep Scanner...")
		}

		// Create scanner with progress callback
		const scanner = await createDeepScanner({
			config: {
				enabled: true,
				passes: scanOptions.passes ?? ALL_SCAN_PASSES,
				stateFile: ".framework/scanner-state.md",
				repertoireFile: ".framework/scanner-repertoire.md",
				excludePatterns: scanOptions.exclude,
			},
			onProgress: (event) => {
				if (!options.quiet && options.verbose) {
					console.log(`  [${event.type}] ${event.message}`)
				}
			},
		})

		if (!options.quiet) {
			const passesToRun = scanOptions.passes ?? ALL_SCAN_PASSES
			console.log(`Running scan passes: ${passesToRun.join(", ")}`)
		}

		// Run the scan - scanner.run() takes a single pass or undefined for all
		let findings: Finding[]
		if (scanOptions.passes && scanOptions.passes.length === 1) {
			findings = await scanner.run(scanOptions.passes[0])
		} else {
			// Run all passes or multiple passes one at a time
			findings = []
			const passesToRun = scanOptions.passes ?? ALL_SCAN_PASSES
			for (const pass of passesToRun) {
				const passFindings = await scanner.run(pass)
				findings.push(...passFindings)
			}
		}

		// Build a scan result from findings
		const scanResult: ScanResult = {
			success: true,
			passResults: [],
			findings,
			totalDuration: Date.now() - startTime,
			totalFilesScanned: 0,
			startedAt: new Date(startTime).toISOString(),
			completedAt: new Date().toISOString(),
		}

		// Filter findings
		let filteredFindings = scanResult.findings.filter((f) => meetsMinSeverity(f, scanOptions.minSeverity))

		// Limit findings
		if (filteredFindings.length > scanOptions.maxFindings) {
			filteredFindings = filteredFindings.slice(0, scanOptions.maxFindings)
		}

		// Calculate statistics
		const findingsBySeverity: Record<string, number> = {}
		const findingsByPass: Record<string, number> = {}

		for (const finding of filteredFindings) {
			findingsBySeverity[finding.severity] = (findingsBySeverity[finding.severity] ?? 0) + 1
			findingsByPass[finding.pass] = (findingsByPass[finding.pass] ?? 0) + 1
		}

		const duration = Date.now() - startTime

		// Format output
		let output: string
		switch (scanOptions.format) {
			case "json":
				output = JSON.stringify(
					{
						findings: filteredFindings,
						summary: {
							totalFindings: filteredFindings.length,
							findingsBySeverity,
							findingsByPass,
							duration,
							filesScanned: scanResult.totalFilesScanned,
						},
					},
					null,
					2
				)
				break
			case "markdown":
				output = formatFindingsMarkdown(filteredFindings)
				break
			case "sarif":
				output = formatFindingsSarif(filteredFindings)
				break
			default:
				output = formatFindingsText(filteredFindings, options.color)
		}

		// Save to file if requested
		let outputFile: string | undefined
		if (scanOptions.output) {
			const outputPath = path.resolve(scanOptions.output)
			await fs.mkdir(path.dirname(outputPath), { recursive: true }).catch(() => {})
			await fs.writeFile(outputPath, output, "utf-8")
			outputFile = outputPath
			if (!options.quiet) {
				console.log(`\nResults saved to: ${outputFile}`)
			}
		} else {
			console.log(output)
		}

		// Build result
		const result: ScanCommandResult = {
			totalFindings: filteredFindings.length,
			findingsBySeverity,
			findingsByPass,
			duration,
			filesScanned: scanResult.totalFilesScanned,
			outputFile,
		}

		// Check if we should fail
		if (scanOptions.failOnFindings && filteredFindings.length > 0) {
			return {
				status: "error",
				exitCode: 1,
				message: `Scan found ${filteredFindings.length} findings`,
				data: result,
			}
		}

		return successResult(result, `Scan completed with ${filteredFindings.length} findings`)
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error))
		return errorResult(err)
	}
}

// =============================================================================
// COMMAND EXPORT
// =============================================================================

/**
 * Scan command definition
 */
export const scanCommand: Command = {
	name: "scan",
	description: "Run deep code analysis scans",
	longDescription: `
Initialize the Deep Scanner and run specified analysis passes.
By default, runs all passes: anti-patterns, architecture, performance, security.

Results can be output in various formats and optionally saved to a file.
	`.trim(),
	examples: [
		"kilo-framework scan",
		"kilo-framework scan --passes security,anti-patterns",
		"kilo-framework scan --min-severity high",
		"kilo-framework scan --output results.json --format json",
		"kilo-framework scan --fail-on-findings",
	],
	options: [
		{
			longFlag: "--passes",
			shortFlag: "-p",
			description: "Comma-separated list of scan passes to run",
			type: "string",
		},
		{
			longFlag: "--output",
			shortFlag: "-o",
			description: "Output file path for results",
			type: "string",
		},
		{
			longFlag: "--format",
			shortFlag: "-f",
			description: "Output format (text, json, markdown, sarif)",
			type: "string",
			defaultValue: "text",
		},
		{
			longFlag: "--min-severity",
			description: "Minimum severity level to report (critical, high, medium, low, info)",
			type: "string",
			defaultValue: "low",
		},
		{
			longFlag: "--fail-on-findings",
			description: "Exit with error code if findings are found",
			type: "boolean",
			defaultValue: false,
		},
		{
			longFlag: "--max-findings",
			description: "Maximum number of findings to report",
			type: "number",
			defaultValue: 100,
		},
		{
			longFlag: "--include",
			description: "Comma-separated glob patterns to include",
			type: "string",
		},
		{
			longFlag: "--exclude",
			description: "Comma-separated glob patterns to exclude",
			type: "string",
		},
	],
	handler: handleScan,
	aliases: ["analyze"],
	category: "analysis",
}

export { handleScan }