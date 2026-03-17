import YAML from "yaml";

export class YamlCvParser {
  parse(content: string): { rawText: string; readableText: string } {
    const parsed = YAML.parse(content);
    const readableText = this.toReadable(parsed);

    return {
      rawText: content,
      readableText,
    };
  }

  private toReadable(parsed: unknown): string {
    if (!parsed) {
      return "No se encontró contenido YAML válido.";
    }

    return [
      "CV normalizado (origen YAML)",
      "",
      "Resumen estructurado:",
      JSON.stringify(parsed, null, 2),
    ].join("\n");
  }
}
