# CV Automator con RenderCV

App en Next.js para automatizar tu flujo manual de CV:

1. Cargar CV en `YAML`, `texto` o `PDF` y normalizarlo en formato legible.
2. Pegar una oferta laboral.
3. Generar un prompt estricto para que cualquier IA devuelva **solo YAML compatible con RenderCV**.
4. Pegar/cargar ese YAML y renderizar un PDF con `RenderCV`, con vista previa y descarga.

## Requisitos

- Node.js 20+
- Python 3.10+
- Un entorno virtual local para Python

## Preparar RenderCV local

Desde la carpeta raíz `cv-generator`:

```bash
python3.12 -m venv .venv
./.venv/bin/python -m pip install "rendercv[full]" pypdf
```

Verifica instalación:

```bash
./.venv/bin/rendercv --version
```

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Arquitectura (separación tipo SOLID)

- `src/domain`: modelos y contratos (interfaces).
- `src/application`: casos de uso.
- `src/infrastructure`: implementaciones concretas (parsers, RenderCV CLI).
- `src/presentation`: componentes de UI.
- `src/app/api`: endpoints HTTP.

## Endpoints

- `POST /api/cv/normalize`: normaliza CV de YAML/texto/PDF.
- `POST /api/prompt/generate`: genera prompt estricto para RenderCV.
- `POST /api/rendercv/build`: ejecuta RenderCV y devuelve PDF en base64.

## Notas importantes

- Esta app **no llama modelos de IA**: solo genera el prompt.
- La app prioriza `../.venv/bin/rendercv` y `../.venv/bin/python` antes de intentar usar binarios globales.
- La lectura de PDFs usa `pypdf` dentro del entorno virtual local para evitar problemas de workers de `pdf.js` en Next.js.
