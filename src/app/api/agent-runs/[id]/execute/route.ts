import { NextResponse } from "next/server";
import { executeAgentRun } from "@/lib/agent";
import { getAgentRunForExecution, PrismaAgentRunRepository } from "@/lib/repositories";
import { OpenAISkillRunner } from "@/lib/skill-runner";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const agentRun = await getAgentRunForExecution(id);
    if (!agentRun) {
      return NextResponse.json({ error: "Agent 任务不存在" }, { status: 404 });
    }
    const result = await executeAgentRun({
      agentRun,
      repository: new PrismaAgentRunRepository(),
      runner: new OpenAISkillRunner(),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent 执行失败" },
      { status: 500 }
    );
  }
}
