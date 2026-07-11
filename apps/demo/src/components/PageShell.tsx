import type { ReactNode } from "react";
import { type GuideMeta, type GuideSlug, guideUrl } from "../guides";

/**
 * One demo page = one guide: a spec-sheet header (the guide's number and
 * title, a link back to the prose) over a set of exhibits, and optionally
 * the engine readout in the right rail.
 */
export function PageShell(props: {
  guide: GuideMeta;
  title: string;
  lede: ReactNode;
  /** Legacy prose hints, for pages not yet reworked into sub-examples. */
  tries?: readonly string[];
  schema?: string;
  readout?: ReactNode;
  /** Widen the column — for pages whose exhibits carry their own data panes. */
  wide?: boolean;
  children: ReactNode;
}) {
  const className =
    props.readout !== undefined
      ? "page page--with-readout"
      : props.wide === true
        ? "page page--wide"
        : "page";
  return (
    <div className={className}>
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

        {props.tries !== undefined && (
          <section className="tries" aria-label="Scenarios">
            <h2 className="tries__title">Scenarios</h2>
            <ol>
              {props.tries.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ol>
          </section>
        )}

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
 * One sub-example inside a page: a titled card demonstrating a single
 * capability. `bare` skips the panel wrapper for exhibits that lay out
 * their own panes (side-by-side comparisons, for instance).
 */
export function Exhibit(props: {
  title?: string;
  note?: ReactNode;
  bare?: boolean;
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
      {props.bare === true ? (
        props.children
      ) : (
        <div className="panel">{props.children}</div>
      )}
    </section>
  );
}
