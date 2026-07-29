import { NextResponse } from "next/server";
import { agentApiErrorResponse } from "@/lib/agent-api-errors";
import { deleteAgentMemory, updateAgentMemory } from "@/lib/repositories";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const memory = await updateAgentMemory(id, {
      status: typeof body.status === "string" ? body.status : undefined,
      importance: Number.isFinite(Number(body.importance)) ? Number(body.importance) : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
    });
    return NextResponse.json(memory);
  } catch (error) {
    return agentApiErrorResponse(error, "Agent memory update failed", 400);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await deleteAgentMemory(id));
  } catch (error) {
    return agentApiErrorResponse(error, "Agent memory deletion failed", 400);
  }
}
