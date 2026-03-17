import { NextResponse } from "next/server";
import { z } from "zod";
import { BuildRenderCvPdfUseCase } from "@/application/use-cases/build-rendercv-pdf.use-case";

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
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el PDF con RenderCV.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
