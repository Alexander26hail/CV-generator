export class TextCvParser {
  parse(content: string): { rawText: string; readableText: string } {
    const cleaned = content
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line, index, array) => {
        if (line.length > 0) return true;
        return array[index - 1] !== "";
      })
      .join("\n");

    return {
      rawText: content,
      readableText: ["CV normalizado (origen texto)", "", cleaned].join("\n"),
    };
  }
}
