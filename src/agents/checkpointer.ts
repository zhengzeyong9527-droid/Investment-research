import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

export function createLangGraphCheckpointer(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl || !databaseUrl.startsWith("postgres")) {
    return null;
  }
  return PostgresSaver.fromConnString(databaseUrl);
}
