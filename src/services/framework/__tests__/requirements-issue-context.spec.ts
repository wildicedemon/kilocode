import * as fs from "fs/promises"
import {
	buildIssueContext,
	buildIssueSearchQueries,
	validateIssueContext,
	type CodeIndexSearchAdapter,
	type RequirementsIssueComment,
} from "../requirements/issue-context"
import type { IssueEventPayload } from "../../webhooks/types"

vi.mock("fs/promises")

const mockFs = vi.mocked(fs)

describe("requirements-issue-context", () => {
	const payload: IssueEventPayload = {
		action: "opened",
		issue: {
			id: 10,
			number: 42,
			title: "Add requirements workflow",
			body: "Please update src/services/framework/index.ts and webview-ui/src/App.tsx",
			html_url: "https://example.com/issues/42",
			state: "open",
			labels: [{ id: 1, name: "feature", color: "000000" }],
			assignees: [],
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z",
			user: { login: "octo", id: 99 },
		},
		repository: {
			id: 1,
			name: "repo",
			full_name: "kilo/repo",
			owner: { login: "kilo" },
			html_url: "https://example.com/kilo/repo",
		},
		sender: { login: "octo", id: 99 },
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("builds issue context with referenced paths", () => {
		const comments: RequirementsIssueComment[] = [{ id: 1, body: "Also touch packages/types/index.ts" }]
		const context = buildIssueContext({ payload, comments })

		expect(context.issueId).toBe("issue-kilo-repo-42")
		expect(context.labels).toEqual(["feature"])
		expect(context.referencedPaths).toEqual(
			expect.arrayContaining([
				"src/services/framework/index.ts",
				"webview-ui/src/App.tsx",
				"packages/types/index.ts",
			]),
		)
	})

	it("validates issue context with codebase search", async () => {
		mockFs.access.mockImplementation(async (filePath) => {
			const normalized = String(filePath).replace(/\\/g, "/")
			if (normalized.includes("src/services/framework/index.ts")) {
				return undefined
			}
			throw new Error("missing")
		})

		const manager: CodeIndexSearchAdapter = {
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			getCurrentStatus: () => ({
				systemStatus: "Indexed",
				message: "",
				workspacePath: "/workspace",
				processedItems: 1,
				totalItems: 1,
				currentItemUnit: "files",
				gitBranch: undefined,
				manifest: undefined,
			}),
			searchIndex: vi.fn().mockResolvedValue([{ id: "1", score: 0.9, payload: { filePath: "src/a.ts" } }]),
		}

		const result = await validateIssueContext({
			input: { payload, comments: [] },
			workspacePath: "/workspace",
			codeIndexManager: manager,
		})

		expect(result.existingPaths).toEqual(["src/services/framework/index.ts"])
		expect(result.missingPaths).toEqual(["webview-ui/src/App.tsx"])
		expect(result.codebaseValidation.status).toBe("ready")
		expect(result.codebaseValidation.matches[0].results[0].payload?.filePath).toBe("src/a.ts")
	})

	it("builds search queries from title and body", () => {
		const context = buildIssueContext({ payload, comments: [] })
		const queries = buildIssueSearchQueries(context)
		expect(queries[0]).toBe(payload.issue.title)
		expect(queries.some((query) => query.includes("requirements workflow"))).toBe(true)
	})
})
