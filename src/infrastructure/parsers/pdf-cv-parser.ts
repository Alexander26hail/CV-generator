import pdfParse from "pdf-parse/lib/pdf-parse.js";

export class PdfCvParser {
  async parse(buffer: Buffer): Promise<{ rawText: string; readableText: string }> {
    const parsed = await pdfParse(buffer);
    const content = parsed.text.trim();

    return {
      rawText: content,
      readableText: ["CV normalizado (origen PDF)", "", content].join("\n"),
    };
  }
}
