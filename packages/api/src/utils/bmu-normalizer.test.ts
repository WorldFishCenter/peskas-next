import { describe, expect, it } from "vitest";
import { bmuNamesMatch, getAllBmuVariants } from "./bmu-normalizer";

describe("getAllBmuVariants", () => {
  it("generates hyphen/underscore/case variants for a plain BMU name", () => {
    const v = getAllBmuVariants(["Shelly-Timbwani"]);
    expect(v).toContain("shelly_timbwani");
    expect(v).toContain("Shelly_Timbwani");
  });

  it("adds Inde and Nje spellings when a Kiwayuu BMU is requested", () => {
    const v = getAllBmuVariants(["Kiwayuu cha Nje"]);
    expect(v.some((x) => x.toLowerCase().includes("inde"))).toBe(true);
    expect(v.some((x) => x.toLowerCase().includes("nje"))).toBe(true);
  });

  it("includes ndani variants when outer Kiwayuu is selected", () => {
    const v = getAllBmuVariants(["Kiwayuu_cha_nje"]);
    expect(v.some((x) => bmuNamesMatch(x, "Kiwayuu cha Ndani"))).toBe(true);
  });

  it("matches a bare 'Kiwayuu' input to all sub-site spellings", () => {
    const v = getAllBmuVariants(["Kiwayuu"]);
    expect(v.some((x) => x.toLowerCase().includes("inde"))).toBe(true);
    expect(v.some((x) => x.toLowerCase().includes("nje"))).toBe(true);
    expect(v.some((x) => x.toLowerCase().includes("ndani"))).toBe(true);
  });
});

describe("bmuNamesMatch", () => {
  it("ignores separators and case", () => {
    expect(bmuNamesMatch("Shelly-Timbwani", "shelly_timbwani")).toBe(true);
  });

  it("returns false for genuinely different names", () => {
    expect(bmuNamesMatch("Shelly-Timbwani", "Kibuyuni")).toBe(false);
  });
});
