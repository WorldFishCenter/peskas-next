import { describe, expect, it } from "vitest";
import { bmuNamesMatch, getAllBmuVariants, normalizeBmuForQuery } from "./bmu-normalizer";

describe("getAllBmuVariants", () => {
  it("adds Inde and Nje spellings when a Kiwayuu BMU is requested", () => {
    const v = getAllBmuVariants(["Kiwayuu cha Nje"]);
    expect(v.some((x) => x.toLowerCase().includes("inde"))).toBe(true);
    expect(v.some((x) => x.toLowerCase().includes("nje"))).toBe(true);
  });

  it("includes ndani variants when outer Kiwayuu is selected", () => {
    const v = getAllBmuVariants(["Kiwayuu_cha_nje"]);
    expect(v.some((x) => normalizeBmuForQuery(x).includes("ndani"))).toBe(true);
  });
});

describe("bmuNamesMatch", () => {
  it("ignores separators and case", () => {
    expect(bmuNamesMatch("Shelly-Timbwani", "shelly_timbwani")).toBe(true);
  });
});
