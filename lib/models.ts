export type ModelConfig = {
  id: string
  name: string
  description: string
  inputCost: string
  outputCost: string
}

export const MODELS: ModelConfig[] = [
  {
    id: "minimax/minimax-m2.1",
    name: "MiniMax M2.1",
    description: "Best tool calling — built for agentic workflows",
    inputCost: "$0.29",
    outputCost: "$0.95",
  },
  {
    id: "z-ai/glm-4.7-flash",
    name: "GLM 4.7 Flash",
    description: "Optimized for agentic coding",
    inputCost: "$0.06",
    outputCost: "$0.40",
  },
  {
    id: "google/gemma-4-26b-a4b-it",
    name: "Gemma 4 26B",
    description: "Efficient MoE with near-31B quality",
    inputCost: "$0.12",
    outputCost: "$0.40",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    description: "Dense multimodal, 256K context (free)",
    inputCost: "Free",
    outputCost: "Free",
  },
]

export const DEFAULT_MODEL = MODELS[0]
