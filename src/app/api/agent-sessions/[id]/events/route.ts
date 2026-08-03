import { createAgentApiError } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { getAgentSessionDetail } from "@/lib/repositories";

const TERMINAL = new Set(["completed", "failed", "interrupted"]);

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const security = withApiSecurity(request);
  if (security) return security;
  const { id } = await params;
  const encoder = new TextEncoder();
  let lastSessionPayload = "";
  let lastMarkdown = "";
  let watchedRunId: string | null = null;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      function close() {
        closed = true;
        if (timer) clearTimeout(timer);
        try {
          controller.close();
        } catch {
          // The client may already have closed the stream.
        }
      }

      function emit(event: string, payload: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
      }

      request.signal.addEventListener("abort", close);

      async function push() {
        if (closed) return;
        let session;
        try {
          session = await getAgentSessionDetail(id);
        } catch (error) {
          const { payload } = createAgentApiError(error, "Agent session events failed", 500);
          emit("failed", payload);
          close();
          return;
        }
        if (!session) {
          emit("failed", { error: "Agent session not found" });
          close();
          return;
        }

        const latestRun = session.activeRun ?? session.runs[0] ?? null;
        if (latestRun?.id !== watchedRunId) {
          watchedRunId = latestRun?.id ?? null;
          lastMarkdown = "";
        }
        const markdown = latestRun?.outputMarkdown ?? "";
        if (markdown.length > lastMarkdown.length) {
          emit("token", {
            runId: latestRun?.id,
            token: markdown.slice(lastMarkdown.length),
            markdown,
          });
          lastMarkdown = markdown;
        }

        const payload = JSON.stringify(session);
        if (payload !== lastSessionPayload) {
          lastSessionPayload = payload;
          emit("update", session);
        } else {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        }

        if (latestRun && TERMINAL.has(String(latestRun.status))) {
          emit(String(latestRun.status), session);
          close();
          return;
        }
        timer = setTimeout(push, 500);
      }

      await push();
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
