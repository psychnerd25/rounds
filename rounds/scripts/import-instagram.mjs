/** Import an owner's unzipped Instagram JSON archive into local editorial drafts.
 * Nothing is fetched, published, or added to the live medical catalog.
 */
import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
export function extractPosts(value) {
  if (Array.isArray(value)) return value;
  for (const key of ["ig_posts", "posts", "ig_reels_media", "reels"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  throw new Error(
    "Unrecognized archive structure; inspect this JSON file before importing.",
  );
}
export function draftPost(record, sourceFile, owner = "dailydose.md_") {
  const media = Array.isArray(record.media) ? record.media : [];
  const captions = [
    ...new Set(
      [record.title, ...media.map((item) => item.title)].filter(
        (t) => typeof t === "string" && t.trim(),
      ),
    ),
  ];
  const timestamp = record.creation_timestamp ?? media[0]?.creation_timestamp;
  return {
    id: `instagram-${createHash("sha256").update(JSON.stringify(record)).digest("hex").slice(0, 16)}`,
    owner,
    status: "needs-editorial-review",
    sourceFile,
    caption: captions.join("\n\n"),
    publishedAt: Number.isFinite(timestamp)
      ? new Date(timestamp * 1000).toISOString()
      : null,
    // Keep carousel ordering. Text contained in images still needs transcription/OCR and review.
    media: media.map((item) => ({
      path: typeof item.uri === "string" ? item.uri : null,
      caption: item.title || "",
      timestamp: item.creation_timestamp ?? null,
    })),
    original: record,
  };
}
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? walk(resolve(directory, entry.name))
        : entry.isFile()
          ? [resolve(directory, entry.name)]
          : [],
    ),
  );
  return nested.flat();
}
export async function importArchive(directory, output) {
  const root = resolve(directory);
  const files = (await walk(root))
    .filter((file) =>
      /(?:^|[/\\])(?:posts(?:_\d+)?|reels(?:_\d+)?)\.json$/i.test(file),
    )
    .sort();
  if (!files.length)
    throw new Error(
      "No posts/reels JSON files found. Request a JSON export with posts and media, then unzip it first.",
    );
  const drafts = new Map(),
    warnings = [];
  for (const file of files) {
    const records = extractPosts(JSON.parse(await readFile(file, "utf8")));
    for (const record of records) {
      if (!record || typeof record !== "object")
        throw new Error(`Invalid post in ${relative(root, file)}`);
      const draft = draftPost(record, relative(root, file));
      for (const item of draft.media) {
        if (!item.path) {
          warnings.push(`${draft.id}: media URI missing`);
          continue;
        }
        const absolute = resolve(root, item.path);
        if (!absolute.startsWith(root + sep))
          throw new Error(`Media path outside archive: ${item.path}`);
        try {
          await access(absolute);
        } catch {
          warnings.push(`${draft.id}: media not found: ${item.path}`);
        }
      }
      drafts.set(draft.id, draft);
    }
  }
  const result = {
    version: 1,
    owner: "dailydose.md_",
    importedAt: new Date().toISOString(),
    sourceFiles: files.map((file) => relative(root, file)),
    postCount: drafts.size,
    warnings,
    posts: [...drafts.values()],
  };
  // Exclusive creation avoids silently overwriting an edited draft collection.
  await writeFile(resolve(output), JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
  });
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [, , directory, output] = process.argv;
  if (!directory || !output) {
    console.error(
      "Usage: node scripts/import-instagram.mjs <unzipped-export-directory> <new-drafts.json>",
    );
    process.exitCode = 1;
  } else
    importArchive(directory, output)
      .then((result) =>
        console.log(
          `Imported ${result.postCount} editorial drafts from ${result.sourceFiles.length} files. ${result.warnings.length} media warnings. No live cards changed.`,
        ),
      )
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
}
