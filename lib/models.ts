export type ModelConfig = {
  id: string
  name: string
  description: string
  inputCost: string
  outputCost: string
}

export const MODELS: ModelConfig[] = [
  {
    id: "claude-sonnet-5-5",
    name: "Claude Sonnet 5.5",
    description: "Anthropic's fast, capable model for analysis and tool use",
    inputCost: "$2.00",
    outputCost: "$10.00",
  },
]

export const DEFAULT_MODEL = MODELS[0]
