import type { Catalog } from "./content";
const record = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && !!value.trim();
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);
const date = (value: unknown) => value === null || (text(value) && Number.isFinite(Date.parse(value)));
const reference = (value: unknown) => {
  if (!record(value) || !text(value.id) || !text(value.title) || !text(value.url)) return false;
  try {
    const url = new URL(value.url);
    return ["http:", "https:"].includes(url.protocol) && !!url.hostname &&
      (value.accessedAt === undefined || (text(value.accessedAt) && date(value.accessedAt)));
  } catch { return false; }
};

// A repository may return network JSON. Validate every field the UI relies on,
// including entity relationships, before letting that payload reach a screen.
export function assertCatalog(value: unknown, options: { requireReviewed?: boolean } = {}): Catalog {
  if (!record(value) || !Array.isArray(value.cards) || !Array.isArray(value.subjects) || !Array.isArray(value.topics))
    throw new Error("Invalid content catalog");
  const subjects = new Set<string>();
  for (const subject of value.subjects) {
    if (!record(subject) || !text(subject.id) || subjects.has(subject.id) ||
      !text(subject.name) || !text(subject.symbol) || !text(subject.color) || !strings(subject.topics))
      throw new Error("Invalid catalog subject");
    subjects.add(subject.id);
  }
  const topics = new Map<string, string>();
  for (const topic of value.topics) {
    if (!record(topic) || !text(topic.id) || topics.has(topic.id) ||
      !subjects.has(topic.subjectId) || !text(topic.title)) throw new Error("Invalid catalog topic");
    topics.set(topic.id, topic.subjectId);
  }
  const ids = new Set<string>();
  for (const card of value.cards) {
    if (!record(card) || !text(card.id) || ids.has(card.id) || !subjects.has(card.subjectId) ||
      topics.get(card.topicId) !== card.subjectId || !text(card.topic) || !text(card.title) ||
      (card.prompt !== undefined && !text(card.prompt)) ||
      !strings(card.facts) || !card.facts.length || !text(card.pearl) || !text(card.explanation) ||
      !text(card.series) || typeof card.sample !== "boolean" ||
      !Number.isSafeInteger(card.contentVersion) || card.contentVersion < 1 ||
      !Number.isFinite(card.seconds) || card.seconds <= 0 ||
      !Number.isFinite(card.priority) || card.priority < 0 || card.priority > 1 ||
      !["introductory", "intermediate", "advanced", "unrated"].includes(card.difficulty) ||
      !["published", "draft", "archived"].includes(card.visibility) ||
      !["unreviewed", "reviewed"].includes(card.editorialStatus) ||
      !strings(card.tags) || !strings(card.relatedCardIds) ||
      !Array.isArray(card.references) || !card.references.every(reference) ||
      (card.source !== undefined && !reference(card.source)) ||
      ![card.createdAt, card.updatedAt, card.publishedAt].every(date))
      throw new Error("Invalid catalog card");
    if (options.requireReviewed && card.visibility === "published" &&
      (card.editorialStatus !== "reviewed" || !card.references.length || !card.publishedAt))
      throw new Error(`Card ${card.id} needs editorial review, references and a publication date`);
    ids.add(card.id);
  }
  return value as Catalog;
}
