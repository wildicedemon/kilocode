// kilocode_change - new file

import type {
	RequirementsGate,
	RequirementsSnapshot,
	RequirementsWorkflowDecision,
	RequirementsWorkflowOptions,
} from "./types"

const gateQuestions: Record<RequirementsGate, string> = {
	smart: "Which parts of the requirement need sharper scope, measurable targets, or time bounds?",
	testable: "How will we verify each requirement with a concrete test or acceptance check?",
	consistent: "Are there any contradictions with existing requirements or architectural constraints?",
	feasible: "What codebase constraints or dependencies could block delivery?",
	complete: "Which happy-path, edge-case, or failure scenarios are still missing?",
}

const defaultOptions: RequirementsWorkflowOptions = {
	minWhyDepth: 3,
	maxQuestions: 8,
}

export class RequirementsWorkflowRunner {
	private readonly options: RequirementsWorkflowOptions

	constructor(options?: Partial<RequirementsWorkflowOptions>) {
		this.options = { ...defaultOptions, ...options }
	}

	evaluate(snapshot: RequirementsSnapshot): RequirementsWorkflowDecision {
		const nextQuestions: string[] = []
		const failingGates: RequirementsGate[] = []

		if (snapshot.requirements.length === 0) {
			nextQuestions.push("What is the core problem statement and desired outcome?")
		}

		const missingWhyDepth = snapshot.requirements.filter((requirement) => {
			const depth = snapshot.whyDepthByRequirement[requirement] ?? 0
			return depth < this.options.minWhyDepth
		})

		for (const requirement of missingWhyDepth) {
			if (nextQuestions.length >= this.options.maxQuestions) break
			nextQuestions.push(`Why is \"${requirement}\" needed, and what goal does it serve?`)
		}

		if (snapshot.assumptions.length === 0 && nextQuestions.length < this.options.maxQuestions) {
			nextQuestions.push("What assumptions are we making that should be stated explicitly?")
		}

		if (snapshot.nonFunctionalRequirements.length === 0 && nextQuestions.length < this.options.maxQuestions) {
			nextQuestions.push("What non-functional requirements (performance, security, scalability) apply?")
		}

		if (snapshot.edgeCases.length === 0 && nextQuestions.length < this.options.maxQuestions) {
			nextQuestions.push("Which edge cases or error conditions need explicit coverage?")
		}

		const gates: RequirementsGate[] = ["smart", "testable", "consistent", "feasible", "complete"]
		for (const gate of gates) {
			if (snapshot.criteria[gate] !== true) {
				failingGates.push(gate)
				if (nextQuestions.length < this.options.maxQuestions) {
					nextQuestions.push(gateQuestions[gate])
				}
			}
		}

		return {
			shouldContinue: nextQuestions.length > 0,
			nextQuestions,
			failingGates,
			requiredWhyDepth: this.options.minWhyDepth,
		}
	}
}
