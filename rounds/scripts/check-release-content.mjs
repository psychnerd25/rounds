import { readFileSync } from "node:fs";
import { assertCatalog } from "../src/domain/catalog-validation.ts";
const raw = JSON.parse(readFileSync(new URL("../src/backend/local/catalog.json", import.meta.url)));
const catalog = { ...raw, topics: [...new Map(raw.cards.map(c => [c.topicId, { id: c.topicId, subjectId: c.subjectId, title: c.topic }])).values()] };
try {
  assertCatalog(catalog, { requireReviewed: true });
  console.log("Release content checks passed. Editorial sign-off still requires a human reviewer.");
} catch (error) {
  console.error(`Release content blocked: ${error.message}`);
  process.exitCode = 1;
}
