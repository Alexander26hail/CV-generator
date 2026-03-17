import type {
  PromptOutputLanguage,
  PromptGenerationRequest,
  PromptGenerationResult,
} from "@/domain/models/prompt-request";
import type { PromptBuilder } from "@/domain/services/prompt-builder";

function detectLanguageFromOffer(text: string): Exclude<PromptOutputLanguage, "auto"> {
  const normalized = text.toLowerCase();

  const scores = {
    spanish: 0,
    english: 0,
    portuguese: 0,
    french: 0,
  };

  const spanishSignals = [
    "oferta",
    "puesto",
    "trabajo",
    "experiencia",
    "requisitos",
    "empresa",
    "conocimiento",
    "años",
    "ingenier",
    "desarrollador",
    "remoto",
    "híbrido",
  ];
  const englishSignals = [
    "job",
    "position",
    "requirements",
    "experience",
    "company",
    "skills",
    "years",
    "developer",
    "hybrid",
    "remote",
    "responsibilities",
    "must have",
  ];
  const portugueseSignals = [
    "vaga",
    "requisitos",
    "experiência",
    "empresa",
    "desenvolvedor",
    "trabalho",
    "conhecimento",
    "anos",
    "híbrido",
    "remoto",
  ];
  const frenchSignals = [
    "poste",
    "expérience",
    "entreprise",
    "compétences",
    "développeur",
    "travail",
    "exigences",
    "années",
    "hybride",
    "télétravail",
  ];

  for (const signal of spanishSignals) if (normalized.includes(signal)) scores.spanish += 1;
  for (const signal of englishSignals) if (normalized.includes(signal)) scores.english += 1;
  for (const signal of portugueseSignals) if (normalized.includes(signal)) scores.portuguese += 1;
  for (const signal of frenchSignals) if (normalized.includes(signal)) scores.french += 1;

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  if (!winner || winner[1] === 0) {
    return "spanish";
  }

  return winner[0] as Exclude<PromptOutputLanguage, "auto">;
}

export class DefaultPromptBuilder implements PromptBuilder {
  build(request: PromptGenerationRequest): PromptGenerationResult {
    const {
      normalizedCvText,
      jobOfferText,
      outputLanguage = "auto",
      selectedTheme = "engineeringclassic",
    } = request;

    const resolvedLanguage =
      outputLanguage === "auto"
        ? detectLanguageFromOffer(jobOfferText)
        : outputLanguage;

    const prompt = [
      "Eres un experto en redacción de CV técnicos y en el esquema oficial de RenderCV.",
      "Tu tarea es devolver ÚNICAMENTE un archivo YAML válido para RenderCV, siempre devolviendolo en bloque de codigo",
      "",
      "REQUISITOS OBLIGATORIOS (SI O SI):",
      "1) La respuesta debe ser SOLO YAML puro, sin bloques markdown, sin explicaciones, sin texto adicional.",
      "2) El YAML debe estar estrictamente en formato compatible con RenderCV.",
      "3) Debe iniciar con la estructura raíz esperada por RenderCV para un CV (por ejemplo sección cv con sus campos).",
      "4) Debe incluir experiencia, educación, habilidades, idiomas y datos de contacto cuando exista información disponible.",
      "5) Si falta información, usar placeholders claros en lugar de inventar datos.",
      "6) Ajusta y prioriza la experiencia relevante para la oferta laboral.",
      `7) TODO el contenido textual del CV debe estar en este idioma objetivo: ${resolvedLanguage}. No mezclar idiomas.`,
      "8) Establece explícitamente locale.language con ese mismo idioma objetivo.",
      "9) NO agregues secciones ni líneas meta de actualización, fecha de modificación o versión. Prohibido incluir textos como: Última actualización, Last updated, Last modified, Updated on, Modified.",
      "10) Debes incluir SIEMPRE un bloque design completo con el template exacto solicitado.",
      "11) Debes incluir SIEMPRE un bloque locale al final del YAML.",
      `12) Para los nombres de las llaves (keys) dentro de 'sections:', si el idioma es español, DEBES usar EXACTAMENTE estas palabras clave comprobadas: 'Resumen Profesional', 'Experiencia Laboral', 'Educación' (NUNCA uses 'Formación Académica'), 'Habilidades Técnicas' e 'Idiomas'. Los campos internos (company, institution, etc.) se mantienen en inglés.`,      "",
      "13) El número de teléfono DEBE usar estrictamente el prefijo URI 'tel:' sin espacios (ejemplo: 'tel:+56998523618').",     
      `IDIOMA OBJETIVO RESUELTO: ${resolvedLanguage}`,
      `TEMPLATE/THEME OBJETIVO: ${selectedTheme}`,
      "",
      "BLOQUE DESIGN OBLIGATORIO:",
      "design:",
      `  theme: ${selectedTheme}`,
      "  page:",
      "    size: a4",
      "    top_margin: 1.2cm",
      "    bottom_margin: 1.2cm",
      "    left_margin: 1.5cm",
      "    right_margin: 1.5cm",
      "    show_footer: false",
      "    show_top_note: false",
      "  section_titles:",
      "    type: with_partial_line",
      "",
      "BLOQUE LOCALE OBLIGATORIO:",
      "locale:",
      `  language: ${resolvedLanguage}`,
      "",
      "INFORMACIÓN BASE DEL CANDIDATO (normalizada):",
      normalizedCvText,
      "",
      "OFERTA LABORAL OBJETIVO:",
      jobOfferText,
      "",
      "SALIDA ESPERADA:",
      "Devuelve ÚNICAMENTE el bloque de código con el YAML final. NO incluyas saludos, despedidas, ni explicaciones antes o después del bloque de código.",
      "siempre devolviendolo en bloque de codigo"
    ].join("\n");

    return { prompt };
  }
}
