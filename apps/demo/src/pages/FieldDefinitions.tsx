import {
  type FieldMap,
  Form,
  FormRenderers,
  type UseFormEngineReturn,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { type ReactNode, useState } from "react";
import { Code } from "../components/Code";
import { useEngineTick } from "../components/EngineReadout";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

/** JSON view that keeps NaN visible instead of JSON's null. */
function stringify(value: unknown): string {
  const json = JSON.stringify(
    value,
    (_key, v) => (typeof v === "number" && Number.isNaN(v) ? "__NaN__" : v),
    2,
  );
  return (json ?? "undefined").replaceAll('"__NaN__"', "NaN");
}

/** The engine data behind one exhibit, live. */
function DefinitionPeek<TApi, TContext, TFields extends FieldMap<TApi>>(props: {
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

/* ── one map, drawn from by both exhibits ──────────────────────────── */

interface Project {
  name: string;
  budget: number;
  launchDate: string;
  settings: { visibility: "private" | "public" };
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true, maxLength: { value: 40 } },
  },
  budget: { key: "budget", type: "number", label: "Budget" },
  launchDate: { key: "launchDate", type: "date", label: "Launch date" },
  // the map name is the field's identity; the key is the API path it binds
  visibility: {
    key: "settings.visibility",
    type: "select",
    label: "Visibility",
    config: {
      items: [
        { label: "Private", value: "private" },
        { label: "Public", value: "public" },
      ],
    },
    defaultValue: "private",
  },
} as const satisfies FieldMap<Project>;

/* ── 1. the name and the key are different things ──────────────────── */

function IdentityExample() {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "visibility"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: { name: "Apollo", settings: { visibility: "public" } },
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
      <DefinitionPeek
        bundle={bundle}
        hint="Identity on one side of the boundary, path on the other. Flip
          the visibility and watch both."
        sections={[
          {
            label: "form model — visibility",
            hint: "Code reads and writes the field by its map name, flat.",
            value: () => bundle.engine.getValue("visibility"),
          },
          {
            label: "serialize()",
            hint: "The payload gets the key it binds: settings.visibility.",
            value: () => bundle.serialize(),
          },
        ]}
      />
    </div>
  );
}

/* ── 2. absence never reaches the form ─────────────────────────────── */

type PayloadName = "full" | "sparse" | "empty";

const payloads: Record<PayloadName, Partial<Project>> = {
  full: {
    budget: 25000,
    launchDate: "2026-09-01",
    settings: { visibility: "public" },
  },
  sparse: { budget: 25000 },
  empty: {},
};

function AbsenceExample() {
  const [payload, setPayload] = useState<PayloadName>("full");
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["budget", "launchDate", "visibility"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: payloads.full,
  });
  return (
    <div className="split">
      <div className="split__pane">
        <div className="context-bar">
          <span className="context-bar__label">Incoming API payload</span>
          <div
            className="context-bar__options"
            role="radiogroup"
            aria-label="Incoming API payload"
          >
            {(["full", "sparse", "empty"] as const).map((option) => (
              <label key={option} className="context-bar__option">
                <input
                  type="radio"
                  name="payload"
                  checked={payload === option}
                  onChange={() => {
                    setPayload(option);
                    bundle.reset(payloads[option]);
                  }}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
      </div>
      <DefinitionPeek
        bundle={bundle}
        hint="Switch payloads and watch parse fill the gaps — the form model
          never holds undefined."
        sections={[
          {
            label: "form model — after parse",
            hint: "On sparse: launchDate got the type's empty value, visibility fell back to its defaultValue.",
            value: () => ({
              budget: bundle.engine.getValue("budget"),
              launchDate: bundle.engine.getValue("launchDate"),
              visibility: bundle.engine.getValue("visibility"),
            }),
          },
          {
            label: "serialize()",
            hint: "An empty budget is NaN in the form model — and omitted here, never sent.",
            value: () => bundle.serialize(),
          },
        ]}
      />
    </div>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

export function FieldDefinitions() {
  return (
    <PageShell
      guide={guide("field-definitions")}
      title="Fields are data; parsing fills the gaps"
      lede="A form starts as a field map: plain TypeScript data describing
        every field the form can have — no JSX, no registration calls, an
        object you can export, share between forms, and test like any other
        value. Both exhibits below draw different slices from the same map;
        which fields a given form uses is the job of modules, one guide
        over."
      wide
    >
      <Exhibit
        title="The name and the key are different things"
        note={
          <>
            The map name is the field's identity: modules select{" "}
            <code>"visibility"</code>, <code>Form.Field</code> renders it,{" "}
            <code>getValue</code> reads it. The <code>key</code> is the API path
            it binds — a nested or unwieldy path can sit behind a friendlier
            name. And the closing idiom is load-bearing: <code>satisfies</code>{" "}
            checks every key, value domain, and validation rule against{" "}
            <code>Project</code> at the definition site, while{" "}
            <code>as const</code> keeps the literal types everything else infers
            from.
          </>
        }
        bare
      >
        <Code>{`interface Project {
  name: string;
  settings: { visibility: "private" | "public" };
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true, maxLength: { value: 40 } },
  },
  visibility: {
    key: "settings.visibility",  // a checked path — typos don't compile
    type: "select",
    label: "Visibility",
    config: { items: [{ label: "Private", value: "private" }, ...] },
    defaultValue: "private",
  },
} as const satisfies FieldMap<Project>;  // ← load-bearing`}</Code>
        <IdentityExample />
      </Exhibit>

      <Exhibit
        title="Absence never reaches the form"
        note={
          <>
            One map, three payloads. Whatever the API leaves out, parsing fills:{" "}
            <code>defaultValue</code> first, the type's empty value past that —{" "}
            <code>""</code> for text, date, and select, <code>false</code> for
            checkbox, <code>[]</code> for lists, <code>NaN</code> for number.
            Renderers and rules never defend against <code>undefined</code>. The{" "}
            <code>NaN</code> choice is deliberate: it's the only "no value yet"
            that is honestly a number — an empty number input yields it,{" "}
            <code>required</code> treats it as missing, and serialize omits the
            key rather than sending it.
          </>
        }
        bare
      >
        <Code>{`const full   = { budget: 25000, launchDate: "2026-09-01",
                 settings: { visibility: "public" } };
const sparse = { budget: 25000 };  // the rest is missing
const empty  = {};                 // everything is missing

// per field: value at key → defaultValue → the type's empty value`}</Code>
        <AbsenceExample />
      </Exhibit>
    </PageShell>
  );
}
