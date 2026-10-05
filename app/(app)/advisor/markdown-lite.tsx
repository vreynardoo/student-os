// Minimal, dependency-free renderer for the small subset of Markdown the
// advisor's system prompt asks Gemini to produce (## / ### headings, **bold**,
// "- " bullet lists, "1. " numbered lists, paragraphs). Not a general Markdown
// parser — deliberately narrow so this stays a presentational detail rather
// than a new dependency.
function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((part) => part !== "");
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${index}`}>{part}</span>
    ),
  );
}

const HEADING_2 = /^##\s+/;
const HEADING_3 = /^###\s+/;
const BULLET_ITEM = /^[-*]\s+/;
const NUMBERED_ITEM = /^\d+\.\s+/;

export function MarkdownLite({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (HEADING_3.test(line)) {
      blocks.push(
        <h4 key={key} className="text-sm font-semibold">
          {renderInline(line.replace(HEADING_3, ""), `h3-${key}`)}
        </h4>,
      );
      key++;
      i++;
      continue;
    }

    if (HEADING_2.test(line)) {
      blocks.push(
        <h3 key={key} className="text-base font-semibold">
          {renderInline(line.replace(HEADING_2, ""), `h2-${key}`)}
        </h3>,
      );
      key++;
      i++;
      continue;
    }

    if (BULLET_ITEM.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET_ITEM.test(lines[i])) {
        items.push(lines[i].replace(BULLET_ITEM, ""));
        i++;
      }
      blocks.push(
        <ul key={key} className="list-disc space-y-0.5 pl-5">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `ul-${key}-${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      key++;
      continue;
    }

    if (NUMBERED_ITEM.test(line)) {
      const items: string[] = [];
      while (i < lines.length && NUMBERED_ITEM.test(lines[i])) {
        items.push(lines[i].replace(NUMBERED_ITEM, ""));
        i++;
      }
      blocks.push(
        <ol key={key} className="list-decimal space-y-0.5 pl-5">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `ol-${key}-${itemIndex}`)}</li>
          ))}
        </ol>,
      );
      key++;
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !HEADING_2.test(lines[i]) &&
      !HEADING_3.test(lines[i]) &&
      !BULLET_ITEM.test(lines[i]) &&
      !NUMBERED_ITEM.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key}>{renderInline(paragraphLines.join(" "), `p-${key}`)}</p>);
    key++;
  }

  return <div className="space-y-2">{blocks}</div>;
}
