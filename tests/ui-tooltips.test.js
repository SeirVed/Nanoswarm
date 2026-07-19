import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTION_TOOLTIPS, TOOLTIP_DELAY_MS, tooltipIdentityFor, tooltipTextFor } from "../src/ui/tooltips.js";

describe("delayed tooltips", () => {
  it("waits one and a half seconds and supplies explanations for every interface action", () => {
    assert.equal(TOOLTIP_DELAY_MS, 1_500);
    for (const action of [
      "begin", "start", "adjust", "step-share", "lock", "research", "research-move",
      "research-cancel", "research-tab", "log-filter", "prospect", "audio", "reset", "volume",
      "set-share", "set-share-percent",
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

  it("keeps stable semantic identities when timer text or log layout changes", () => {
    const log = { dataset: { tooltipKey: "log:42", tooltip: "First wording" } };
    assert.equal(tooltipIdentityFor(log), "key:log:42");
    log.dataset.tooltip = "Updated wording";
    assert.equal(tooltipIdentityFor(log), "key:log:42");

    const control = {
      dataset: { action: "adjust", directive: "replicate", delta: "1" },
    };
    assert.equal(tooltipIdentityFor(control), "control:adjust:replicate::::1:");
  });
});
