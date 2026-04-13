import { NextResponse } from "next/server";
import { z } from "zod";
import { BuildRenderCvPdfUseCase } from "@/application/use-cases/build-rendercv-pdf.use-case";
import { RenderCvApiError } from "@/infrastructure/services/rendercv-api.service";

export const runtime = "nodejs";

const schema = z.object({
  yamlContent: z.string().min(1, "Debes enviar un YAML para RenderCV."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const useCase = new BuildRenderCvPdfUseCase();
    const result = await useCase.execute(data);

    return NextResponse.json(result);
  } catch (error) {
    // Surface RenderCV validation details so the client can ask the AI to fix them
    if (error instanceof RenderCvApiError) {
      return NextResponse.json(
        {
          error: error.message,
          renderCvError: error.renderCvDetail ?? null,
        },
        { status: 422 },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el PDF con RenderCV.";

    const status =
      message.includes("API de RenderCV") ||
      message.includes("No se encontró RenderCV")
        ? 503
        : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
