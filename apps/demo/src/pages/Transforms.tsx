import {
  type FieldMap,
  Form,
  FormRenderers,
  type UseFormEngineReturn,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import type { ReactNode } from "react";
import { Code } from "../components/Code";
import { useEngineTick } from "../components/EngineReadout";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

/** JSON view that shows Date objects as Date(...) instead of bare strings. */
function stringify(value: unknown): string {
  const json = JSON.stringify(
    value,
    function replace(this: Record<string, unknown>, key: string, v: unknown) {
      const raw = this[key];
      return raw instanceof Date ? `__date__${raw.toISOString()}` : v;
    },
    2,
  );
  return (json ?? "undefined").replace(/"__date__([^"]*)"/g, 'Date("$1")');
}

/** The two sides of the boundary, live: what the engine holds, what ships. */
function BoundaryPeek<TApi, TContext, TFields extends FieldMap<TApi>>(props: {
  bundle: UseFormEngineReturn<TApi, TContext, TFields>;
  hint: ReactNode;
  sections: readonly {
    label: string;
    hint?: ReactNode;
    value: () => unknown;
  }[];
}) {
  useEngineTick(props.bundle);
  return (
    <aside className="readout readout--inline" aria-label="Engine data">
      <div className="readout__title">engine data</div>
      <p className="readout__hint">{props.hint}</p>
      {props.sections.map((section) => (
        <div key={section.label}>
          <div className="readout__label">{section.label}</div>
          {section.hint !== undefined && (
            <p className="readout__hint">{section.hint}</p>
          )}
          <pre className="readout__json">{stringify(section.value())}</pre>
        </div>
      ))}
    </aside>
  );
}

/* ── 1. a Date on a date field ─────────────────────────────────────── */

interface Dated {
  startedAt: Date;
}

const datedFields = {
  startedAt: {
    key: "startedAt",
    type: "date",
    label: "Started",
    // the API stores a Date; the date input speaks ISO strings.
    // without this pair the definition does not typecheck.
    transform: {
      parse: (date) => date.toISOString().slice(0, 10),
      serialize: (iso) => new Date(iso),
    },
  },
} as const satisfies FieldMap<Dated>;

function DateExample() {
  const bundle = useFormEngine<Dated, undefined, typeof datedFields>({
    fields: datedFields,
    modules: [{ fields: ["startedAt"] }],
    context: undefined,
    initialValues: { startedAt: new Date("2026-03-15T00:00:00Z") },
  });
  return (
    <div className="split">
      <div className="split__pane">
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
      </div>
      <BoundaryPeek
        bundle={bundle}
        hint="The API handed this form a Date object. Pick a different day
          and compare the two shapes."
        sections={[
          {
            label: "form model — startedAt",
            hint: "What parse produced: the input's own ISO string.",
            value: () => bundle.engine.getValue("startedAt"),
          },
          {
            label: "serialize()",
            hint: "A real Date object goes back to the API.",
            value: () => bundle.serialize(),
          },
        ]}
      />
    </div>
  );
}

/* ── 2. a record on a list field ───────────────────────────────────── */

interface Labeled {
  labels: Record<string, string>;
}

const labeledFields = {
  labels: {
    key: "labels",
    type: "keyValueList",
    label: "Labels",
    // the API stores a plain object; the form edits key/value rows
    transform: {
      parse: (record) =>
        Object.entries(record).map(([key, value]) => ({ key, value })),
      serialize: (entries) =>
        Object.fromEntries(entries.map((entry) => [entry.key, entry.value])),
    },
  },
} as const satisfies FieldMap<Labeled>;

function LabelsExample() {
  const bundle = useFormEngine<Labeled, undefined, typeof labeledFields>({
    fields: labeledFields,
    modules: [{ fields: ["labels"] }],
    context: undefined,
    initialValues: { labels: { env: "prod", region: "eu" } },
  });
  return (
    <div className="split">
      <div className="split__pane">
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
      </div>
      <BoundaryPeek
        bundle={bundle}
        hint="Transforms never see rows: parse returned plain { key, value }
          items, and the engine wrapped them afterwards."
        sections={[
          {
            label: "form model — labels",
            hint: "Rows — id, origin, meta — wrapped around the parsed items.",
            value: () => bundle.engine.getValue("labels"),
          },
          {
            label: "serialize()",
            hint: "Rows unwrap, blank rows drop, then serialize rebuilds the plain object.",
            value: () => bundle.serialize(),
          },
        ]}
      />
    </div>
  );
}

/* ── 3. the round trip is complete ─────────────────────────────────── */

interface Resource {
  title: string;
  id: string;
  ownerId: string;
  createdAt: string;
  revision: number;
}

const resourceFields = {
  title: { key: "title", type: "text", label: "Title" },
} as const satisfies FieldMap<Resource>;

function PassthroughExample() {
  const bundle = useFormEngine<Resource, undefined, typeof resourceFields>({
    fields: resourceFields,
    modules: [{ fields: ["title"] }],
    context: undefined,
    initialValues: {
      title: "Apollo",
      id: "res_8f4c",
      ownerId: "user_912",
      createdAt: "2026-01-08T09:30:00Z",
      revision: 7,
    },
  });
  return (
    <div className="split">
      <div className="split__pane">
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
      </div>
      <BoundaryPeek
        bundle={bundle}
        hint="One field, five API properties. Edit the title and watch the
          payload."
        sections={[
          {
            label: "serialize()",
            hint: "Serialization writes fields back onto the object that was parsed — the other four ride through untouched.",
            value: () => bundle.serialize(),
          },
        ]}
      />
    </div>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

export function Transforms() {
  return (
    <PageShell
      guide={guide("transforms")}
      title="Two models, one bridge per field"
      lede="Your API model and your form model don't always agree — a Date
        against a date input's ISO string, a plain object against editable
        rows. A transform is the per-field bridge: a parse/serialize pair on
        the definition, run by the engine at the boundary in both directions.
        The compiler decides whether you need one: where the types disagree,
        the definition doesn't typecheck without it. Transforms stay shape
        conversion only — logic that reacts to values belongs in rules,
        logic that judges them in validation."
      wide
    >
      <Exhibit
        title="A Date on a date field"
        note={
          <>
            <code>startedAt</code> is a <code>Date</code> in the API model but a{" "}
            <code>date</code> field speaks ISO strings, so this definition{" "}
            <em>requires</em> the pair — delete it and the field map stops
            compiling. Both callbacks are typed from context: <code>parse</code>{" "}
            receives the API value, <code>serialize</code> the form value, and
            no cast can smuggle a mismatch through.
          </>
        }
        bare
      >
        <Code>{`interface Project {
  startedAt: Date;   // the API's shape
}

startedAt: {
  key: "startedAt",
  type: "date",      // the input's shape: an ISO string
  transform: {       // required — the types disagree
    parse: (date) => date.toISOString().slice(0, 10),
    serialize: (iso) => new Date(iso),
  },
},`}</Code>
        <DateExample />
      </Exhibit>

      <Exhibit
        title="A plain object on a list field"
        note={
          <>
            The API stores <code>labels</code> as a record; the form edits
            key/value rows. The transform converts <em>items</em>, never rows —
            row identity and metadata belong to the engine, which wraps the
            parsed items afterwards. On the way out the order is reversed:
            unwrap, drop blank rows, then <code>serialize</code> rebuilds the
            object — add an empty row and it never gains an empty key.
          </>
        }
        bare
      >
        <Code>{`labels: Record<string, string>  // API: a plain object
type: "keyValueList"            // form: { key, value } rows

transform: {
  parse: (record) =>
    Object.entries(record).map(([key, value]) => ({ key, value })),
  serialize: (entries) =>
    Object.fromEntries(entries.map((e) => [e.key, e.value])),
},`}</Code>
        <LabelsExample />
      </Exhibit>

      <Exhibit
        title="The round trip is complete"
        note={
          <>
            Serialization doesn't build a payload from scratch — it writes
            fields back onto the object that was parsed. This form binds one
            property of a five-property resource; the other four pass through
            the parse/serialize round trip untouched, so a partial form never
            truncates the resource it edits.
          </>
        }
        bare
      >
        <Code>{`interface Resource {
  title: string;      // the only property any field binds
  id: string;
  ownerId: string;
  createdAt: string;
  revision: number;
}`}</Code>
        <PassthroughExample />
      </Exhibit>
    </PageShell>
  );
}
