export type Recall = "again" | "partial" | "known";
export type Subject = {
  id: string;
  name: string;
  symbol: string;
  color: string;
  topics: string[];
};
export type Topic = { id: string; subjectId: string; title: string };
export type Reference = {
  id: string;
  title: string;
  url: string;
  accessedAt?: string;
};
export type RevisionCard = {
  id: string;
  subjectId: string;
  topicId: string;
  topic: string;
  title: string;
  prompt?: string;
  facts: string[];
  pearl: string;
  explanation: string;
  seconds: number;
  series: string;
  source?: Reference;
  references: Reference[];
  sample: boolean;
  contentVersion: number;
  createdAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  difficulty: "introductory" | "intermediate" | "advanced" | "unrated";
  tags: string[];
  relatedCardIds: string[];
  visibility: "published" | "draft" | "archived";
  editorialStatus: "unreviewed" | "reviewed";
  priority: number;
};
export type Catalog = {
  subjects: Subject[];
  topics: Topic[];
  cards: RevisionCard[];
};
