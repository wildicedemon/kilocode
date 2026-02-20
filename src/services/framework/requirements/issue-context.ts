// kilocode_change - new file

import * as fs from "fs/promises"
import * as path from "path"
import type { CodeIndexManager } from "../../code-index/manager"
import type { VectorStoreSearchResult } from "../../code-index/interfaces"
import type { IssueEventPayload } from "../../webhooks/types"

export interface RequirementsIssueComment {
	id: number
	body?: string
	author?: string
	createdAt?: string
	url?: string
}

export interface RequirementsIssueContext {
	issueId: string
	issueNumber: number
	title: string
	body?: string
	url: string
	repository: {
		owner: string
		name: string
		fullName: string
		url: string
	}
	author: string
	labels: string[]
	comments: RequirementsIssueComment[]
	referencedPaths: string[]
}

export interface CodebaseValidationMatch {
	query: string
	results: VectorStoreSearchResult[]
}

export interface CodebaseValidationResult {
	status: "ready" | "disabled" | "unconfigured" | "unindexed" | "unavailable"
	statusMessage?: string
	queries: string[]
	matches: CodebaseValidationMatch[]
}

export interface IssueContextValidationResult {
	context: RequirementsIssueContext
	existingPaths: string[]
	missingPaths: string[]
	codebaseValidation: CodebaseValidationResult
}

export interface RequirementsIssueContextInput {
	payload: IssueEventPayload
	comments?: RequirementsIssueComment[]
}

export type CodeIndexSearchAdapter = Pick<
	CodeIndexManager,
	"isFeatureEnabled" | "isFeatureConfigured" | "getCurrentStatus" | "searchIndex"
>

const PATH_PATTERN = /(?:^|[\s`"'()\[])([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+(?:\.[A-Za-z0-9_.-]+)?)/g

function buildIssueId(payload: IssueEventPayload): string {
	const repoKey = payload.repository.full_name.replace("/", "-")
	return `issue-${repoKey}-${payload.issue.number}`
}

function collectTextFragments(payload: IssueEventPayload, comments: RequirementsIssueComment[]): string[] {
	const fragments = [payload.issue.title, payload.issue.body].filter(Boolean) as string[]
	for (const comment of comments) {
		if (comment.body) {
			fragments.push(comment.body)
		}
	}
	return fragments
}

export function extractReferencedPaths(texts: string[]): string[] {
	const matches = new Set<string>()
	for (const text of texts) {
		let match = PATH_PATTERN.exec(text)
		while (match) {
			const candidate = match[1].trim()
			if (candidate && !candidate.includes("://")) {
				matches.add(candidate)
			}
			match = PATH_PATTERN.exec(text)
		}
	}
	return Array.from(matches)
}

function resolvePathCandidate(workspacePath: string, candidate: string): string {
	if (path.isAbsolute(candidate)) {
		if (candidate.startsWith(workspacePath)) {
			return candidate
		}
		const stripped = candidate.replace(/^([A-Za-z]:)?[\\/]+/, "")
		return path.join(workspacePath, stripped)
	}
	const trimmed = candidate.replace(/^[\\/.]+/, "")
	return path.join(workspacePath, trimmed)
}

function normalizeRelativePath(workspacePath: string, fullPath: string): string {
	const relative = path.relative(workspacePath, fullPath)
	return relative.split(path.sep).join("/")
}

export function buildIssueContext(input: RequirementsIssueContextInput): RequirementsIssueContext {
	const { payload } = input
	const comments = input.comments ?? []
	const referencedPaths = extractReferencedPaths(collectTextFragments(payload, comments))

	return {
		issueId: buildIssueId(payload),
		issueNumber: payload.issue.number,
		title: payload.issue.title,
		body: payload.issue.body,
		url: payload.issue.html_url,
		repository: {
			owner: payload.repository.owner.login,
			name: payload.repository.name,
			fullName: payload.repository.full_name,
			url: payload.repository.html_url,
		},
		author: payload.issue.user.login,
		labels: payload.issue.labels.map((label) => label.name),
		comments,
		referencedPaths,
	}
}

export async function validateIssueContext(options: {
	input: RequirementsIssueContextInput
	workspacePath: string
	codeIndexManager?: CodeIndexSearchAdapter
	directoryPrefix?: string
}): Promise<IssueContextValidationResult> {
	const context = buildIssueContext(options.input)
	const resolvedPaths = context.referencedPaths.map((candidate) =>
		resolvePathCandidate(options.workspacePath, candidate),
	)
	const existingPaths: string[] = []
	const missingPaths: string[] = []

	for (const candidate of resolvedPaths) {
		try {
			await fs.access(candidate)
			existingPaths.push(normalizeRelativePath(options.workspacePath, candidate))
		} catch {
			missingPaths.push(normalizeRelativePath(options.workspacePath, candidate))
		}
	}

	const codebaseValidation = await runCodebaseValidation({
		context,
		codeIndexManager: options.codeIndexManager,
		directoryPrefix: options.directoryPrefix,
	})

	return {
		context,
		existingPaths,
		missingPaths,
		codebaseValidation,
	}
}

export function buildIssueSearchQueries(context: RequirementsIssueContext): string[] {
	const queries = new Set<string>()
	if (context.title.trim() !== "") {
		queries.add(context.title)
	}
	if (context.body) {
		const trimmed = context.body.trim()
		if (trimmed !== "") {
			queries.add(`${context.title} ${trimmed.slice(0, 200)}`.trim())
		}
	}
	for (const pathItem of context.referencedPaths) {
		queries.add(pathItem)
	}
	return Array.from(queries)
}

async function runCodebaseValidation(options: {
	context: RequirementsIssueContext
	codeIndexManager?: CodeIndexSearchAdapter
	directoryPrefix?: string
}): Promise<CodebaseValidationResult> {
	const queries = buildIssueSearchQueries(options.context)
	if (!options.codeIndexManager) {
		return {
			status: "unavailable",
			queries,
			matches: [],
		}
	}

	if (!options.codeIndexManager.isFeatureEnabled) {
		return {
			status: "disabled",
			queries,
			matches: [],
		}
	}

	if (!options.codeIndexManager.isFeatureConfigured) {
		return {
			status: "unconfigured",
			queries,
			matches: [],
		}
	}

	const status = options.codeIndexManager.getCurrentStatus()
	if (status.systemStatus !== "Indexed") {
		return {
			status: "unindexed",
			statusMessage: status.message,
			queries,
			matches: [],
		}
	}

	const matches: CodebaseValidationMatch[] = []
	for (const query of queries) {
		const results = await options.codeIndexManager.searchIndex(query, options.directoryPrefix)
		matches.push({ query, results })
	}

	return {
		status: "ready",
		queries,
		matches,
	}
}
