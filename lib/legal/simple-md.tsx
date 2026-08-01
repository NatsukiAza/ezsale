import type { ReactNode } from "react";

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-medium text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Renderiza el subconjunto de Markdown usado en docs/legal (títulos, negritas, listas).
 */
export function SimpleMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim() === "" || line.trim() === "---") {
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key++} className="text-h1 text-foreground">
          {renderInline(line.slice(2))}
        </h1>,
      );
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      const title = line.slice(3).trim();
      blocks.push(
        <h2
          key={key++}
          id={slugify(title)}
          className="mt-10 scroll-mt-24 border-t border-border pt-8 text-lg font-semibold tracking-tight text-foreground"
        >
          {renderInline(title)}
        </h2>,
      );
      i += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: ReactNode[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith("- ")) {
        items.push(
          <li key={items.length} className="text-body text-muted-foreground">
            {renderInline((lines[i] ?? "").slice(2))}
          </li>,
        );
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="mt-3 list-disc space-y-2 pl-5">
          {items}
        </ul>,
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      (lines[i] ?? "").trim() !== "---" &&
      !(lines[i] ?? "").startsWith("#") &&
      !(lines[i] ?? "").startsWith("- ")
    ) {
      para.push(lines[i] ?? "");
      i += 1;
    }

    const joined = para.join(" ").trim();
    if (joined) {
      const isLead =
        joined.startsWith("**Acuerdo") ||
        joined.startsWith("**Producto:") ||
        joined.startsWith("**Última actualización:");

      blocks.push(
        <p
          key={key++}
          className={
            isLead
              ? "text-body-sm text-muted-foreground"
              : "mt-3 text-body leading-relaxed text-muted-foreground"
          }
        >
          {renderInline(joined)}
        </p>,
      );
    }
  }

  return <div className="space-y-1">{blocks}</div>;
}
