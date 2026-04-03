import type {
  BuildRenderCvPdfRequest,
  BuildRenderCvPdfResult,
  RenderCvBuilder,
} from "@/domain/services/rendercv-builder";
import { RenderCvApiService } from "@/infrastructure/services/rendercv-api.service";

export class BuildRenderCvPdfUseCase {
  constructor(private readonly builder: RenderCvBuilder = new RenderCvApiService()) {}

  async execute(request: BuildRenderCvPdfRequest): Promise<BuildRenderCvPdfResult> {
    if (!request.yamlContent.trim()) {
      throw new Error("Debes enviar contenido YAML para RenderCV.");
    }

    return this.builder.buildPdf(request);
  }
}
