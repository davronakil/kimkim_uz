import type { ReactNode } from "react";

type FormattedEventDescriptionProps = {
  text: string;
  className?: string;
};

type InlineToken = {
  index: number;
  length: number;
  render: (key: string) => ReactNode;
};

const markdownLinkPattern = /\[([^\]\n]+)\]\(([^)\s]+)\)/;
const htmlLinkPattern = /<a\s+href=["']([^"']+)["'][^>]*>([\s\S]+?)<\/a>/i;
const htmlBoldPattern = /<(b|strong)>([\s\S]+?)<\/\1>/i;
const htmlItalicPattern = /<(i|em)>([\s\S]+?)<\/\1>/i;
const boldPattern = /(\*\*|__)([\s\S]+?)\1/;
const starItalicPattern = /\*([^*\s][\s\S]*?[^*\s])\*/;
const bareUrlPattern = /(?:https?:\/\/|www\.)[^\s<]+/i;
const trailingPunctuationPattern = /[),.!?;:]+$/;

function safeHref(rawHref: string) {
  const normalizedHref = rawHref.startsWith("www.") ? `https://${rawHref}` : rawHref;

  try {
    const parsed = new URL(normalizedHref);

    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") {
      return normalizedHref;
    }
  } catch {
    return null;
  }

  return null;
}

function markdownLinkToken(text: string): InlineToken | null {
  const match = markdownLinkPattern.exec(text);

  if (!match) {
    return null;
  }

  const href = safeHref(match[2]);

  if (!href) {
    return null;
  }

  return {
    index: match.index,
    length: match[0].length,
    render: (key) => (
      <a
        key={key}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
      >
        {formatInline(match[1], key)}
      </a>
    ),
  };
}

function htmlLinkToken(text: string): InlineToken | null {
  const match = htmlLinkPattern.exec(text);

  if (!match) {
    return null;
  }

  const href = safeHref(match[1]);

  if (!href) {
    return null;
  }

  return {
    index: match.index,
    length: match[0].length,
    render: (key) => (
      <a
        key={key}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
      >
        {formatInline(match[2], key)}
      </a>
    ),
  };
}

function htmlBoldToken(text: string): InlineToken | null {
  const match = htmlBoldPattern.exec(text);

  if (!match) {
    return null;
  }

  return {
    index: match.index,
    length: match[0].length,
    render: (key) => (
      <strong key={key} className="font-semibold text-zinc-900 dark:text-zinc-50">
        {formatInline(match[2], key)}
      </strong>
    ),
  };
}

function htmlItalicToken(text: string): InlineToken | null {
  const match = htmlItalicPattern.exec(text);

  if (!match) {
    return null;
  }

  return {
    index: match.index,
    length: match[0].length,
    render: (key) => (
      <em key={key} className="italic">
        {formatInline(match[2], key)}
      </em>
    ),
  };
}

function boldToken(text: string): InlineToken | null {
  const match = boldPattern.exec(text);

  if (!match) {
    return null;
  }

  return {
    index: match.index,
    length: match[0].length,
    render: (key) => (
      <strong key={key} className="font-semibold text-zinc-900 dark:text-zinc-50">
        {formatInline(match[2], key)}
      </strong>
    ),
  };
}

function starItalicToken(text: string): InlineToken | null {
  const match = starItalicPattern.exec(text);

  if (!match) {
    return null;
  }

  return {
    index: match.index,
    length: match[0].length,
    render: (key) => (
      <em key={key} className="italic">
        {formatInline(match[1], key)}
      </em>
    ),
  };
}

function underscoreItalicToken(text: string): InlineToken | null {
  const pattern = /(^|[\s([{])_([^_\s][\s\S]*?[^_\s])_(?=$|[\s)\]}.,!?;:])/;
  const match = pattern.exec(text);

  if (!match) {
    return null;
  }

  const prefix = match[1];
  const index = match.index + prefix.length;

  return {
    index,
    length: match[0].length - prefix.length,
    render: (key) => (
      <em key={key} className="italic">
        {formatInline(match[2], key)}
      </em>
    ),
  };
}

function bareUrlToken(text: string): InlineToken | null {
  const match = bareUrlPattern.exec(text);

  if (!match) {
    return null;
  }

  const rawUrl = match[0];
  const trimmedUrl = rawUrl.replace(trailingPunctuationPattern, "");
  const href = safeHref(trimmedUrl);

  if (!href) {
    return null;
  }

  return {
    index: match.index,
    length: trimmedUrl.length,
    render: (key) => (
      <a
        key={key}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
      >
        {trimmedUrl}
      </a>
    ),
  };
}

function earliestToken(tokens: Array<InlineToken | null>) {
  return tokens.reduce<InlineToken | null>((earliest, token) => {
    if (!token) {
      return earliest;
    }

    if (!earliest || token.index < earliest.index) {
      return token;
    }

    return earliest;
  }, null);
}

function formatInline(text: string, keyPrefix = "description"): ReactNode[] {
  const token = earliestToken([
    markdownLinkToken(text),
    htmlLinkToken(text),
    htmlBoldToken(text),
    htmlItalicToken(text),
    boldToken(text),
    bareUrlToken(text),
    starItalicToken(text),
    underscoreItalicToken(text),
  ]);

  if (!token) {
    return [text];
  }

  return [
    text.slice(0, token.index),
    token.render(`${keyPrefix}-${token.index}`),
    ...formatInline(text.slice(token.index + token.length), `${keyPrefix}-${token.index}-rest`),
  ].filter((node) => node !== "");
}

export function FormattedEventDescription({ text, className }: FormattedEventDescriptionProps) {
  return <div className={className}>{formatInline(text)}</div>;
}
