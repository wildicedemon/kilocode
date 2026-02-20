// kilocode_change - new file

import { RequirementsWorkflowRunner } from "../requirements/requirements-workflow"
import type { RequirementsSnapshot } from "../requirements/types"

describe("RequirementsWorkflowRunner", () => {
	const baseSnapshot: RequirementsSnapshot = {
		requirements: ["Users can export reports"],
		assumptions: ["Users have export permissions"],
		nonFunctionalRequirements: ["Export completes within 5 seconds"],
		edgeCases: ["Large exports should not time out"],
		whyDepthByRequirement: { "Users can export reports": 3 },
		criteria: {
			smart: true,
			testable: true,
			consistent: true,
			feasible: true,
			complete: true,
		},
	}

	it("continues when requirements are missing", () => {
		const runner = new RequirementsWorkflowRunner()
		const snapshot: RequirementsSnapshot = {
			...baseSnapshot,
			requirements: [],
		}
		const result = runner.evaluate(snapshot)
		expect(result.shouldContinue).toBe(true)
		expect(result.nextQuestions[0]).toBe("What is the core problem statement and desired outcome?")
	})

	it("asks for deeper why chains", () => {
		const runner = new RequirementsWorkflowRunner({ minWhyDepth: 3 })
		const snapshot: RequirementsSnapshot = {
			...baseSnapshot,
			whyDepthByRequirement: { "Users can export reports": 1 },
		}
		const result = runner.evaluate(snapshot)
		expect(result.nextQuestions.some((question) => question.includes('Why is "Users can export reports"'))).toBe(
			true,
		)
	})

	it("flags failing gates", () => {
		const runner = new RequirementsWorkflowRunner()
		const snapshot: RequirementsSnapshot = {
			...baseSnapshot,
			criteria: { ...baseSnapshot.criteria, feasible: false },
		}
		const result = runner.evaluate(snapshot)
		expect(result.failingGates).toEqual(["feasible"])
		expect(result.nextQuestions.some((question) => question.includes("codebase"))).toBe(true)
	})

	it("completes when all gates pass and content is present", () => {
		const runner = new RequirementsWorkflowRunner()
		const result = runner.evaluate(baseSnapshot)
		expect(result.shouldContinue).toBe(false)
		expect(result.nextQuestions).toEqual([])
	})
})
