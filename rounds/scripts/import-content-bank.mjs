import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const exec = promisify(execFile);
const rotations = {
  "Internal Medicine Floors": {
    id: "internal-medicine",
    symbol: "⊞",
    color: "#6F8870",
  },
  "Cardiology / Cardiac ICU": {
    id: "cardiology-icu",
    symbol: "♡",
    color: "#AB6456",
  },
  "Neurology Floors": { id: "neurology", symbol: "◎", color: "#8B789A" },
  "Infectious Disease Elective": {
    id: "infectious-disease",
    symbol: "✳",
    color: "#648E8A",
  },
  "General Surgery": { id: "general-surgery", symbol: "✚", color: "#B48B50" },
  "Emergency Medicine": {
    id: "emergency-medicine",
    symbol: "⚕",
    color: "#527C85",
  },
};

function decode(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function parseContentBankXml(xml) {
  const rows = [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map(
    (row) => {
      const cells = {};
      for (const cell of row[1].matchAll(
        /<c\s+r="([A-Z]+)\d+"[^>]*>([\s\S]*?)<\/c>/g,
      ))
        cells[cell[1]] = decode(cell[2]);
      return cells;
    },
  );
  const records = rows.slice(1).map((row) => ({
    subject: row.A,
    title: row.B,
    question: row.C,
    management: row.D,
    pearl: row.E,
  }));
  if (
    !records.length ||
    records.some((record) => Object.values(record).some((value) => !value))
  )
    throw new Error("The content bank needs values in every column.");
  return records;
}

export function toCatalog(records, previous = { cards: [] }) {
  const usedRotations = [...new Set(records.map((record) => record.subject))];
  const unknown = usedRotations.filter((rotation) => !rotations[rotation]);
  if (unknown.length)
    throw new Error(`Unknown rotations: ${unknown.join(", ")}`);
  return {
    subjects: usedRotations.map((name) => ({
      ...rotations[name],
      name,
      topics: records
        .filter((record) => record.subject === name)
        .map((record) => record.title),
    })),
    cards: records.map((record) => {
      // Preserve existing IDs on title edits if the prompt still identifies the same record.
      // Editing BOTH requires an explicit ID column or editorial alias before reimport.
      const matches = previous.cards.filter(
        (c) => c.title === record.title || c.prompt === record.question,
      );
      if (matches.length > 1)
        throw new Error(`Ambiguous existing card: ${record.title}`);
      const existing = matches[0];
      const id =
        existing?.id ?? `${rotations[record.subject].id}-${slug(record.title)}`;
      const changed =
        existing &&
        (existing.title !== record.title ||
          existing.prompt !== record.question ||
          existing.facts.join(" ") !== record.management ||
          existing.pearl !== record.pearl);
      return {
        ...existing,
        id,
        topicId: existing?.topicId ?? `topic:${id}`,
        subjectId: rotations[record.subject].id,
        topic: record.title,
        title: record.title,
        prompt: record.question,
        facts: [record.management],
        pearl: record.pearl,
        explanation: record.management,
        seconds: Math.max(
          20,
          Math.ceil(
            ((
              record.question +
              " " +
              record.management +
              " " +
              record.pearl
            ).split(/\s+/).length /
              180) *
              60,
          ),
        ),
        series: "Clinical decision",
        sample: false,
        references: existing?.references ?? [],
        contentVersion: (existing?.contentVersion ?? 1) + (changed ? 1 : 0),
        createdAt: existing?.createdAt ?? null,
        publishedAt: existing?.publishedAt ?? null,
        updatedAt: existing?.updatedAt ?? null,
        difficulty: existing?.difficulty ?? "unrated",
        tags: existing?.tags ?? [],
        relatedCardIds: existing?.relatedCardIds ?? [],
        visibility: existing?.visibility ?? "published",
        editorialStatus: changed
          ? "unreviewed"
          : (existing?.editorialStatus ?? "unreviewed"),
        priority: existing?.priority ?? 0,
      };
    }),
  };
}

export async function importContentBank(input, output) {
  const { stdout } = await exec("unzip", [
    "-p",
    input,
    "xl/worksheets/sheet1.xml",
  ]);
  const previous = await readFile(output, "utf8")
    .then(JSON.parse)
    .catch((error) => {
      if (error.code === "ENOENT") return { cards: [] };
      throw error;
    });
  const catalog = toCatalog(parseContentBankXml(stdout), previous);
  if (new Set(catalog.cards.map((c) => c.id)).size !== catalog.cards.length)
    throw new Error("Duplicate card IDs");
  await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`);
  return catalog;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const input = resolve(process.argv[2] ?? "../rounds-content-bank.xlsx");
  const output = resolve(process.argv[3] ?? "src/backend/local/catalog.json");
  const catalog = await importContentBank(input, output);
  console.log(
    `Imported ${catalog.cards.length} cards across ${catalog.subjects.length} rotations.`,
  );
}
