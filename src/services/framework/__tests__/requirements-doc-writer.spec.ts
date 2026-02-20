import * as fs from "fs/promises"
import * as path from "path"
import matter from "gray-matter"
import {
	buildRequirementsDocument,
	writeRequirementsDocument,
	type RequirementsMetadata,
	type RequirementsSections,
} from "../requirements/requirements-doc-writer"

vi.mock("fs/promises")
vi.mock("path")

const mockFs = vi.mocked(fs)
const mockPath = vi.mocked(path)

describe("requirements-doc-writer", () => {
	const sections: RequirementsSections = {
		problemStatement: "Users need structured requirements",
		goalsAndObjectives: ["Capture requirements", "Enable validation"],
		functionalRequirements: [
			"When a requirement is finalized, the system shall save it as a document.",
			"When approval is granted, the system shall update metadata.",
		],
		nonFunctionalRequirements: ["Documents must be readable"],
		constraintsAndAssumptions: ["Must use existing framework folder"],
		acceptanceCriteria: ["A requirements document is generated"],
		dependenciesAndImpacts: ["Impacts orchestrator workflow"],
		openQuestions: ["What issue ID should be used?"],
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mockFs.mkdir.mockResolvedValue(undefined as any)
		mockFs.writeFile.mockResolvedValue(undefined as any)
		mockPath.join.mockImplementation((...args) => args.join("/"))
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2024-01-01T00:00:00Z"))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("builds requirements document with metadata and sections", () => {
		const metadata: RequirementsMetadata = {
			issueId: "ISSUE-123",
			approvalStatus: "pending",
			createdAt: "2024-01-01T00:00:00Z",
		}
		const output = buildRequirementsDocument(metadata, sections)
		const parsed = matter(output)

		expect(parsed.data).toMatchObject(metadata)
		expect(parsed.content).toContain("## Problem Statement")
		expect(parsed.content).toContain("## Functional Requirements")
		expect(parsed.content).toContain("1. When a requirement is finalized")
		expect(parsed.content).toContain("- Documents must be readable")
	})

	it("fills placeholders for empty sections", () => {
		const metadata: RequirementsMetadata = {
			approvalStatus: "pending",
			createdAt: "2024-01-01T00:00:00Z",
		}
		const output = buildRequirementsDocument(metadata, {})
		const parsed = matter(output)

		expect(parsed.content).toContain("## Goals and Objectives")
		expect(parsed.content).toContain("- TBD")
		expect(parsed.content).toContain("## Functional Requirements")
		expect(parsed.content).toContain("1. TBD")
	})

	it("writes document to framework requirements directory", async () => {
		const metadata: RequirementsMetadata = {
			approvalStatus: "approved",
		}
		const result = await writeRequirementsDocument({
			issueId: "ISSUE-9",
			metadata,
			sections,
			workspacePath: "/workspace",
		})

		expect(mockFs.mkdir).toHaveBeenCalledWith("/workspace/.framework/requirements", { recursive: true })
		expect(mockFs.writeFile).toHaveBeenCalledWith(
			"/workspace/.framework/requirements/ISSUE-9-requirements.md",
			expect.any(String),
			"utf-8",
		)
		expect(result.metadata.approvalStatus).toBe("approved")
		expect(result.metadata.approvedAt).toBe("2024-01-01T00:00:00.000Z")
		expect(result.metadata.createdAt).toBe("2024-01-01T00:00:00.000Z")
	})
})
