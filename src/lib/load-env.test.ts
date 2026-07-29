import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadDotEnv } from "@/lib/load-env";

const touchedKeys = ["DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "PRESERVE_ME"];
const originalEnv = Object.fromEntries(touchedKeys.map((key) => [key, process.env[key]]));

describe("loadDotEnv", () => {
  beforeEach(() => {
    for (const key of touchedKeys) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of touchedKeys) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it("loads quoted env values without overriding existing variables", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "investoday-env-"));
    const file = path.join(dir, ".env");
    process.env.PRESERVE_ME = "already-set";
    writeFileSync(
      file,
      [
        'DEEPSEEK_API_KEY="test-key"',
        'DEEPSEEK_MODEL="deepseek-v4-flash"',
        'PRESERVE_ME="from-file"',
      ].join("\n"),
      "utf8"
    );

    loadDotEnv(file);

    expect(process.env.DEEPSEEK_API_KEY).toBe("test-key");
    expect(process.env.DEEPSEEK_MODEL).toBe("deepseek-v4-flash");
    expect(process.env.PRESERVE_ME).toBe("already-set");
    rmSync(dir, { recursive: true, force: true });
  });
});
