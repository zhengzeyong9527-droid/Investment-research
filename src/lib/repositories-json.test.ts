import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { toPrismaJson } from "@/lib/prisma-json";
import { jsonArray, jsonObject, jsonValue } from "@/lib/repositories";

describe("repository JSON compatibility helpers", () => {
  it("keeps native JSON objects and arrays without manual parsing", () => {
    const object = { stockCode: "600519", nested: { ok: true } };
    const array = ["热点", "白酒"];

    expect(jsonObject(object)).toEqual(object);
    expect(jsonArray(array)).toEqual(array);
    expect(jsonValue(object)).toEqual(object);
  });

  it("parses legacy string JSON values", () => {
    expect(jsonObject('{"stockCode":"600519","risk":true}')).toEqual({ stockCode: "600519", risk: true });
    expect(jsonArray('["热点","白酒"]')).toEqual(["热点", "白酒"]);
  });

  it("falls back safely for malformed legacy strings", () => {
    expect(jsonObject("{bad json")).toEqual({});
    expect(jsonArray("热点,白酒")).toEqual([]);
    expect(jsonValue("{bad json")).toBe("{bad json");
  });

  it("normalizes values for strongly typed Prisma JSON writes", () => {
    expect(toPrismaJson({ keep: true, omit: undefined, array: [1, undefined, null] })).toEqual({
      keep: true,
      array: [1, null, null],
    });
    expect(toPrismaJson(null)).toBe(Prisma.JsonNull);
  });

  it("rejects lossy or cyclic Prisma JSON writes", () => {
    expect(() => toPrismaJson(Number.NaN)).toThrow(/non-finite/);
    expect(() => toPrismaJson(1n)).toThrow(/BigInt/);

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => toPrismaJson(cyclic)).toThrow(/circular/);
  });
});
