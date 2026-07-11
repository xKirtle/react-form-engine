import type { ReactNode } from "react";
import { type GuideMeta, type GuideSlug, guideUrl } from "../guides";

/**
 * One demo page = one guide: a spec-sheet header (the guide's number and
 * title, a link back to the prose), one or more exhibits, the experiments
 * to run, and (usually) the engine readout in the right rail.
 */
export function PageShell(props: {
  guide: GuideMeta;
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
        <header className="page__header">
          <p className="page__eyebrow">
            <span className="page__num">{props.guide.num}</span>
            {props.guide.title}
            <a
              className="page__guide-link"
              href={guideUrl(props.guide.slug as GuideSlug)}
            >
              Read the guide ↗
            </a>
          </p>
          <h1 className="page__title">{props.title}</h1>
          <p className="page__lede">{props.lede}</p>
        </header>

        {props.children}

        <section className="tries" aria-label="Experiments to run">
          <h2 className="tries__title">Run these</h2>
          <ol>
            {props.tries.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ol>
        </section>

        {props.schema !== undefined && (
          <details className="schema-peek">
            <summary>schema.ts — what drives this page</summary>
            <pre>{props.schema}</pre>
          </details>
        )}
      </div>
      {props.readout}
    </div>
  );
}

/**
 * One demonstration inside a page. Single-exhibit pages omit the title;
 * multi-exhibit pages use it to separate the guide's distinct claims.
 */
export function Exhibit(props: {
  title?: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="exhibit">
      {props.title !== undefined && (
        <h2 className="exhibit__title">{props.title}</h2>
      )}
      {props.note !== undefined && (
        <p className="exhibit__note">{props.note}</p>
      )}
      <div className="panel">{props.children}</div>
    </section>
  );
}
