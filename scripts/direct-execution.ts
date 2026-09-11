import path from "node:path";
import { fileURLToPath } from "node:url";

export function isDirectExecution(moduleUrl: string, argument: string | undefined) {
  if (!argument || !moduleUrl.startsWith("file:")) return false;
  return path.resolve(fileURLToPath(moduleUrl)) === path.resolve(argument);
}
