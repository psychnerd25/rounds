import { readFileSync } from "node:fs";
import { assertCatalog } from "../src/domain/catalog-validation.ts";
import { parseCatalogUpdate } from "../src/domain/catalog-sync.ts";
import { contentPayload } from "../src/backend/remote/content-payload.ts";

const problems = [];
const raw = JSON.parse(readFileSync(new URL("../src/backend/local/catalog.json", import.meta.url)));
const catalog = {
  ...raw,
  topics: [...new Map(raw.cards.map((c) => [
    c.topicId,
    { id: c.topicId, subjectId: c.subjectId, title: c.topic },
  ])).values()],
};

try {
  assertCatalog(catalog);
} catch (error) {
  problems.push(`Bundled content: ${error.message}`);
}

const endpoint = process.env.EXPO_PUBLIC_CONTENT_API_URL?.trim();
let url;
try {
  if (!endpoint) throw Error("Set EXPO_PUBLIC_CONTENT_API_URL to the public HTTPS catalog");
  url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password)
    throw Error("Use a public HTTPS content URL");
  if (process.env.EXPO_PUBLIC_PREVIEW_CONTENT_API_URL?.trim())
    throw Error("Clear the preview content URL in production");
} catch (error) {
  problems.push(`Content configuration: ${error.message}`);
}

if (url && !problems.length) {
  try {
    const response = await fetch(url, {
      credentials: "omit",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const snapshot = parseCatalogUpdate(contentPayload(await response.json()));
    if (snapshot.kind !== "full" || !snapshot.catalog.cards.length)
      throw Error("Public catalog must be a nonempty full snapshot");
  } catch (error) {
    problems.push(`Live public catalog: ${error.message}`);
  }
}

if (problems.length) {
  console.error("Production content check failed:\n" + problems.map((p) => `- ${p}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Production content checks passed.");
}
