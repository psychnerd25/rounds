import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { draftPost, extractPosts, importArchive } from "./import-instagram.mjs";
test("preserves caption, carousel order, and original data without inventing medical content", () => {
  const raw = {
    media: [
      {
        uri: "media/slide1.jpg",
        title: "Fixture caption",
        creation_timestamp: 1000,
      },
      { uri: "media/slide2.jpg", title: "Fixture caption" },
    ],
  };
  const draft = draftPost(raw, "posts_1.json");
  assert.equal(draft.caption, "Fixture caption");
  assert.equal(draft.media[1].path, "media/slide2.jpg");
  assert.deepEqual(draft.original, raw);
  assert.equal(draft.status, "needs-editorial-review");
  assert.equal(draft.id, draftPost(raw, "posts_2.json").id);
});
test("recognizes arrays and named post containers, rejects unknown structures", () => {
  assert.deepEqual(extractPosts({ ig_posts: [] }), []);
  assert.deepEqual(extractPosts([]), []);
  assert.throws(() => extractPosts({ unknown: [] }));
});
test("imports archive records, reports missing media, and refuses to overwrite drafts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rounds-import-"));
  try {
    await mkdir(join(dir, "content"));
    await writeFile(
      join(dir, "content", "posts_1.json"),
      JSON.stringify([
        { title: "Fixture only", media: [{ uri: "media/missing.jpg" }] },
      ]),
    );
    const output = join(dir, "drafts.json");
    const result = await importArchive(dir, output);
    assert.equal(result.postCount, 1);
    assert.equal(result.warnings.length, 1);
    assert.equal(
      JSON.parse(await readFile(output)).posts[0].caption,
      "Fixture only",
    );
    await assert.rejects(() => importArchive(dir, output), /EEXIST/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
