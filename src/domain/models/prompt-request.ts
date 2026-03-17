export type PromptOutputLanguage =
  | "auto"
  | "spanish"
  | "english"
  | "portuguese"
  | "french";

export interface PromptGenerationRequest {
  normalizedCvText: string;
  jobOfferText: string;
  outputLanguage?: PromptOutputLanguage;
  selectedTheme?: string;
}

export interface PromptGenerationResult {
  prompt: string;
}
