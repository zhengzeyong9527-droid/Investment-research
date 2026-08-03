import { readFileSync } from "node:fs";
import path from "node:path";
import { loadDotEnv } from "@/lib/load-env";
import { getDefaultRagService, type RagLicenseStatus } from "@/rag/local-rag";

loadDotEnv();

const args = parseArgs(process.argv.slice(2));

if (args.remove) {
  if (!args.reason) fail("Usage: pnpm rag:ingest --remove <documentId> --reason <reason>");
  await getDefaultRagService().removeDocument(args.remove, args.reason);
  console.log(`Removed RAG document ${args.remove}: ${args.reason}`);
  process.exit(0);
}

if (args.files.length === 0) {
  fail("Usage: pnpm rag:ingest --license-status internal --license-source <source> <file1.md> <file2.txt>");
}
if (!args.licenseStatus || !isLicenseStatus(args.licenseStatus)) {
  fail("RAG ingest requires --license-status authorized|internal|public.");
}
if (!args.licenseSource) {
  fail("RAG ingest requires --license-source so each chunk can be audited.");
}

for (const file of args.files) {
  const absolute = path.resolve(file);
  const content = readFileSync(absolute, "utf8");
  const document = await getDefaultRagService().ingestDocument({
    title: args.title ?? path.basename(file),
    content,
    source: args.source ?? "cli-ingest",
    sourceUrl: args.sourceUrl,
    publishedAt: args.publishedAt ?? null,
    licenseStatus: args.licenseStatus,
    licenseSource: args.licenseSource,
    validFrom: args.validFrom ?? null,
    validUntil: args.validUntil ?? null,
    metadata: { file: absolute },
  });
  console.log(`Ingested ${document.title}: ${document.chunkCount} chunk(s), license=${document.licenseStatus}`);
}

function parseArgs(argv: string[]) {
  const parsed: {
    files: string[];
    licenseStatus?: RagLicenseStatus;
    licenseSource?: string;
    source?: string;
    sourceUrl?: string;
    publishedAt?: string;
    validFrom?: string;
    validUntil?: string;
    title?: string;
    remove?: string;
    reason?: string;
  } = { files: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      parsed.files.push(arg);
      continue;
    }
    const [flag, inlineValue] = arg.split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined) index += 1;
    if (!value) fail(`Missing value for ${flag}.`);
    if (flag === "--license-status") parsed.licenseStatus = value as RagLicenseStatus;
    else if (flag === "--license-source") parsed.licenseSource = value;
    else if (flag === "--source") parsed.source = value;
    else if (flag === "--source-url") parsed.sourceUrl = value;
    else if (flag === "--published-at") parsed.publishedAt = value;
    else if (flag === "--valid-from") parsed.validFrom = value;
    else if (flag === "--valid-until") parsed.validUntil = value;
    else if (flag === "--title") parsed.title = value;
    else if (flag === "--remove") parsed.remove = value;
    else if (flag === "--reason") parsed.reason = value;
    else fail(`Unknown option: ${flag}`);
  }
  return parsed;
}

function isLicenseStatus(value: string): value is RagLicenseStatus {
  return value === "authorized" || value === "internal" || value === "public";
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
  throw new Error(message);
}
