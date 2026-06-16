import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const scanDirs = ["data", "js", "modules", "ui", "styles", "docs", "context"];
const textExtensions = new Set([".js", ".mjs", ".css", ".html", ".md"]);
const jsExtensions = new Set([".js", ".mjs"]);
const mojibakePatterns = [
  /\uFFFD/,
  /绗\?/,
  /€俙/,
  /璧勯噾/,
  /鍩哄湴/,
  /鎵瑰噯/,
  /闅愮/,
  /濂戠害/,
];

const files = scanDirs.flatMap((dir) => walk(join(root, dir))).filter((file) => textExtensions.has(extname(file)));
const failures = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const rel = relative(root, file);
  const hit = mojibakePatterns.find((pattern) => pattern.test(text));
  if (hit) failures.push(`${rel}: possible mojibake matched ${hit}`);
}

for (const file of files.filter((file) => jsExtensions.has(extname(file)))) {
  try {
    execFileSync("node", ["--check", file], { stdio: "pipe" });
  } catch (error) {
    failures.push(`${relative(root, file)}: JavaScript syntax check failed\n${error.stderr?.toString() ?? error.message}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log(`Source verification passed: ${files.length} files checked.`);

function walk(dir) {
  try {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      const stat = statSync(path);
      return stat.isDirectory() ? walk(path) : [path];
    });
  } catch {
    return [];
  }
}
