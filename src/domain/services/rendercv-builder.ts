export interface BuildRenderCvPdfRequest {
  yamlContent: string;
}

export interface BuildRenderCvPdfResult {
  fileName: string;
  pdfBase64: string;
}

export interface RenderCvBuilder {
  buildPdf(request: BuildRenderCvPdfRequest): Promise<BuildRenderCvPdfResult>;
}
