import type {
  BuildRenderCvPdfRequest,
  BuildRenderCvPdfResult,
  RenderCvBuilder,
} from "@/domain/services/rendercv-builder";

interface LoginResponse {
  access_token: string;
  token_type: string;
}

// Module-level token cache (persists across requests within the same process)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function getApiConfig() {
  const url =
    process.env.RENDERCV_API_URL?.trim() ||
    "https://api-cv-rendercv.onrender.com";
  const username = process.env.RENDERCV_API_USERNAME?.trim();
  const password = process.env.RENDERCV_API_PASSWORD?.trim();
  return { url, username, password };
}

function parseJwtExpiry(token: string): number {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export class RenderCvApiError extends Error {
  constructor(
    message: string,
    public readonly renderCvDetail?: string,
  ) {
    super(message);
    this.name = "RenderCvApiError";
  }
}

export class RenderCvApiService implements RenderCvBuilder {
  static isConfigured(): boolean {
    const { username, password } = getApiConfig();
    return !!(username && password);
  }

  async buildPdf(request: BuildRenderCvPdfRequest): Promise<BuildRenderCvPdfResult> {
    const { url, username, password } = getApiConfig();

    if (!username || !password) {
      throw new Error(
        "Faltan las credenciales de la API de RenderCV. Configura RENDERCV_API_USERNAME y RENDERCV_API_PASSWORD.",
      );
    }

    const token = await this.getToken(url, username, password);

    const formData = new FormData();
    const blob = new Blob([request.yamlContent], { type: "application/x-yaml" });
    formData.append("yaml_file", blob, "cv.yaml");

    const response = await fetch(`${url}/cv/render-yaml`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      signal: AbortSignal.timeout(120_000),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const { message, detail } = this.extractError(payload, response.statusText);
      throw new RenderCvApiError(message, detail);
    }

    const pdfBase64: string =
      payload && typeof payload === "object" && "pdf_base64" in payload
        ? String(payload.pdf_base64)
        : "";

    if (!pdfBase64.trim()) {
      throw new Error("La API de RenderCV respondió sin `pdf_base64`.");
    }

    return {
      fileName: "cv.pdf",
      pdfBase64,
    };
  }

  private extractError(
    payload: unknown,
    fallback: string,
  ): { message: string; detail?: string } {
    if (payload && typeof payload === "object" && "detail" in payload) {
      const detail = (payload as { detail: unknown }).detail;

      if (typeof detail === "object" && detail !== null) {
        const d = detail as Record<string, unknown>;
        return {
          message: typeof d.message === "string" ? d.message : "Error al generar PDF",
          detail: typeof d.error === "string" ? d.error : undefined,
        };
      }

      if (typeof detail === "string") {
        return { message: detail };
      }
    }

    return { message: fallback };
  }

  private async getToken(
    url: string,
    username: string,
    password: string,
  ): Promise<string> {
    const now = Date.now();

    // Reuse cached token if it has more than 60 seconds of validity left
    if (cachedToken && tokenExpiresAt > now + 60_000) {
      return cachedToken;
    }

    const response = await fetch(`${url}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Error al autenticarse con la API de RenderCV (${response.status}): ${body}`,
      );
    }

    const data: LoginResponse = await response.json();
    cachedToken = data.access_token;
    tokenExpiresAt = parseJwtExpiry(cachedToken);

    return cachedToken;
  }
}
