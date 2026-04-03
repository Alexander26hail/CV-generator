"use client";

import { useMemo, useState } from "react";

type SourceType = "yaml" | "text" | "pdf";
type OutputLanguage = "auto" | "spanish" | "english" | "portuguese" | "french";
type ThemePreset = "engineeringclassic" | "classic" | "sb2nov" | "moderncv" | "custom";

interface NormalizeResponse {
  sourceType: SourceType;
  rawText: string;
  readableText: string;
}

interface PromptResponse {
  prompt: string;
}

interface BuildPdfResponse {
  fileName: string;
  pdfBase64: string;
  error?: string;
  renderCvError?: string | null;
}

interface StepCardProps {
  step: number;
  title: string;
  summary: string;
  isOpen: boolean;
  isDone: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function StepCard({
  step,
  title,
  summary,
  isOpen,
  isDone,
  onToggle,
  children,
}: StepCardProps) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel-strong)] shadow-[0_18px_50px_rgba(76,57,35,0.08)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left sm:px-7"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
            {step.toString().padStart(2, "0")}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-[var(--foreground)] sm:text-xl">{title}</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  isDone
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {isDone ? "Listo" : "Pendiente"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{summary}</p>
          </div>
        </div>

        <div className="mt-1 rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">
          {isOpen ? "Cerrar" : "Abrir"}
        </div>
      </button>

      {isOpen ? <div className="border-t border-[var(--line)] px-5 py-5 sm:px-7">{children}</div> : null}
    </section>
  );
}

export function CvWorkflow() {
  const [openStep, setOpenStep] = useState(1);
  const [sourceType, setSourceType] = useState<SourceType>("yaml");
  const [cvText, setCvText] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobOffer, setJobOffer] = useState("");
  const [normalizedCv, setNormalizedCv] = useState("");
  const [prompt, setPrompt] = useState("");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("auto");
  const [themePreset, setThemePreset] = useState<ThemePreset>("engineeringclassic");
  const [customTheme, setCustomTheme] = useState("");
  const [renderYamlText, setRenderYamlText] = useState("");
  const [renderYamlFile, setRenderYamlFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState("");
  const [pdfFileName, setPdfFileName] = useState("cv-rendercv.pdf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [renderCvError, setRenderCvError] = useState("");

  const pdfDataUrl = useMemo(() => {
    if (!pdfBase64) return "";
    return `data:application/pdf;base64,${pdfBase64}`;
  }, [pdfBase64]);

  const normalizedReady = normalizedCv.trim().length > 0;
  const promptReady = prompt.trim().length > 0;
  const renderReady = pdfBase64.trim().length > 0;
  const selectedTheme = themePreset === "custom" ? customTheme.trim() || "engineeringclassic" : themePreset;

  const onNormalizeCv = async () => {
    setError("");
    setLoading(true);

    try {
      const form = new FormData();
      form.set("sourceType", sourceType);

      if (sourceType === "pdf") {
        if (!cvFile) {
          throw new Error("Selecciona un PDF para normalizar.");
        }
        form.set("file", cvFile);
      } else {
        if (!cvText.trim()) {
          throw new Error("Pega el contenido del CV antes de continuar.");
        }
        form.set("content", cvText);
      }

      const response = await fetch("/api/cv/normalize", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as NormalizeResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "No se pudo normalizar el CV.");
      }

      setNormalizedCv(data.readableText);
      setOpenStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const onGeneratePrompt = async () => {
    setError("");
    setLoading(true);

    try {
      if (!normalizedCv.trim()) {
        throw new Error("Primero normaliza el CV.");
      }
      if (!jobOffer.trim()) {
        throw new Error("Pega la oferta laboral antes de generar el prompt.");
      }

      const response = await fetch("/api/prompt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          normalizedCvText: normalizedCv,
          jobOfferText: jobOffer,
          outputLanguage,
          selectedTheme,
        }),
      });
      const data = (await response.json()) as PromptResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "No se pudo generar el prompt.");
      }

      setPrompt(data.prompt);
      setOpenStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const onBuildPdf = async () => {
    setError("");
    setRenderCvError("");
    setLoading(true);

    try {
      let yamlContent = renderYamlText;

      if (!yamlContent.trim() && renderYamlFile) {
        yamlContent = await renderYamlFile.text();
      }

      if (!yamlContent.trim()) {
        throw new Error("Debes pegar o cargar el YAML final de RenderCV.");
      }

      const response = await fetch("/api/rendercv/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yamlContent }),
      });
      const data = await response.json() as BuildPdfResponse;

      if (!response.ok) {
        if (data.renderCvError) {
          setRenderCvError(data.renderCvError);
        }
        throw new Error(data.error || "No se pudo generar el PDF.");
      }

      setPdfBase64(data.pdfBase64);
      setPdfFileName(data.fileName || "cv-rendercv.pdf");
      setOpenStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
  };

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="soft-grid absolute inset-x-4 top-6 -z-10 h-[320px] rounded-[2rem] opacity-40 sm:inset-x-6 lg:inset-x-8" />

      <section className="glass-panel overflow-hidden rounded-[2rem]">
        <div className="grid gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-10">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-xs font-medium tracking-[0.2em] text-[var(--muted)] uppercase">
              Cuestionario asistido para RenderCV
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
                Convierte un CV en un flujo ordenado, visible y listo para RenderCV.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                Cargas tu CV en YAML, texto o PDF, pegas una oferta laboral, obtienes un prompt estricto para IA y renderizas el PDF final sin integrar modelos dentro de tu app.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-[var(--accent-strong)]">Paso 1: normalizar</span>
              <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-[var(--accent-strong)]">Paso 2: adaptar a oferta</span>
              <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-[var(--accent-strong)]">Paso 3: prompt estricto</span>
              <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-[var(--accent-strong)]">Paso 4: render y descarga</span>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,250,242,0.96),rgba(246,236,223,0.96))] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Estado del flujo</h2>
              <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">
                {renderReady ? "Completo" : promptReady ? "Listo para render" : normalizedReady ? "En progreso" : "Inicial"}
              </span>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <span>CV normalizado</span>
                <strong className={normalizedReady ? "text-[var(--success)]" : "text-[var(--muted)]"}>{normalizedReady ? "Si" : "No"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <span>Oferta laboral cargada</span>
                <strong className={jobOffer.trim() ? "text-[var(--success)]" : "text-[var(--muted)]"}>{jobOffer.trim() ? "Si" : "No"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <span>Prompt generado</span>
                <strong className={promptReady ? "text-[var(--success)]" : "text-[var(--muted)]"}>{promptReady ? "Si" : "No"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <span>PDF renderizado</span>
                <strong className={renderReady ? "text-[var(--success)]" : "text-[var(--muted)]"}>{renderReady ? "Si" : "No"}</strong>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
              La app usa un entorno virtual local para RenderCV y para extraer texto desde PDF, así no dependes del Python global del sistema.
            </p>
          </aside>
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-700 shadow-[0_12px_35px_rgba(127,29,29,0.08)]">
          {error}
        </div>
      ) : null}

      {renderCvError ? (
        <div className="mt-4 rounded-[1.5rem] border border-orange-200 bg-orange-50 px-5 py-4 shadow-[0_12px_35px_rgba(154,52,18,0.07)]">
          <p className="mb-2 text-sm font-semibold text-orange-800">
            Errores de validación de RenderCV — copia este bloque y pídele a la IA que lo corrija:
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-white/80 p-4 text-xs leading-6 text-orange-900 border border-orange-100">
            {renderCvError}
          </pre>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <StepCard
            step={1}
            title="Cargar CV y normalizar"
            summary="Acepta YAML, texto plano o PDF para dejarlo en un formato legible y fácil de reutilizar."
            isOpen={openStep === 1}
            isDone={normalizedReady}
            onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}
          >
            <div className="space-y-5">
              <div className="flex flex-wrap gap-3 text-sm">
                {(["yaml", "text", "pdf"] as SourceType[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSourceType(option)}
                    className={`rounded-full px-4 py-2 transition ${
                      sourceType === option
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--line)] bg-white text-[var(--muted)]"
                    }`}
                  >
                    {option.toUpperCase()}
                  </button>
                ))}
              </div>

              {sourceType === "pdf" ? (
                <label className="block rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white/80 p-5 text-sm text-[var(--muted)]">
                  <span className="mb-2 block font-medium text-[var(--foreground)]">Sube tu PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
                    className="block w-full text-sm"
                  />
                </label>
              ) : (
                <textarea
                  className="h-52 w-full rounded-[1.25rem] border border-[var(--line)] bg-white/85 p-4 text-sm leading-7 outline-none ring-0 transition placeholder:text-stone-400 focus:border-[var(--accent)]"
                  placeholder={
                    sourceType === "yaml"
                      ? "Pega aqui tu YAML, idealmente en formato RenderCV o similar."
                      : "Pega aqui el texto de tu CV tal como lo tengas disponible."
                  }
                  value={cvText}
                  onChange={(event) => setCvText(event.target.value)}
                />
              )}

              <button
                type="button"
                onClick={onNormalizeCv}
                disabled={loading}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Procesando..." : "Normalizar CV"}
              </button>
            </div>
          </StepCard>

          <StepCard
            step={2}
            title="Pegar oferta laboral"
            summary="La oferta es la referencia para priorizar experiencia, stack y palabras clave en el YAML final."
            isOpen={openStep === 2}
            isDone={jobOffer.trim().length > 0}
            onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}
          >
            <textarea
              className="h-56 w-full rounded-[1.25rem] border border-[var(--line)] bg-white/85 p-4 text-sm leading-7 outline-none transition placeholder:text-stone-400 focus:border-[var(--accent)]"
              placeholder="Pega aqui la oferta laboral completa. Mientras mas contexto tenga, mejor podra adaptarse el prompt."
              value={jobOffer}
              onChange={(event) => setJobOffer(event.target.value)}
            />
          </StepCard>

          <StepCard
            step={3}
            title="Generar prompt estricto para IA"
            summary="El resultado obliga a la IA a responder solo con YAML compatible con RenderCV, sin markdown ni explicaciones."
            isOpen={openStep === 3}
            isDone={promptReady}
            onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}
          >
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span className="block font-medium text-[var(--foreground)]">Idioma del YAML</span>
                  <select
                    value={outputLanguage}
                    onChange={(event) => setOutputLanguage(event.target.value as OutputLanguage)}
                    className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="auto">Auto (según oferta laboral)</option>
                    <option value="spanish">Español</option>
                    <option value="english">English</option>
                    <option value="portuguese">Português</option>
                    <option value="french">Français</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span className="block font-medium text-[var(--foreground)]">Template / Theme de RenderCV</span>
                  <select
                    value={themePreset}
                    onChange={(event) => setThemePreset(event.target.value as ThemePreset)}
                    className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="engineeringclassic">engineeringclassic</option>
                    <option value="classic">classic</option>
                    <option value="sb2nov">sb2nov</option>
                    <option value="moderncv">moderncv</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </label>
              </div>

              {themePreset === "custom" ? (
                <label className="block space-y-2 text-sm text-[var(--muted)]">
                  <span className="block font-medium text-[var(--foreground)]">Nombre exacto del theme</span>
                  <input
                    type="text"
                    value={customTheme}
                    onChange={(event) => setCustomTheme(event.target.value)}
                    className="w-full rounded-[1rem] border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    placeholder="Escribe aquí el theme exacto soportado por RenderCV"
                  />
                </label>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onGeneratePrompt}
                  disabled={loading}
                  className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Generando..." : "Generar prompt"}
                </button>
                <button
                  type="button"
                  onClick={copyPrompt}
                  className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-medium text-[var(--foreground)]"
                >
                  Copiar prompt
                </button>
              </div>

              <textarea
                className="h-72 w-full rounded-[1.25rem] border border-[var(--line)] bg-white/85 p-4 text-sm leading-7 outline-none transition placeholder:text-stone-400 focus:border-[var(--accent)]"
                placeholder="El prompt aparecera aqui. Luego lo pegas en la IA que prefieras."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>
          </StepCard>

          <StepCard
            step={4}
            title="Renderizar y descargar PDF"
            summary="Pega o sube el YAML final generado por IA y la app renderiza el PDF con RenderCV."
            isOpen={openStep === 4}
            isDone={renderReady}
            onToggle={() => setOpenStep(openStep === 4 ? 0 : 4)}
          >
            <div className="space-y-5">
              <label className="block rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white/80 p-5 text-sm text-[var(--muted)]">
                <span className="mb-2 block font-medium text-[var(--foreground)]">Sube el YAML de RenderCV</span>
                <input
                  type="file"
                  accept=".yml,.yaml,text/yaml,text/x-yaml"
                  onChange={(event) => setRenderYamlFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm"
                />
              </label>

              <textarea
                className="h-60 w-full rounded-[1.25rem] border border-[var(--line)] bg-white/85 p-4 text-sm leading-7 outline-none transition placeholder:text-stone-400 focus:border-[var(--accent)]"
                placeholder="Pega aqui el YAML final compatible con RenderCV."
                value={renderYamlText}
                onChange={(event) => setRenderYamlText(event.target.value)}
              />

              <button
                type="button"
                onClick={onBuildPdf}
                disabled={loading}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Renderizando..." : "Generar PDF con RenderCV"}
              </button>
            </div>
          </StepCard>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
          <section className="glass-panel rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">CV normalizado</h2>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-[var(--muted)]">Preview</span>
            </div>
            <textarea
              className="mt-4 h-72 w-full rounded-[1.25rem] border border-[var(--line)] bg-white/85 p-4 text-sm leading-7 outline-none transition placeholder:text-stone-400 focus:border-[var(--accent)]"
              placeholder="Aqui se mostrara el CV normalizado en formato legible."
              value={normalizedCv}
              onChange={(event) => setNormalizedCv(event.target.value)}
            />
          </section>

          {pdfDataUrl ? (
            <section className="glass-panel rounded-[1.75rem] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">PDF generado</h2>
                <a
                  href={pdfDataUrl}
                  download={pdfFileName}
                  className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white"
                >
                  Descargar PDF
                </a>
              </div>
              <iframe src={pdfDataUrl} className="mt-4 h-[760px] w-full rounded-[1.25rem] border border-[var(--line)] bg-white" />
            </section>
          ) : (
            <section className="glass-panel rounded-[1.75rem] p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Vista previa del PDF</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Cuando renderices un YAML valido de RenderCV, aqui aparecera la vista previa y el enlace de descarga.
              </p>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
