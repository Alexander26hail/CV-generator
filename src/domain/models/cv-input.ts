export type CvSourceType = "yaml" | "text" | "pdf";

export interface NormalizedCvResult {
  sourceType: CvSourceType;
  rawText: string;
  readableText: string;
}

export interface CvNormalizationRequest {
  sourceType: CvSourceType;
  content: string;
}
