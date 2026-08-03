import { createAgentApiError } from "@/lib/agent-api-errors";
import { withApiSecurity } from "@/lib/api-security";
import { getAgentRun } from "@/lib/repositories";

const TERMINAL = new Set(["completed", "failed", "interrupted"]);

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const security = withApiSecurity(request);
  if (security) return security;
  const { id } = await params;
  const encoder = new TextEncoder();
  let lastPayload = "";
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
          // The stream may already be closed by a terminal event.
        }
      }

      request.signal.addEventListener("abort", close);

      async function push() {
        if (closed) return;
        let run;
        try {
          run = await getAgentRun(id);
        } catch (error) {
          const { payload } = createAgentApiError(error, "Agent run events failed", 500);
          controller.enqueue(encoder.encode(`event: failed\ndata: ${JSON.stringify(payload)}\n\n`));
          close();
          return;
        }
        if (!run) {
          controller.enqueue(encoder.encode(`event: failed\ndata: ${JSON.stringify({ error: "Agent run not found" })}\n\n`));
          close();
          return;
        }
        const payload = JSON.stringify(run);
        if (payload !== lastPayload) {
          lastPayload = payload;
          controller.enqueue(encoder.encode(`event: update\ndata: ${payload}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        }
        if (TERMINAL.has(String(run.status))) {
          controller.enqueue(encoder.encode(`event: ${run.status}\ndata: ${payload}\n\n`));
          close();
          return;
        }
        timer = setTimeout(push, 1000);
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
