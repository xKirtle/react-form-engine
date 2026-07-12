import { Highlight, type PrismTheme } from "prism-react-renderer";

/* Tokens draw from the bench palette only — the same hues the engine
   states own — so highlighting doesn't introduce new color. */
const benchTheme: PrismTheme = {
  plain: { color: "var(--ink)" },
  styles: [
    { types: ["comment"], style: { color: "var(--muted)" } },
    {
      types: ["string", "attr-value"],
      style: { color: "var(--state-seeded)" },
    },
    {
      types: ["keyword", "boolean", "number", "tag", "class-name"],
      style: { color: "var(--state-api)" },
    },
    {
      types: ["function", "attr-name"],
      style: { color: "var(--state-user)" },
    },
  ],
};

/** Prism leaves `//` notes inside JSX children as plain text; mute them. */
function isJsxComment(content: string): boolean {
  return content.trimStart().startsWith("//");
}

/**
 * A contextualizing code shape — never the implementation, just enough
 * structure that the live example next to it reads unambiguously.
 */
export function Code(props: { children: string }) {
  return (
    <Highlight code={props.children} language="tsx" theme={benchTheme}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="anatomy">
          <code>
            {tokens.map((line, lineIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static snippet, stable order
              <div key={lineIndex} {...getLineProps({ line })}>
                {line.map((token, tokenIndex) => {
                  const tokenProps = getTokenProps({ token });
                  if (
                    token.types.includes("plain") &&
                    isJsxComment(token.content)
                  ) {
                    tokenProps.style = {
                      ...tokenProps.style,
                      color: "var(--muted)",
                    };
                  }
                  // biome-ignore lint/suspicious/noArrayIndexKey: static snippet, stable order
                  return <span key={tokenIndex} {...tokenProps} />;
                })}
              </div>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}
