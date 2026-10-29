const EMPTY_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function validContent(content) {
  return typeof content === "object" && content !== null && !Array.isArray(content);
}

function normalizeTitle(title) {
  return typeof title === "string"
    ? title.trim().slice(0, 200) || "Untitled document"
    : "Untitled document";
}

module.exports = { EMPTY_CONTENT, validContent, normalizeTitle };
