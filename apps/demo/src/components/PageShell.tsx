import type { ReactNode } from "react";

/**
 * One demo page: explanation, concrete experiments to try, the form, and
 * (usually) the engine readout in the right rail.
 */
export function PageShell(props: {
  eyebrow: string;
  title: string;
  lede: ReactNode;
  tries: readonly string[];
  schema?: string;
  readout?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={
        props.readout !== undefined ? "page page--with-readout" : "page"
      }
    >
      <div className="page__main">
        <p className="page__eyebrow">{props.eyebrow}</p>
        <h1 className="page__title">{props.title}</h1>
        <p className="page__lede">{props.lede}</p>

        <section className="panel">{props.children}</section>

        <section className="tries" aria-label="Things to try">
          <h2 className="tries__title">Try</h2>
          <ul>
            {props.tries.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </section>

        {props.schema !== undefined && (
          <details className="schema-peek">
            <summary>The schema behind this page</summary>
            <pre>{props.schema}</pre>
          </details>
        )}
      </div>
      {props.readout}
    </div>
  );
}
