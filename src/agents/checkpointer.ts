import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const testMemorySaver = new MemorySaver();

export function createLangGraphCheckpointer(databaseUrl = process.env.DATABASE_URL, env = process.env.NODE_ENV) {
  if (env === "test") {
    return testMemorySaver;
  }
  if (!databaseUrl || !databaseUrl.startsWith("postgres")) {
    return null;
  }
  return PostgresSaver.fromConnString(databaseUrl);
}
