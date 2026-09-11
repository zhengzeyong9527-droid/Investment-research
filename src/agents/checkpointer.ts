import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const testMemorySaver = new MemorySaver();
let postgresCheckpointer: PostgresSaver | null = null;
let postgresCheckpointerUrl = "";
let postgresSetup: Promise<PostgresSaver> | null = null;

export function createLangGraphCheckpointer(
  databaseUrl = process.env.DATABASE_URL,
  env = process.env.NODE_ENV
): MemorySaver | PostgresSaver | null {
  if (env === "test") {
    return testMemorySaver;
  }
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    return null;
  }
  if (!postgresCheckpointer || postgresCheckpointerUrl !== databaseUrl) {
    postgresCheckpointer = PostgresSaver.fromConnString(databaseUrl);
    postgresCheckpointerUrl = databaseUrl;
    postgresSetup = null;
  }
  return postgresCheckpointer;
}

export async function initializeLangGraphCheckpointer(
  databaseUrl = process.env.DATABASE_URL,
  env = process.env.NODE_ENV
) {
  if (env === "test") return testMemorySaver;
  createLangGraphCheckpointer(databaseUrl, env);
  const checkpointer = postgresCheckpointer;
  if (!checkpointer) return null;
  if (!postgresSetup) {
    postgresSetup = checkpointer.setup().then(() => checkpointer).catch((error) => {
      postgresSetup = null;
      throw error;
    });
  }
  return postgresSetup;
}

export async function closeLangGraphCheckpointer() {
  const checkpointer = postgresCheckpointer;
  postgresCheckpointer = null;
  postgresCheckpointerUrl = "";
  postgresSetup = null;
  if (checkpointer) await checkpointer.end();
}

export async function verifyLangGraphCheckpointRoundTrip(
  databaseUrl = process.env.DATABASE_URL,
  env = process.env.NODE_ENV
) {
  const writer = await initializeLangGraphCheckpointer(databaseUrl, env);
  if (!writer || writer === testMemorySaver) return;

  const threadId = `bootstrap-${process.pid}-${Date.now()}`;
  const config = { configurable: { thread_id: threadId, checkpoint_ns: "bootstrap" } };
  const checkpoint = {
    v: 1,
    ts: new Date().toISOString(),
    id: crypto.randomUUID(),
    channel_values: { bootstrap: "ready" },
    channel_versions: { bootstrap: 1 },
    versions_seen: {},
    pending_sends: [],
  };
  await writer.put(config, checkpoint, { source: "loop", step: 0, parents: {} }, { bootstrap: 1 });

  // Reopen the saver before reading so bootstrap verifies durable recovery,
  // not merely an in-process round trip on the same connection pool.
  await closeLangGraphCheckpointer();
  const reader = await initializeLangGraphCheckpointer(databaseUrl, env);
  if (!reader || reader === testMemorySaver) {
    throw new Error("LangGraph checkpoint could not be reopened for recovery verification.");
  }
  const restored = await reader.getTuple(config);
  if (restored?.checkpoint.channel_values.bootstrap !== "ready") {
    throw new Error("LangGraph checkpoint round-trip verification failed.");
  }
  await reader.deleteThread(threadId);
}
