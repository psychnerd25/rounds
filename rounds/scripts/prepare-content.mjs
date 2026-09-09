import { readFileSync, mkdirSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { assertCatalog } from "../src/domain/catalog-validation.ts";
import { mergeCatalogUpdate } from "../src/domain/catalog-sync.ts";

export function preparePublishedContent(raw, revision, previous = null, now = new Date(), { preview = false } = {}) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Revision must be a positive integer");
  if (previous && revision <= previous.revision) throw new Error("Increase the catalog revision before publishing");
  const source = structuredClone(raw.catalog ?? raw);
  if (!Array.isArray(source.cards)) throw new Error("Source must contain a card catalog");
  const normalized = { ...source, topics: source.topics ?? [...new Map(source.cards.map(c =>
    [c.topicId, { id: c.topicId, subjectId: c.subjectId, title: c.topic }])).values()] };
  assertCatalog(normalized);
  // Never include drafts, archived material or scheduled posts in public files.
  const cards = normalized.cards.filter(c => c.visibility === "published" &&
    (!c.publishedAt || Date.parse(c.publishedAt) <= now.getTime()));
  if (!cards.length) throw new Error("No published cards ready. Keep health.json for the initial connection check.");
  const topics = normalized.topics.filter(t => cards.some(c => c.topicId === t.id));
  const subjects = normalized.subjects.filter(s => cards.some(c => c.subjectId === s.id)).map(s =>
    ({ ...s, topics: [...new Set(topics.filter(t => t.subjectId === s.id).map(t => t.title))] }));
  const published = assertCatalog({ subjects, topics, cards }, { requireReviewed: !preview });
  return mergeCatalogUpdate(previous, { schemaVersion: 1, kind: "full", revision, catalog: published,
    ...(preview ? { channel: "preview" } : {}) }, { allowPreview: preview });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const preview = process.argv.includes("--preview");
    const [revisionArg, sourceArg] = process.argv.slice(2).filter(arg => arg !== "--preview");
    if (!revisionArg) throw new Error("Usage: npm run content:prepare -- REVISION [SOURCE_JSON]");
    const source = resolve(sourceArg ?? resolve(root, "src/backend/local/catalog.json"));
    const output = resolve(root, preview ? "hosting/public/preview-catalog.json" : "hosting/public/catalog.json");
    const previous = existsSync(output) ? JSON.parse(readFileSync(output, "utf8")) : null;
    const snapshot = preparePublishedContent(JSON.parse(readFileSync(source, "utf8")), Number(revisionArg), previous, new Date(), { preview });
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(`${output}.tmp`, `${JSON.stringify(snapshot, null, 2)}\n`);
    renameSync(`${output}.tmp`, output);
    console.log(`Prepared revision ${snapshot.revision}: ${snapshot.catalog.cards.length} ${preview ? "development preview" : "reviewed"} cards in ${output}`);
    console.log("Nothing has been deployed. Review the generated file before deploying Hosting.");
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
