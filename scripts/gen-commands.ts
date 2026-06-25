#!/usr/bin/env bun
// gen-commands.ts — stitch preamble sections into command templates, then
// emit both a slash-command file and a Skill directory from each.
//
// Usage:
//   bun scripts/gen-commands.ts
//
// Reads commands/*.md.tmpl, replaces {{PREAMBLE:<name>}} with the contents
// of preamble/<name>.md, then writes:
//
//   dist/commands/<name>.md             (slash-command, explicit trigger)
//   dist/skills/<name>/SKILL.md         (skill, auto-invocable)
//
// The skill variant inherits the template's description frontmatter and
// adds a `name:` field so Claude can pick it by description match.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CMD_DIR = join(ROOT, "commands");
const PREAMBLE_DIR = join(ROOT, "preamble");
const DIST_DIR = join(ROOT, "dist");
const DIST_COMMANDS = join(DIST_DIR, "commands");
const DIST_SKILLS = join(DIST_DIR, "skills");

const PREAMBLE_RE = /\{\{PREAMBLE:([a-z0-9-]+)\}\}/g;
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function loadPreamble(name: string): string {
  const path = join(PREAMBLE_DIR, `${name}.md`);
  if (!existsSync(path)) {
    throw new Error(`preamble not found: ${name} (looked at ${path})`);
  }
  return readFileSync(path, "utf8").trim();
}

function render(tmpl: string): string {
  return tmpl.replace(PREAMBLE_RE, (_, name) => loadPreamble(name));
}

function parseFrontmatter(src: string): { frontmatter: string; body: string } {
  const m = src.match(FRONTMATTER_RE);
  if (!m) return { frontmatter: "", body: src };
  return { frontmatter: m[1], body: m[2] };
}

function extractDescription(frontmatter: string): string {
  const m = frontmatter.match(/^description:\s*(.+)$/m);
  if (!m) throw new Error("template missing `description:` frontmatter");
  return m[1].trim();
}

function emitCommand(name: string, src: string) {
  const dir = DIST_COMMANDS;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.md`), src);
}

function emitSkill(name: string, src: string, description: string) {
  const dir = join(DIST_SKILLS, name);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const { body } = parseFrontmatter(src);
  const skillFrontmatter = `---\nname: ${name}\ndescription: ${description}\n---\n`;
  writeFileSync(join(dir, "SKILL.md"), skillFrontmatter + body);
}

function main() {
  if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true });

  const templates = readdirSync(CMD_DIR).filter((f) => f.endsWith(".md.tmpl"));
  if (templates.length === 0) {
    console.error("no templates found in commands/");
    process.exit(1);
  }

  for (const file of templates) {
    const tmpl = readFileSync(join(CMD_DIR, file), "utf8");
    const rendered = render(tmpl);
    const name = basename(file, ".md.tmpl");
    const { frontmatter } = parseFrontmatter(rendered);
    const description = extractDescription(frontmatter);

    emitCommand(name, rendered);
    emitSkill(name, rendered, description);

    console.log(`  ${file} -> commands/${name}.md + skills/${name}/SKILL.md  (${rendered.length} chars)`);
  }

  console.log(`\ngenerated ${templates.length} command(s) and skill(s) into dist/`);
}

main();
