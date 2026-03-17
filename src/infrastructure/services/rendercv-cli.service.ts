import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type {
  BuildRenderCvPdfRequest,
  BuildRenderCvPdfResult,
  RenderCvBuilder,
} from "@/domain/services/rendercv-builder";
import { PythonRuntimeResolver } from "@/infrastructure/runtime/python-runtime";

const execAsync = promisify(exec);

export class RenderCvCliService implements RenderCvBuilder {
  async buildPdf(request: BuildRenderCvPdfRequest): Promise<BuildRenderCvPdfResult> {
    const baseDir = path.join(process.cwd(), ".tmp", `rendercv-${Date.now()}`);
    const outputDir = path.join(baseDir, "output");
    const inputPath = path.join(baseDir, "cv.rendercv.yaml");

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(inputPath, request.yamlContent, "utf8");

    await this.ensureRenderCvInstalled();
    await this.runRenderCv(inputPath, outputDir);

    const pdfPath = await this.findPdf(outputDir);
    const pdfBuffer = await fs.readFile(pdfPath);

    return {
      fileName: path.basename(pdfPath),
      pdfBase64: pdfBuffer.toString("base64"),
    };
  }

  private async ensureRenderCvInstalled(): Promise<void> {
    const projectBinary = await PythonRuntimeResolver.resolveProjectRenderCvBinary();

    if (projectBinary) {
      return;
    }

    try {
      await execAsync("rendercv --version");
    } catch {
      throw new Error(
        "No se encontró RenderCV. En este proyecto quedó instalado en un entorno virtual local; si falta, instálalo con `../.venv/bin/python -m pip install rendercv` o asegúrate de tener el binario disponible.",
      );
    }
  }

  private async runRenderCv(inputPath: string, outputDir: string): Promise<void> {
    const projectBinary = await PythonRuntimeResolver.resolveProjectRenderCvBinary();
    const renderCvBinary = projectBinary ?? "rendercv";
    const command = `\"${renderCvBinary}\" render \"${inputPath}\" --output-folder \"${outputDir}\"`;

    try {
      await execAsync(command, { timeout: 120000 });
    } catch (error) {
      const stderr =
        error instanceof Error
          ? error.message
          : "No se pudo ejecutar rendercv render.";
      throw new Error(`Error ejecutando RenderCV: ${stderr}`);
    }
  }

  private async findPdf(dir: string): Promise<string> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const nested = await this.findPdf(fullPath).catch(() => null);
        if (nested) return nested;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        return fullPath;
      }
    }

    throw new Error(
      "RenderCV terminó, pero no se encontró un PDF en la carpeta de salida.",
    );
  }
}
