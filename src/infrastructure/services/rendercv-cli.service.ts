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
    const remoteServiceUrl = this.resolveRemoteServiceUrl();

    if (remoteServiceUrl) {
      return this.buildPdfWithRemoteService(remoteServiceUrl, request);
    }

    const baseDir = path.join(process.cwd(), ".tmp", `rendercv-${Date.now()}`);
    const outputDir = path.join(baseDir, "output");
    const inputPath = path.join(baseDir, "cv.rendercv.yaml");

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(inputPath, request.yamlContent, "utf8");

    const renderCvCommand = await this.resolveRenderCvCommand();
    await this.runRenderCv(renderCvCommand, inputPath, outputDir);

    const pdfPath = await this.findPdf(outputDir);
    const pdfBuffer = await fs.readFile(pdfPath);

    return {
      fileName: path.basename(pdfPath),
      pdfBase64: pdfBuffer.toString("base64"),
    };
  }

  private resolveRemoteServiceUrl(): string | null {
    const candidate = process.env.RENDERCV_SERVICE_URL;
    if (!candidate) return null;

    const normalized = candidate.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private async buildPdfWithRemoteService(
    remoteServiceUrl: string,
    request: BuildRenderCvPdfRequest,
  ): Promise<BuildRenderCvPdfResult> {
    const headers: HeadersInit = {
      "content-type": "application/json",
    };

    if (process.env.RENDERCV_SERVICE_TOKEN?.trim()) {
      headers.authorization = `Bearer ${process.env.RENDERCV_SERVICE_TOKEN.trim()}`;
    }

    const response = await fetch(remoteServiceUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ yamlContent: request.yamlContent }),
      signal: AbortSignal.timeout(120000),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const upstreamError =
        payload && typeof payload === "object" && "error" in payload
          ? String(payload.error)
          : response.statusText;

      throw new Error(
        `Error en servicio remoto de RenderCV (${response.status}): ${upstreamError}`,
      );
    }

    const fileName =
      payload && typeof payload === "object" && "fileName" in payload
        ? String(payload.fileName)
        : "cv.pdf";
    const pdfBase64 =
      payload && typeof payload === "object" && "pdfBase64" in payload
        ? String(payload.pdfBase64)
        : "";

    if (!pdfBase64.trim()) {
      throw new Error(
        "El servicio remoto de RenderCV respondió sin `pdfBase64`.",
      );
    }

    return {
      fileName,
      pdfBase64,
    };
  }

  private async resolveRenderCvCommand(): Promise<string> {
    const projectBinary = await PythonRuntimeResolver.resolveProjectRenderCvBinary();

    if (projectBinary) {
      return `"${projectBinary}"`;
    }

    try {
      await execAsync("rendercv --version");
      return "rendercv";
    } catch {
      const projectPython = await PythonRuntimeResolver.resolveProjectPythonBinary();

      if (projectPython) {
        const pythonModuleCommand = `"${projectPython}" -m rendercv`;
        try {
          await execAsync(`${pythonModuleCommand} --version`);
          return pythonModuleCommand;
        } catch {
          // continue searching
        }
      }

      for (const pythonCommand of ["python3", "python"]) {
        try {
          await execAsync(`${pythonCommand} -m rendercv --version`);
          return `${pythonCommand} -m rendercv`;
        } catch {
          // continue searching
        }
      }

      throw new Error(
        "No se encontró RenderCV en el entorno actual. Instálalo en tu entorno Python (`python -m pip install rendercv`) o, para Vercel, define `RENDERCV_SERVICE_URL` apuntando a tu servicio remoto de renderizado.",
      );
    }
  }

  private async runRenderCv(
    renderCvCommand: string,
    inputPath: string,
    outputDir: string,
  ): Promise<void> {
    const command = `${renderCvCommand} render \"${inputPath}\" --output-folder \"${outputDir}\"`;

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
