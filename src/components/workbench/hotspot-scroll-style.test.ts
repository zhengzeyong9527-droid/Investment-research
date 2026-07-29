import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("hotspot rolling panel styles", () => {
  it("uses a slower auto-scroll while allowing manual vertical scrolling", () => {
    expect(css).toContain("overflow-y: auto;");
    expect(css).toContain("touch-action: pan-y;");
    expect(css).toContain("overscroll-behavior: contain;");
    expect(css).toContain("animation: hotspot-marquee 44s linear infinite;");
    expect(css).toContain(".hotspot-scroll:focus-within .hotspot-scroll-track");
    expect(css).toContain(".hotspot-scroll:active .hotspot-scroll-track");
  });
});
