import { Prisma } from "@prisma/client";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const OMIT = Symbol("omit-json-value");

/**
 * Converts an unknown runtime value into a value accepted by Prisma JSON writes.
 * The conversion follows JSON.stringify semantics for undefined/function/symbol
 * values while rejecting values that would silently lose numeric precision.
 */
export function toPrismaJson(value: unknown): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
  const normalized = normalizeJsonValue(value, "root", new Set<object>());
  if (normalized === OMIT) {
    throw new TypeError("Prisma JSON value cannot be undefined, a function, or a symbol at the root");
  }
  return normalized === null ? Prisma.JsonNull : normalized;
}

function normalizeJsonValue(
  value: unknown,
  location: "root" | "object" | "array",
  ancestors: Set<object>,
  applyToJson = true
): JsonValue | typeof OMIT {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Prisma JSON value cannot contain a non-finite number");
    return value;
  }

  if (typeof value === "bigint") throw new TypeError("Prisma JSON value cannot contain BigInt");
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return location === "array" ? null : OMIT;
  }

  if (typeof value !== "object") throw new TypeError(`Unsupported Prisma JSON value: ${typeof value}`);

  const serializable = value as object & { toJSON?: () => unknown };
  if (applyToJson && typeof serializable.toJSON === "function") {
    return normalizeJsonValue(serializable.toJSON(), location, ancestors, false);
  }

  if (ancestors.has(serializable)) throw new TypeError("Prisma JSON value cannot contain a circular reference");
  ancestors.add(serializable);

  try {
    if (Array.isArray(serializable)) {
      const result: JsonValue[] = [];
      for (let index = 0; index < serializable.length; index += 1) {
        const item = normalizeJsonValue(serializable[index], "array", ancestors);
        result.push(item === OMIT ? null : item);
      }
      return result;
    }

    const result: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(serializable)) {
      const item = normalizeJsonValue((serializable as Record<string, unknown>)[key], "object", ancestors);
      if (item !== OMIT) result[key] = item;
    }
    return result;
  } finally {
    ancestors.delete(serializable);
  }
}
