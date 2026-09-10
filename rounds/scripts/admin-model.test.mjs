import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { catalogWithCards, deleteCard } from '../admin/model.ts';

const raw = JSON.parse(readFileSync(new URL('../src/backend/local/catalog.json', import.meta.url)));

test('admin deletion removes the card, its topic metadata, and approval without damaging the subject', () => {
  const catalog = catalogWithCards(raw.subjects, raw.cards);
  const target = catalog.cards[0];
  const workspace = {
    catalog,
    approvals: {
      [target.id]: { by: 'editor@example.com', at: '2026-09-10T00:00:00.000Z', contentVersion: target.contentVersion },
    },
  };

  const next = deleteCard(workspace, target.id);

  assert.equal(next.catalog.cards.some(card => card.id === target.id), false);
  assert.equal(next.catalog.topics.some(topic => topic.id === target.topicId), false);
  assert.equal(target.id in next.approvals, false);
  assert.equal(next.catalog.subjects.some(subject => subject.id === target.subjectId), true);
  assert.equal(workspace.catalog.cards.some(card => card.id === target.id), true);
});

test('admin deletion refuses an unknown card id', () => {
  const workspace = { catalog: catalogWithCards(raw.subjects, raw.cards), approvals: {} };
  assert.throws(() => deleteCard(workspace, 'missing-card'), /Card not found/);
});
