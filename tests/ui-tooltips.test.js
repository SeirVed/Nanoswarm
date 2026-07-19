import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTION_TOOLTIPS, TOOLTIP_DELAY_MS, tooltipTextFor } from "../src/ui/tooltips.js";

describe("delayed tooltips", () => {
  it("waits three seconds and supplies explanations for every interface action", () => {
    assert.equal(TOOLTIP_DELAY_MS, 3_000);
    for (const action of [
      "begin", "start", "adjust", "step-share", "lock", "research", "research-move",
      "research-cancel", "research-tab", "log-filter", "prospect", "audio", "reset",
    ]) {
      assert.equal(typeof ACTION_TOOLTIPS[action], "string");
      assert.ok(ACTION_TOOLTIPS[action].length > 12);
    }
  });

  it("prefers explicit context, then action guidance, then accessible labels", () => {
    const target = {
      dataset: { tooltip: "Exact context", action: "adjust" },
      getAttribute: () => "Accessible label",
    };
    assert.equal(tooltipTextFor(target), "Exact context");
    delete target.dataset.tooltip;
    assert.equal(tooltipTextFor(target), ACTION_TOOLTIPS.adjust);
    delete target.dataset.action;
    assert.equal(tooltipTextFor(target), "Accessible label");
  });
});
