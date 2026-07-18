import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCount,
  formatEnergy,
  formatInventoryMass,
  massYoctograms,
} from "../src/game/quantities.js";

describe("physical quantity formatting", () => {
  it("switches whole counts to 10^x notation only above one hundred million", () => {
    assert.equal(formatCount(100_000_000n), "100,000,000");
    assert.equal(formatCount(100_000_001n), "1.000 × 10^8");
    assert.equal(formatCount(600_000_000_000_000_000n), "6.000 × 10^17");
  });

  it("uses six significant digits and automatic SI units for energy", () => {
    assert.equal(formatEnergy(40n), "40.0000 pJ");
    assert.equal(formatEnergy(1_250_000n), "1.25000 µJ");
    assert.equal(formatEnergy(2_500_000_000_000n), "2.50000 J");
  });

  it("converts atomic inventories into increasing physical mass units", () => {
    const oneCarbon = { carbon: 1n };
    const tenThousandCarbon = { carbon: 10_000n };
    assert.equal(massYoctograms(oneCarbon), 19n);
    assert.match(formatInventoryMass(tenThousandCarbon), /zg$/);
    assert.ok(massYoctograms(tenThousandCarbon) > massYoctograms(oneCarbon));
  });
});
