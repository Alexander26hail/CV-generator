import type {
  BuildRenderCvPdfRequest,
  BuildRenderCvPdfResult,
  RenderCvBuilder,
} from "@/domain/services/rendercv-builder";
import { RenderCvApiService } from "@/infrastructure/services/rendercv-api.service";
import { RenderCvCliService } from "@/infrastructure/services/rendercv-cli.service";

function createDefaultBuilder(): RenderCvBuilder {
  return RenderCvApiService.isConfigured()
    ? new RenderCvApiService()
    : new RenderCvCliService();
}

export class BuildRenderCvPdfUseCase {
  constructor(private readonly builder: RenderCvBuilder = createDefaultBuilder()) {}

  async execute(request: BuildRenderCvPdfRequest): Promise<BuildRenderCvPdfResult> {
    if (!request.yamlContent.trim()) {
      throw new Error("Debes enviar contenido YAML para RenderCV.");
    }

    return this.builder.buildPdf(request);
  }
}
