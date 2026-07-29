export type NormalizedSkillOutput = {
  finalMarkdown: string;
  outputHtml: string | null;
};

const COMPLETE_HTML_FENCE_RE = /```(?:html|HTML)\s*\r?\n([\s\S]*?)```/g;
const PARTIAL_HTML_FENCE_RE = /```(?:html|HTML)\s*(?:\r?\n|$)[\s\S]*$/i;
const HTML_START_RE = /<!doctype\s+html\b|<html\b/i;
const HTML_END_RE = /<\/html\s*>/i;

export function normalizeSkillOutput(outputMarkdown: string): NormalizedSkillOutput {
  const extractedHtml: string[] = [];
  let markdown = outputMarkdown.replace(COMPLETE_HTML_FENCE_RE, (_match, html) => {
    const cleaned = String(html ?? "").trim();
    if (isHtmlDocument(cleaned)) {
      extractedHtml.push(cleaned);
      return "";
    }
    return "";
  });

  const rawExtraction = extractRawHtmlDocument(markdown);
  if (rawExtraction) {
    extractedHtml.push(rawExtraction.html);
    markdown = `${markdown.slice(0, rawExtraction.start)}\n${markdown.slice(rawExtraction.end)}`;
  }

  markdown = stripPartialHtml(markdown);

  return {
    finalMarkdown: cleanMarkdown(markdown),
    outputHtml: pickHtmlDocument(extractedHtml),
  };
}

export function stripHtmlFromMarkdown(markdown: string) {
  return normalizeSkillOutput(markdown).finalMarkdown;
}

function extractRawHtmlDocument(markdown: string) {
  const startMatch = HTML_START_RE.exec(markdown);
  if (!startMatch || startMatch.index < 0) return null;

  const endMatch = HTML_END_RE.exec(markdown.slice(startMatch.index));
  if (!endMatch) {
    return {
      start: startMatch.index,
      end: markdown.length,
      html: markdown.slice(startMatch.index).trim(),
    };
  }

  const end = startMatch.index + endMatch.index + endMatch[0].length;
  return {
    start: startMatch.index,
    end,
    html: markdown.slice(startMatch.index, end).trim(),
  };
}

function stripPartialHtml(markdown: string) {
  const partialFence = PARTIAL_HTML_FENCE_RE.exec(markdown);
  if (partialFence?.index !== undefined) {
    return markdown.slice(0, partialFence.index);
  }

  const rawStart = HTML_START_RE.exec(markdown);
  if (!rawStart) return markdown;
  const rawEnd = HTML_END_RE.exec(markdown.slice(rawStart.index));
  if (rawEnd) return markdown;
  return markdown.slice(0, rawStart.index);
}

function pickHtmlDocument(items: string[]) {
  const candidates = items.map((item) => item.trim()).filter(isHtmlDocument);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.length - a.length)[0];
}

function isHtmlDocument(value: string) {
  return HTML_START_RE.test(value);
}

function cleanMarkdown(markdown: string) {
  return markdown
    .replace(/[ \t]+\r?\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
