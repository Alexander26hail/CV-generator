import { access } from "node:fs/promises";
import path from "node:path";

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export class PythonRuntimeResolver {
  static async resolveProjectPythonBinary(): Promise<string | null> {
    const virtualEnv = process.env.VIRTUAL_ENV;
    const candidates = [
      process.env.PYTHON_BIN,
      process.env.PYTHON_PATH,
      virtualEnv ? path.join(virtualEnv, "bin", "python") : null,
      virtualEnv ? path.join(virtualEnv, "Scripts", "python.exe") : null,
      path.join(process.cwd(), "..", ".venv", "bin", "python"),
      path.join(process.cwd(), ".venv", "bin", "python"),
      path.join(process.cwd(), "..", ".venv", "Scripts", "python.exe"),
      path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
    ];

    for (const candidate of candidates) {
      if (candidate && (await exists(candidate))) {
        return candidate;
      }
    }

    return null;
  }

  static async resolveProjectRenderCvBinary(): Promise<string | null> {
    const virtualEnv = process.env.VIRTUAL_ENV;
    const candidates = [
      process.env.RENDERCV_BIN,
      virtualEnv ? path.join(virtualEnv, "bin", "rendercv") : null,
      virtualEnv ? path.join(virtualEnv, "Scripts", "rendercv.exe") : null,
      path.join(process.cwd(), "..", ".venv", "bin", "rendercv"),
      path.join(process.cwd(), ".venv", "bin", "rendercv"),
      path.join(process.cwd(), "..", ".venv", "Scripts", "rendercv.exe"),
      path.join(process.cwd(), ".venv", "Scripts", "rendercv.exe"),
    ];

    for (const candidate of candidates) {
      if (candidate && (await exists(candidate))) {
        return candidate;
      }
    }

    return null;
  }
}