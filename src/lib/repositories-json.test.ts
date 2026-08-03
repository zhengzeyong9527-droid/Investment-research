import { describe, expect, it } from "vitest";
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
});
