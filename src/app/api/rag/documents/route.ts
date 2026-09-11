import { NextResponse } from "next/server";
import { checkRateLimit, requireAppAuth } from "@/lib/api-security";
import { getDefaultRagService } from "@/rag/local-rag";
import { parseRagDocumentType } from "@/rag/chunkers/structured-chunker";

export const dynamic = "force-dynamic";

export async function GET() {
  const documents = await getDefaultRagService().listDocuments();
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const auth = requireAppAuth(request);
  if (auth) return auth;
  const limited = checkRateLimit(request, "rag-documents", { limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const title = stringValue(body.title);
  const content = stringValue(body.content);
  if (!title || !content) {
    return NextResponse.json({ code: "BAD_REQUEST", message: "title and content are required." }, { status: 400 });
  }
  const documentType = body.documentType === undefined ? undefined : parseRagDocumentType(body.documentType);
  if (body.documentType !== undefined && !documentType) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "documentType must be generic, news, announcement, or research-report." },
      { status: 400 }
    );
  }
  const document = await getDefaultRagService().ingestDocument({
    title,
    content,
    documentType: documentType ?? undefined,
    source: stringValue(body.source) || "api-upload",
    publishedAt: stringValue(body.publishedAt) || null,
    metadata: metadataValue(body.metadata),
  });
  return NextResponse.json({ document });
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function metadataValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string | number | boolean | null>) : {};
}
