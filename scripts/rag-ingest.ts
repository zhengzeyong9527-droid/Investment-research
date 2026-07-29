import { readFileSync } from "node:fs";
import path from "node:path";
import { loadDotEnv } from "@/lib/load-env";
import { getDefaultRagService } from "@/rag/local-rag";

loadDotEnv();

const files = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (files.length === 0) {
  console.error("Usage: pnpm rag:ingest <file1.md> <file2.txt>");
  process.exit(1);
}

for (const file of files) {
  const absolute = path.resolve(file);
  const content = readFileSync(absolute, "utf8");
  const document = await getDefaultRagService().ingestDocument({
    title: path.basename(file),
    content,
    source: "cli-ingest",
    metadata: { file: absolute },
  });
  console.log(`Ingested ${document.title}: ${document.chunkCount} chunk(s)`);
}
