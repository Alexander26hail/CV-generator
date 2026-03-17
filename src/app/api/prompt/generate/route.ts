import { NextResponse } from "next/server";
import { z } from "zod";
import { GenerateRenderCvPromptUseCase } from "@/application/use-cases/generate-rendercv-prompt.use-case";

const schema = z.object({
  normalizedCvText: z.string().min(10, "El CV normalizado está vacío."),
  jobOfferText: z.string().min(10, "La oferta laboral está vacía."),
  outputLanguage: z
    .enum(["auto", "spanish", "english", "portuguese", "french"])
    .optional()
    .default("auto"),
  selectedTheme: z.string().trim().min(1).optional().default("engineeringclassic"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const useCase = new GenerateRenderCvPromptUseCase();
    const result = useCase.execute(data);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el prompt solicitado.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
