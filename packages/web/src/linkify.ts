import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]}])/g;

export function linkify(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const url = match[0];
    parts.push(
      createElement(
        "a",
        {
          key: `u${i++}`,
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
          className:
            "text-sky-600 underline underline-offset-2 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300",
        },
        url,
      ),
    );
    last = match.index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return createElement(Fragment, null, ...parts);
}
