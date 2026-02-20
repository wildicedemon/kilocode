import * as fs from "fs/promises"
import * as path from "path"
import matter from "gray-matter"

export type ApprovalStatus = "pending" | "approved"

export interface RequirementsMetadata {
	issueId?: string
	approvalStatus: ApprovalStatus
	createdAt?: string
	approvedAt?: string
}

export interface RequirementsSections {
	problemStatement?: string
	goalsAndObjectives?: string[]
	functionalRequirements?: string[]
	nonFunctionalRequirements?: string[]
	constraintsAndAssumptions?: string[]
	acceptanceCriteria?: string[]
	dependenciesAndImpacts?: string[]
	openQuestions?: string[]
}

export interface RequirementsDocumentOptions {
	issueId: string
	metadata: RequirementsMetadata
	sections: RequirementsSections
	workspacePath?: string
}

export interface RequirementsDocumentResult {
	path: string
	content: string
	metadata: RequirementsMetadata
}

export interface RequirementsApprovalUpdateOptions {
	documentPath: string
	approvalStatus: ApprovalStatus
	approvedAt?: string
}

const DEFAULT_PLACEHOLDER = "TBD"

function getCwd(): string {
	const proc = (globalThis as unknown as { process?: { cwd?: () => string } }).process
	return proc?.cwd?.() ?? "."
}

function normalizeMetadata(issueId: string, metadata: RequirementsMetadata): RequirementsMetadata {
	const now = new Date().toISOString()
	const approvalStatus = metadata.approvalStatus
	const createdAt = metadata.createdAt ?? now
	const approvedAt = approvalStatus === "approved" ? (metadata.approvedAt ?? now) : metadata.approvedAt
	return {
		...metadata,
		issueId: metadata.issueId ?? issueId,
		createdAt,
		approvedAt,
	}
}

function renderParagraph(value?: string): string {
	const trimmed = value?.trim()
	return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_PLACEHOLDER
}

function renderBullets(items?: string[]): string {
	if (!items || items.length === 0) {
		return `- ${DEFAULT_PLACEHOLDER}`
	}
	return items.map((item) => `- ${item}`).join("\n")
}

function renderNumbered(items?: string[]): string {
	if (!items || items.length === 0) {
		return `1. ${DEFAULT_PLACEHOLDER}`
	}
	return items.map((item, index) => `${index + 1}. ${item}`).join("\n")
}

export function buildRequirementsDocument(metadata: RequirementsMetadata, sections: RequirementsSections): string {
	const body = [
		"## Problem Statement",
		renderParagraph(sections.problemStatement),
		"",
		"## Goals and Objectives",
		renderBullets(sections.goalsAndObjectives),
		"",
		"## Functional Requirements",
		renderNumbered(sections.functionalRequirements),
		"",
		"## Non-Functional Requirements",
		renderBullets(sections.nonFunctionalRequirements),
		"",
		"## Constraints and Assumptions",
		renderBullets(sections.constraintsAndAssumptions),
		"",
		"## Acceptance Criteria",
		renderBullets(sections.acceptanceCriteria),
		"",
		"## Dependencies and Impacts",
		renderBullets(sections.dependenciesAndImpacts),
		"",
		"## Open Questions",
		renderBullets(sections.openQuestions),
		"",
	].join("\n")

	return matter.stringify(body, metadata)
}

export async function writeRequirementsDocument(
	options: RequirementsDocumentOptions,
): Promise<RequirementsDocumentResult> {
	const workspacePath = options.workspacePath ?? getCwd()
	const directory = path.join(workspacePath, ".framework", "requirements")
	const filePath = path.join(directory, `${options.issueId}-requirements.md`)
	const metadata = normalizeMetadata(options.issueId, options.metadata)
	const content = buildRequirementsDocument(metadata, options.sections)

	await fs.mkdir(directory, { recursive: true })
	await fs.writeFile(filePath, content, "utf-8")

	return {
		path: filePath,
		content,
		metadata,
	}
}

// kilocode_change start
export async function updateRequirementsApprovalStatus(
	options: RequirementsApprovalUpdateOptions,
): Promise<RequirementsDocumentResult> {
	const rawContent = await fs.readFile(options.documentPath, "utf-8")
	const parsed = matter(rawContent)
	const currentMetadata = parsed.data as RequirementsMetadata
	const issueId = currentMetadata.issueId ?? path.basename(options.documentPath).replace(/-requirements\.md$/, "")
	const approvalMetadata: RequirementsMetadata = {
		...currentMetadata,
		issueId,
		approvalStatus: options.approvalStatus,
		approvedAt:
			options.approvalStatus === "approved" ? (options.approvedAt ?? currentMetadata.approvedAt) : undefined,
	}
	const metadata = normalizeMetadata(issueId, approvalMetadata)
	const content = matter.stringify(parsed.content, metadata)

	await fs.writeFile(options.documentPath, content, "utf-8")

	return {
		path: options.documentPath,
		content,
		metadata,
	}
}
// kilocode_change end
