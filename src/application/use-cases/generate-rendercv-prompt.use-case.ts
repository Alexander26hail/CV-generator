import type {
  PromptGenerationRequest,
  PromptGenerationResult,
} from "@/domain/models/prompt-request";
import type { PromptBuilder } from "@/domain/services/prompt-builder";
import { DefaultPromptBuilder } from "@/infrastructure/services/default-prompt-builder";

export class GenerateRenderCvPromptUseCase {
  constructor(private readonly promptBuilder: PromptBuilder = new DefaultPromptBuilder()) {}

  execute(request: PromptGenerationRequest): PromptGenerationResult {
    return this.promptBuilder.build(request);
  }
}
