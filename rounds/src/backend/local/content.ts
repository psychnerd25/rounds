import raw from "./catalog.json";
import type { Catalog, RevisionCard } from "../../domain/content";
import type { ContentRepository } from "../../services/contracts";
// Workbook dates and editorial sign-off are unknown; do not fabricate them.
const cards = raw.cards as RevisionCard[];
const catalog: Catalog = {
  subjects: raw.subjects,
  cards,
  topics: [...new Map(cards.map((c) => [c.topicId, {
    id: c.topicId,
    subjectId: c.subjectId,
    title: c.topic,
  }])).values()],
};
export const localContentRepository: ContentRepository = {
  async load() {
    return catalog;
  },
};
export const listCards = () => catalog.cards;
export const listSubjects = () => catalog.subjects;
