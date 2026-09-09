import type { Catalog, RevisionCard } from "./content";
import { assertCatalog } from "./catalog-validation.ts";

export type CatalogPolicy = { allowPreview?: boolean };
export type CatalogSnapshot = {
  schemaVersion: 1;
  kind: "full";
  revision: number;
  catalog: Catalog;
  channel?: "reviewed" | "preview" | "public";
};
export type CatalogUpdate = CatalogSnapshot | {
  schemaVersion: 1;
  kind: "delta";
  baseRevision: number;
  revision: number;
  // Complete subject/topic metadata, with only changed/new cards.
  catalog: Catalog;
  removedCardIds: string[];
  channel?: "reviewed" | "preview" | "public";
};
export class CatalogBaseMismatch extends Error {}
const revision = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1;

export function parseCatalogUpdate(value: unknown, policy: CatalogPolicy = {}): CatalogUpdate {
  if (!value || typeof value !== "object") throw new Error("Missing catalog envelope");
  const v = value as CatalogUpdate;
  if (v.schemaVersion !== 1 || !["full", "delta"].includes(v.kind) || !revision(v.revision))
    throw new Error("Invalid catalog envelope");
  if (v.channel !== undefined && !["reviewed", "preview", "public"].includes(v.channel))
    throw new Error("Invalid content channel");
  if (v.channel === "preview" && !policy.allowPreview)
    throw new Error("Preview content is disabled in this build");
  // "public" is the simple five-field catalog used by the released app.
  // The stricter "reviewed" channel remains available if an editorial workflow
  // is introduced later, without forcing those extra fields into today's editor.
  assertCatalog(v.catalog, { requireReviewed: v.channel === "reviewed" });
  if (v.kind === "delta" && (!revision(v.baseRevision) || v.revision <= v.baseRevision ||
    !Array.isArray(v.removedCardIds) || !v.removedCardIds.every(id => typeof id === "string" && !!id.trim()) ||
    new Set(v.removedCardIds).size !== v.removedCardIds.length ||
    v.removedCardIds.some(id => v.catalog.cards.some(c => c.id === id))))
    throw new Error("Invalid catalog delta");
  return v;
}

// Publishing metadata can change without resetting learning. Teaching edits
// must increase contentVersion so an old answer cannot assess new material.
const teaching = (c: RevisionCard) => JSON.stringify([
  c.subjectId, c.topicId, c.topic, c.title, c.prompt, c.facts, c.pearl, c.explanation,
]);

export function mergeCatalogUpdate(current: CatalogSnapshot | null, payload: unknown, policy: CatalogPolicy = {}): CatalogSnapshot {
  const update = parseCatalogUpdate(payload, policy);
  if (current && update.revision < current.revision) throw new Error("Stale catalog revision");
  if (current && update.revision === current.revision) return current;
  if (update.kind === "delta" && (!current || update.baseRevision !== current.revision))
    throw new CatalogBaseMismatch("A full catalog is required");
  const oldCards = new Map(current?.catalog.cards.map(c => [c.id, c]));
  for (const card of update.catalog.cards) {
    const old = oldCards.get(card.id);
    if (old && (card.contentVersion < old.contentVersion ||
      (card.contentVersion === old.contentVersion && teaching(card) !== teaching(old))))
      throw new Error(`Card ${card.id} needs a newer contentVersion`);
  }
  let catalog = update.catalog;
  if (update.kind === "delta") {
    for (const id of update.removedCardIds) oldCards.delete(id);
    for (const card of update.catalog.cards) oldCards.set(card.id, card);
    catalog = { ...catalog, cards: [...oldCards.values()] };
  }
  assertCatalog(catalog, { requireReviewed: update.channel === "reviewed" });
  return {
    schemaVersion: 1,
    kind: "full",
    revision: update.revision,
    catalog,
    ...(update.channel ? { channel: update.channel } : {}),
  };
}
