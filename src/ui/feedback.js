export const FEEDBACK_ISSUE_URL = "https://github.com/SeirVed/Nanoswarm/issues/new";

const clean = (value, fallback = "Not supplied") => String(value ?? "").trim() || fallback;

export function buildFeedbackIssueBody({ category, details, selection, diagnostics }) {
  const lines = [
    "## Player feedback",
    "",
    `**Category:** ${clean(category)}`,
    `**Selected interface:** ${clean(selection?.label)}`,
    `**Interface key:** \`${clean(selection?.key, "unkeyed")}\``,
    "",
    "### Report",
    "",
    clean(details),
  ];
  if (diagnostics) {
    lines.push(
      "",
      "### Automatic diagnostics",
      "",
      `- Page: ${clean(diagnostics.page)}`,
      `- Save version: ${clean(diagnostics.saveVersion)}`,
      `- Active nanites: ${clean(diagnostics.nanites)}`,
      `- Stored energy (pJ): ${clean(diagnostics.energy)}`,
      `- Active cohorts: ${clean(diagnostics.activeCohorts)}`,
      `- Completed research: ${clean(diagnostics.completedResearch)}`,
      `- Viewport: ${clean(diagnostics.viewport)}`,
      `- Browser: ${clean(diagnostics.userAgent)}`,
    );
  }
  lines.push("", "---", "Submitted from the in-game NanoSwarm feedback selector.");
  return lines.join("\n");
}

export function buildFeedbackIssueUrl(report) {
  const title = `[Player feedback · ${clean(report.category, "General")}] ${clean(
    report.summary,
    report.selection?.label ?? "NanoSwarm interface",
  ).slice(0, 120)}`;
  const url = new URL(FEEDBACK_ISSUE_URL);
  url.searchParams.set("title", title);
  url.searchParams.set("body", buildFeedbackIssueBody(report));
  return url.toString();
}
