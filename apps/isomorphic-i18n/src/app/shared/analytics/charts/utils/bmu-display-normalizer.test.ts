import { describe, expect, it } from "vitest";
import { landingSiteMatchesQueryBmu, normalizeBmuNameLoose } from "./bmu-display-normalizer";

describe("normalizeBmuNameLoose", () => {
  it("strips separators", () => {
    expect(normalizeBmuNameLoose("A-B C")).toBe("abc");
  });
});

describe("landingSiteMatchesQueryBmu", () => {
  it("matches Nje session label to Inde landing_site", () => {
    expect(landingSiteMatchesQueryBmu("Kiwayuu cha Nje", "Kiwayuu_cha_inde")).toBe(true);
  });

  it("does not match Ndani to outer bucket", () => {
    expect(landingSiteMatchesQueryBmu("Kiwayuu cha Ndani", "Kiwayuu_cha_inde")).toBe(false);
  });

  it("uses loose equality for non-Kiwayuu BMUs", () => {
    expect(landingSiteMatchesQueryBmu("Shelly-Timbwani", "shelly timbwani")).toBe(true);
    expect(landingSiteMatchesQueryBmu("Foo", "Bar")).toBe(false);
  });
});
