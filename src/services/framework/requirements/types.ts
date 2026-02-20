// kilocode_change - new file

export type RequirementsGate = "smart" | "testable" | "consistent" | "feasible" | "complete"

export interface RequirementsSnapshot {
	requirements: string[]
	assumptions: string[]
	nonFunctionalRequirements: string[]
	edgeCases: string[]
	whyDepthByRequirement: Record<string, number>
	criteria: Partial<Record<RequirementsGate, boolean>>
}

export interface RequirementsWorkflowOptions {
	minWhyDepth: number
	maxQuestions: number
}

export interface RequirementsWorkflowDecision {
	shouldContinue: boolean
	nextQuestions: string[]
	failingGates: RequirementsGate[]
	requiredWhyDepth: number
}
