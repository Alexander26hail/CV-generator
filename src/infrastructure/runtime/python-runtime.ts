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
    const candidates = [
      path.join(process.cwd(), "..", ".venv", "bin", "python"),
      path.join(process.cwd(), ".venv", "bin", "python"),
    ];

    for (const candidate of candidates) {
      if (await exists(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  static async resolveProjectRenderCvBinary(): Promise<string | null> {
    const candidates = [
      path.join(process.cwd(), "..", ".venv", "bin", "rendercv"),
      path.join(process.cwd(), ".venv", "bin", "rendercv"),
    ];

    for (const candidate of candidates) {
      if (await exists(candidate)) {
        return candidate;
      }
    }

    return null;
  }
}