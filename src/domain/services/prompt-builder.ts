import type {
  PromptGenerationRequest,
  PromptGenerationResult,
} from "@/domain/models/prompt-request";

export interface PromptBuilder {
  build(request: PromptGenerationRequest): PromptGenerationResult;
}
