export type { Recall, RevisionCard, Subject } from "../backend/models";
import { listCards, listSubjects } from "../backend/local/content";

export const cards = listCards();
export const subjects = listSubjects();
