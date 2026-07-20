import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FEEDBACK_ISSUE_URL, buildFeedbackIssueBody, buildFeedbackIssueUrl } from "../src/ui/feedback.js";

describe("public feedback issue composer", () => {
  const report = {
    category: "Bug",
    summary: "Replicate allocation jumps",
    details: "The selected row loses focus when a cohort completes.",
    selection: { label: "Replicate allocation", key: "directive:replicate" },
    diagnostics: {
      page: "https://seirved.github.io/Nanoswarm/",
      saveVersion: 7,
      nanites: "12",
      energy: "80",
      activeCohorts: 2,
      completedResearch: "parallel-directives",
      viewport: "1440x900",
      userAgent: "Test browser",
    },
  };

  it("builds a readable public issue with selected-element context", () => {
    const body = buildFeedbackIssueBody(report);
    assert.match(body, /Replicate allocation/);
    assert.match(body, /directive:replicate/);
    assert.match(body, /loses focus/);
    assert.match(body, /Automatic diagnostics/);
  });

  it("opens GitHub's new-issue form with a prefilled title and body", () => {
    const url = new URL(buildFeedbackIssueUrl(report));
    assert.equal(`${url.origin}${url.pathname}`, FEEDBACK_ISSUE_URL);
    assert.match(url.searchParams.get("title"), /Player feedback · Bug/);
    assert.match(url.searchParams.get("body"), /Active nanites: 12/);
  });
});
