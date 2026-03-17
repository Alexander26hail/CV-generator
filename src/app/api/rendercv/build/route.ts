import { NextResponse } from "next/server";
import { z } from "zod";
import { BuildRenderCvPdfUseCase } from "@/application/use-cases/build-rendercv-pdf.use-case";

export const runtime = "nodejs";

const schema = z.object({
  yamlContent: z.string().min(1, "Debes enviar un YAML para RenderCV."),
});

export async function POST(request: Request) {
  try {
    if (process.env.VERCEL && !process.env.RENDERCV_SERVICE_URL?.trim()) {
      return NextResponse.json(
        {
          error:
            "Falta configurar RENDERCV_SERVICE_URL en Vercel para generar PDFs en producción.",
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const data = schema.parse(body);

    const useCase = new BuildRenderCvPdfUseCase();
    const result = await useCase.execute(data);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el PDF con RenderCV.";

    const status =
      message.includes("servicio remoto de RenderCV") ||
      message.includes("No se encontró RenderCV")
        ? 503
        : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
