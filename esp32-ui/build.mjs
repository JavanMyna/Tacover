#!/usr/bin/env node
/*
 * Build esp32-ui/index_html.h from esp32-ui/index.html.
 *
 * No dependencies. It conservatively strips comments and redundant whitespace,
 * gzips the result with node:zlib at level 9, and emits a PROGMEM byte array
 * that the ESP32 web server can send with:
 *
 *   server.sendHeader("Content-Encoding", "gzip");
 *   server.send_P(200, "text/html", (const char*)INDEX_HTML_GZ, INDEX_HTML_GZ_LEN);
 *
 * Run:  node esp32-ui/build.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "index.html");
const OUT = join(HERE, "index_html.h");

/**
 * Remove JS comments without touching string or template-literal contents.
 * Assumes the source contains no regex literals (index.html uses none), so a
 * string-aware scan is enough. Newlines are preserved for ASI safety.
 */
function stripJsComments(src) {
  let out = "", i = 0, quote = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") { out += src[i + 1] ?? ""; i += 2; continue; }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i += 1; continue; }
    if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i += 1; continue; }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/** Collapse a CSS block: drop comments and the whitespace around punctuation. */
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*([{};:,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse a JS block: drop comments, indentation and blank lines. */
function minifyJs(js) {
  return stripJsComments(js)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Conservative whole-file minify. Exported so the build can be self-checked. */
export function minify(html) {
  return html
    .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/i, (_m, a, css, b) => a + minifyCss(css) + b)
    .replace(/(<script[^>]*>)([\s\S]*?)(<\/script>)/i, (_m, a, js, b) => a + minifyJs(js) + b)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Format bytes as a C array literal, 12 bytes per line. */
function toCArray(bytes) {
  const lines = [];
  for (let i = 0; i < bytes.length; i += 12) {
    const chunk = [];
    for (const b of bytes.subarray(i, i + 12)) chunk.push("0x" + b.toString(16).padStart(2, "0"));
    lines.push("  " + chunk.join(", ") + ",");
  }
  return lines.join("\n");
}

/** Build everything in memory: { html, gz, rawBytes, gzBytes }. */
export function build() {
  const html = minify(readFileSync(SRC, "utf8"));
  const rawBytes = Buffer.byteLength(html, "utf8");
  const gz = gzipSync(Buffer.from(html, "utf8"), { level: 9 });
  return { html, gz, rawBytes, gzBytes: gz.length };
}

function main() {
  const { gz, rawBytes, gzBytes } = build();
  const header =
    "#pragma once\n" +
    "#include <stddef.h>\n" +
    "#include <stdint.h>\n" +
    "#ifndef PROGMEM\n" +
    "#define PROGMEM\n" +
    "#endif\n" +
    "// raw: " + rawBytes + " bytes, gzip: " + gzBytes + " bytes\n" +
    "const uint8_t INDEX_HTML_GZ[] PROGMEM = {\n" +
    toCArray(gz) + "\n" +
    "};\n" +
    "const size_t INDEX_HTML_GZ_LEN = " + gzBytes + ";\n";
  writeFileSync(OUT, header);
  console.log("wrote " + OUT);
  console.log("  raw : " + rawBytes + " bytes");
  console.log("  gzip: " + gzBytes + " bytes");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
