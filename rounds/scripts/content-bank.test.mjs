import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parseContentBankXml, toCatalog } from "./import-content-bank.mjs";

test("the content bank maps every row into a clinical card", async () => {
  const xml = await readFile(new URL("./fixtures/content-bank.xlsx", import.meta.url));
  assert.ok(xml.length > 0);
  const { stdout } = await import("node:child_process").then(
    ({ execFile }) => new Promise((resolve, reject) => execFile("unzip", ["-p", new URL("./fixtures/content-bank.xlsx", import.meta.url).pathname, "xl/worksheets/sheet1.xml"], (error, stdout) => error ? reject(error) : resolve({ stdout }))),
  );
  const catalog = toCatalog(parseContentBankXml(stdout));
  assert.equal(catalog.cards.length, 30);
  assert.equal(catalog.subjects.length, 6);
  assert.ok(catalog.cards.every((card) => card.prompt && card.facts[0] && card.pearl));
});
