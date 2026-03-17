import type {
  CvNormalizationRequest,
  NormalizedCvResult,
} from "@/domain/models/cv-input";
import type { CvNormalizer } from "@/domain/services/cv-normalizer";
import { TextCvParser } from "@/infrastructure/parsers/text-cv-parser";
import { YamlCvParser } from "@/infrastructure/parsers/yaml-cv-parser";

export class NormalizeCvUseCase implements CvNormalizer {
  constructor(
    private readonly yamlParser = new YamlCvParser(),
    private readonly textParser = new TextCvParser(),
  ) {}

  async normalize(request: CvNormalizationRequest): Promise<NormalizedCvResult> {
    if (request.sourceType === "yaml") {
      const result = this.yamlParser.parse(request.content);
      return { sourceType: "yaml", ...result };
    }

    const result = this.textParser.parse(request.content);
    return { sourceType: request.sourceType, ...result };
  }
}
