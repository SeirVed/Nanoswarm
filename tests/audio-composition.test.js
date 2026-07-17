import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveActivity, deriveHarmony, derivePatternStep } from "../src/audio/composition.js";

function sonicState() {
  return {
    nanites: 16n,
    cohorts: [
      { directive: "collect", workers: 8n },
      { directive: "sort", workers: 4n },
      { directive: "energy", workers: 4n },
    ],
    allocations: { energy: 4n, collect: 8n, sort: 4n, replicate: 0n, research: 0n },
    researchQueue: [],
    discovery: {
      surveyComplete: true,
      feedstockVisible: true,
      elementsVisible: true,
      residuumVisible: true,
      directivesVisible: true,
      researchVisible: true,
      projectsVisible: true,
    },
  };
}

describe("procedural composition", () => {
  it("derives the musical section from real job ratios", () => {
    const activity = deriveActivity(sonicState());
    assert.equal(activity.dominant, "collect");
    assert.equal(activity.ratios.collect, 0.5);
    assert.equal(activity.ratios.sort, 0.25);
    assert.equal(activity.ratios.energy, 0.25);
  });

  it("produces deterministic harmony and transcendental rhythm", () => {
    const activity = deriveActivity(sonicState());
    assert.deepEqual(deriveHarmony(activity, 7), deriveHarmony(activity, 7));
    assert.deepEqual(derivePatternStep(19, activity, 7), derivePatternStep(19, activity, 7));
    assert.notDeepEqual(derivePatternStep(19, activity, 7), derivePatternStep(20, activity, 7));
  });

  it("exposes more of the synthetic mind as discoveries accumulate", () => {
    const awake = deriveActivity(sonicState());
    const dormantState = sonicState();
    dormantState.nanites = 1n;
    dormantState.cohorts = [];
    dormantState.discovery = Object.fromEntries(Object.keys(dormantState.discovery).map((key) => [key, false]));
    const dormant = deriveActivity(dormantState);
    assert.ok(awake.awakening > dormant.awakening);
  });
});
