import { readFileSync, existsSync, readdirSync } from "node:fs";
import { parseCatalogUpdate } from "../src/domain/catalog-sync.ts";

try {
  const directory = new URL("../hosting/public/", import.meta.url);
  const files = readdirSync(directory);
  const allowed = ["admin", "health.json", "catalog.json", "preview-catalog.json", "index.html", "support.html", "privacy.html", "site.css", "brand.png"];
  if (files.some(f => !allowed.includes(f)))
    throw new Error("Public hosting contains a file outside the content and publisher-site allowlist");
  const health = JSON.parse(readFileSync(new URL("health.json", directory), "utf8"));
  if (health.service !== "rounds-content" || health.status !== "ok" || health.schemaVersion !== 1)
    throw new Error("Invalid content health check");
  for (const filename of ["catalog.json", "preview-catalog.json"]) {
    const preview = filename === "preview-catalog.json";
    const catalogFile = new URL(filename, directory);
    if (existsSync(catalogFile)) {
      const snapshot = parseCatalogUpdate(JSON.parse(readFileSync(catalogFile, "utf8")), { allowPreview: preview });
      if (preview && snapshot.channel !== "preview") throw new Error("Preview file must identify its channel");
      if (snapshot.kind !== "full") throw new Error("Static Hosting must serve a full catalog");
      if (snapshot.catalog.cards.some(c => c.visibility !== "published" || (c.publishedAt && Date.parse(c.publishedAt) > Date.now())))
        throw new Error("Public files must not include drafts, archived cards or future posts");
      console.log(`Ready to deploy ${snapshot.catalog.cards.length} ${preview ? "preview" : "public"} cards at revision ${snapshot.revision}.`);
    }
  }
  if (!existsSync(new URL("catalog.json", directory)) && !existsSync(new URL("preview-catalog.json", directory))) {
    console.log("Hosting pages and admin dashboard are ready. App content is served from Firestore.");
  }
} catch (error) { console.error(`Hosting deployment blocked: ${error.message}`); process.exitCode = 1; }
