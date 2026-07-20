import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COHORT_SLOT_ORDER, groupCohortsForDisplay, revealedCohortSlots } from "../src/ui/cohort-groups.js";

describe("cohort display groups", () => {
  it("keeps recurring active work in fixed operational order and omits substrate searches", () => {
    const cohorts = [
      { directive: "prospect", workers: 1n, startedAt: 10, completesAt: 40 },
      { directive: "sort", workers: 2n, startedAt: 10, completesAt: 30 },
      { directive: "energy", workers: 3n, startedAt: 10, completesAt: 20 },
      { directive: "replicate", workers: 4n, startedAt: 10, completesAt: 60 },
      { directive: "collect", workers: 5n, startedAt: 10, completesAt: 25 },
    ];

    assert.deepEqual(COHORT_SLOT_ORDER, ["replicate", "collect", "atmosphere", "energy", "sort"]);
    assert.deepEqual(
      groupCohortsForDisplay(cohorts).map((group) => group.directive),
      ["replicate", "collect", "energy", "sort"],
    );
  });

  it("sorts phases by completion and totals their exact workers", () => {
    const groups = groupCohortsForDisplay([
      { directive: "collect", workers: 7n, startedAt: 10, completesAt: 50 },
      { directive: "collect", workers: 11n, startedAt: 10, completesAt: 30 },
    ]);

    assert.equal(groups[0].lead.completesAt, 30);
    assert.equal(groups[0].workers, 18n);
    assert.equal(groups[0].spread, 20);
  });

  it("keeps undiscovered fixed slots hidden and never promotes a substrate search into them", () => {
    const state = {
      discovery: {
        surveyComplete: true,
        feedstockVisible: true,
        elementsVisible: true,
        atmosphereVisible: false,
        exhaustionNotified: false,
      },
      prospecting: { searchesCompleted: 0 },
      cohorts: [],
    };
    assert.deepEqual(revealedCohortSlots(state), ["replicate", "collect", "energy", "sort"]);

    state.cohorts.push({ directive: "prospect" });
    assert.deepEqual(revealedCohortSlots(state), ["replicate", "collect", "energy", "sort"]);
    state.cohorts = [];
    state.prospecting.searchesCompleted = 1;
    state.discovery.atmosphereVisible = true;
    assert.deepEqual(revealedCohortSlots(state), COHORT_SLOT_ORDER);
  });
});
