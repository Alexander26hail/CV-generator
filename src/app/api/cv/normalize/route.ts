import { NextResponse } from "next/server";
import { z } from "zod";
import { NormalizeCvUseCase } from "@/application/use-cases/normalize-cv.use-case";
import { PdfCvParser } from "@/infrastructure/parsers/pdf-cv-parser";

export const runtime = "nodejs";

const schema = z.object({
  sourceType: z.enum(["yaml", "text", "pdf"]),
  content: z.string().optional().default(""),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sourceType = String(formData.get("sourceType") || "text");
    const content = String(formData.get("content") || "");
    const file = formData.get("file");

    const parsed = schema.parse({ sourceType, content });

    if (parsed.sourceType === "pdf") {
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Para PDF debes cargar un archivo." },
          { status: 400 },
        );
      }

      const pdfParser = new PdfCvParser();
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await pdfParser.parse(buffer);

      return NextResponse.json({ sourceType: "pdf", ...result });
    }

    if (!parsed.content.trim()) {
      return NextResponse.json(
        { error: "Debes enviar contenido de CV en texto o YAML." },
        { status: 400 },
      );
    }

    const useCase = new NormalizeCvUseCase();
    const result = await useCase.normalize({
      sourceType: parsed.sourceType,
      content: parsed.content,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo normalizar el CV.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
