import type {
  BuildRenderCvPdfRequest,
  BuildRenderCvPdfResult,
  RenderCvBuilder,
} from "@/domain/services/rendercv-builder";
import { RenderCvCliService } from "@/infrastructure/services/rendercv-cli.service";

export class BuildRenderCvPdfUseCase {
  constructor(private readonly builder: RenderCvBuilder = new RenderCvCliService()) {}

  async execute(request: BuildRenderCvPdfRequest): Promise<BuildRenderCvPdfResult> {
    if (!request.yamlContent.trim()) {
      throw new Error("Debes enviar contenido YAML para RenderCV.");
    }

    return this.builder.buildPdf(request);
  }
}
