export type ModelConfig = {
  id: string
  name: string
  description: string
  inputCost: string
  outputCost: string
}

export const MODELS: ModelConfig[] = [
  {
    id: "claude-haiku-5-5",
    name: "Claude Haiku 5.5",
    description: "Anthropic's fastest, lowest-cost model for chat and tool use",
    inputCost: "$0.10",
    outputCost: "$0.50",
  },
]

export const DEFAULT_MODEL = MODELS[0]
