import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { PythonRuntimeResolver } from "@/infrastructure/runtime/python-runtime";

const execFileAsync = promisify(execFile);

export class PdfCvParser {
  async parse(buffer: Buffer): Promise<{ rawText: string; readableText: string }> {
    const pythonBinary = await PythonRuntimeResolver.resolveProjectPythonBinary();

    if (!pythonBinary) {
      throw new Error(
        "No se encontró el entorno Python del proyecto para leer PDFs. Crea o activa .venv e instala dependencias.",
      );
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), "cv-pdf-"));
    const pdfPath = path.join(tempDir, "source.pdf");

    await writeFile(pdfPath, buffer);

    const script = [
      "import sys",
      "from pypdf import PdfReader",
      "reader = PdfReader(sys.argv[1])",
      "text = '\\n'.join((page.extract_text() or '') for page in reader.pages)",
      "sys.stdout.write(text)",
    ].join("\n");

    try {
      const { stdout } = await execFileAsync(pythonBinary, ["-c", script, pdfPath], {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });

      const content = stdout.trim();

      return {
        rawText: content,
        readableText: ["CV normalizado (origen PDF)", "", content].join("\n"),
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
