import type {
  CvNormalizationRequest,
  NormalizedCvResult,
} from "@/domain/models/cv-input";

export interface CvNormalizer {
  normalize(request: CvNormalizationRequest): Promise<NormalizedCvResult>;
}
