import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const entry = resolve(root, "js/main.js");
const outputDir = resolve(root, "dist");
const outputFile = resolve(outputDir, "Gun-Core-Playable.html");

const visited = new Set();
const chunks = [];

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) {
    throw new Error(`Only local imports are supported: ${specifier}`);
  }
  return normalize(resolve(dirname(fromFile), specifier));
}

function collectImports(source) {
  const imports = [];
  const importPattern = /import\s+(?:[\s\S]*?)\s+from\s+["'](.+?)["'];/g;
  let match;
  while ((match = importPattern.exec(source))) imports.push(match[1]);
  return imports;
}

function stripModules(source) {
  return source
    .replace(/import\s+(?:[\s\S]*?)\s+from\s+["'].+?["'];\s*/g, "")
    .replace(/export\s+(?=(const|let|var|function|class)\s)/g, "")
    .replace(/export\s*\{[\s\S]*?\};?\s*/g, "");
}

async function visit(file) {
  const normalized = normalize(file);
  if (visited.has(normalized)) return;
  visited.add(normalized);

  const source = await readFile(normalized, "utf8");
  for (const specifier of collectImports(source)) {
    await visit(resolveImport(normalized, specifier));
  }
  chunks.push(`\n// ===== ${relative(root, normalized).replaceAll("\\", "/")} =====\n${stripModules(source)}\n`);
}

function escapeScript(script) {
  return script.replaceAll("</script", "<\\/script");
}

function createHtml(css, script) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gun Core Demo - Playable</title>
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="root" class="app-shell"></div>
    <script>
(() => {
${escapeScript(script)}
})();
    </script>
  </body>
</html>
`;
}

await visit(entry);
const css = await readFile(join(root, "styles/main.css"), "utf8");
const script = chunks.join("\n");
await mkdir(outputDir, { recursive: true });
await writeFile(outputFile, createHtml(css, script), "utf8");
console.log(`Wrote ${relative(root, outputFile)}`);
