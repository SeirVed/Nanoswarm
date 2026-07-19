import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COHORT_SLOT_ORDER, groupCohortsForDisplay } from "../src/ui/cohort-groups.js";

describe("cohort display groups", () => {
  it("keeps active work in the fixed replication, collection, sorting, misc order", () => {
    const cohorts = [
      { directive: "prospect", workers: 1n, startedAt: 10, completesAt: 40 },
      { directive: "sort", workers: 2n, startedAt: 10, completesAt: 30 },
      { directive: "energy", workers: 3n, startedAt: 10, completesAt: 20 },
      { directive: "replicate", workers: 4n, startedAt: 10, completesAt: 60 },
      { directive: "collect", workers: 5n, startedAt: 10, completesAt: 25 },
    ];

    assert.deepEqual(COHORT_SLOT_ORDER, ["replicate", "collect", "atmosphere", "energy", "sort", "prospect"]);
    assert.deepEqual(
      groupCohortsForDisplay(cohorts).map((group) => group.directive),
      ["replicate", "collect", "energy", "sort", "prospect"],
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
});
