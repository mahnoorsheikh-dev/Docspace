const test = require("node:test");
const assert = require("node:assert/strict");
const { validContent, normalizeTitle, EMPTY_CONTENT } = require("./document-utils");

test("TipTap rich-text JSON content is accepted as a structured document", () => {
  const content = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Assessment" }] },
      { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Saved formatting" }] },
    ],
  };

  assert.equal(validContent(content), true);
  assert.equal(validContent(null), false);
  assert.equal(validContent([]), false);
});

test("titles are trimmed, defaulted, and limited to the API schema length", () => {
  assert.equal(normalizeTitle("  Project Brief  "), "Project Brief");
  assert.equal(normalizeTitle("   "), "Untitled document");
  assert.equal(normalizeTitle("x".repeat(250)).length, 200);
  assert.deepEqual(EMPTY_CONTENT, { type: "doc", content: [{ type: "paragraph" }] });
});
