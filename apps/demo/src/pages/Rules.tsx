import {
  type FieldMap,
  Form,
  FormRenderers,
  formBuilder,
  type UseFormEngineReturn,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { type ReactNode, useRef, useState } from "react";
import { Code } from "../components/Code";
import {
  FieldStateTable,
  StateBadges,
  useEngineTick,
} from "../components/EngineReadout";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

/**
 * The engine data one exhibit changes: the state lights, optionally the
 * per-field flags, and the payload serialize() would produce right now.
 */
function EnginePeek<TApi, TContext, TFields extends FieldMap<TApi>>(props: {
  bundle: UseFormEngineReturn<TApi, TContext, TFields>;
  hint: ReactNode;
  fieldState?: boolean;
  serializeHint?: ReactNode;
}) {
  useEngineTick(props.bundle);
  return (
    <aside className="readout readout--inline" aria-label="Engine data">
      <div className="readout__title">engine data</div>
      <p className="readout__hint">{props.hint}</p>
      <StateBadges bundle={props.bundle} />
      {props.fieldState === true && (
        <>
          <div className="readout__label">field state</div>
          <FieldStateTable bundle={props.bundle} />
        </>
      )}
      <div className="readout__label">serialize()</div>
      {props.serializeHint !== undefined && (
        <p className="readout__hint">{props.serializeHint}</p>
      )}
      <pre className="readout__json">
        {JSON.stringify(props.bundle.serialize(), null, 2)}
      </pre>
    </aside>
  );
}

/** The shape the page is about — the exact rule in the first example. */
const ruleAnatomy = `const financialVisibility = bc.rule({
  watch: ["funded"],                  // the fields this rule reacts to
  when: (funded) => funded,           // watched values, typed positionally
  apply: (form) => {                  // runs on each watched change while true
    form.setVisible("budget", true);  // + forecast, costCenter
  },
  otherwise: (form) => {              // runs once, on the transition to false
    form.setVisible("budget", false);
  },
});`;

/* ── 1. a visibility rule, and the whenHidden policies ─────────────── */

interface Financials {
  funded: boolean;
  budget: number;
  forecast: number;
  costCenter: string;
}

const financeFields = {
  funded: { key: "funded", type: "checkbox", label: "Funded project" },
  budget: {
    key: "budget",
    type: "number",
    label: "Budget",
    description: 'whenHidden: "omit" (default) — the key disappears',
    validation: { required: true },
  },
  forecast: {
    key: "forecast",
    type: "number",
    label: "Forecast",
    description: 'whenHidden: "null" — the backend sees an explicit null',
    whenHidden: "null",
  },
  costCenter: {
    key: "costCenter",
    type: "text",
    label: "Cost center",
    description: 'whenHidden: "keep" — hidden, but still submitted',
    whenHidden: "keep",
  },
} as const satisfies FieldMap<Financials>;

const fb = formBuilder<Financials>()
  .withFields(financeFields)
  .withContext<undefined>();

const financialVisibility = fb.rule({
  watch: ["funded"],
  when: (funded) => funded,
  apply: (form) => {
    form.setVisible("budget", true);
    form.setVisible("forecast", true);
    form.setVisible("costCenter", true);
  },
  otherwise: (form) => {
    form.setVisible("budget", false);
    form.setVisible("forecast", false);
    form.setVisible("costCenter", false);
  },
});

const financeModules = [
  fb.module({
    fields: ["funded", "budget", "forecast", "costCenter"],
    rules: [financialVisibility],
  }),
];

function VisibilityExample() {
  const bundle = useFormEngine<Financials, undefined, typeof financeFields>({
    fields: financeFields,
    modules: financeModules,
    context: undefined,
    initialErrors: "eager",
    initialValues: { budget: 25000, forecast: 12000, costCenter: "CC-7" },
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
      <EnginePeek
        bundle={bundle}
        hint="Visibility is engine state, not conditional rendering — the
          field state and the payload both react to it."
        fieldState
        serializeHint="One hidden flag, three payload policies: budget's key
          is gone, forecast is an explicit null, costCenter kept its value."
      />
    </div>
  );
}

/* ── 2. a derivation rule: writes that never dirty ─────────────────── */

interface Order {
  quantity: number;
  unitPrice: number;
  total: number;
}

const orderFields = {
  quantity: { key: "quantity", type: "number", label: "Quantity" },
  unitPrice: { key: "unitPrice", type: "number", label: "Unit price" },
  total: {
    key: "total",
    type: "number",
    label: "Total",
    description: "written by a rule — quantity × unit price",
  },
} as const satisfies FieldMap<Order>;

const ob = formBuilder<Order>()
  .withFields(orderFields)
  .withContext<undefined>();

const totalDerivation = ob.rule({
  watch: ["quantity", "unitPrice"],
  apply: (form) => {
    const quantity = form.getValue("quantity");
    const unitPrice = form.getValue("unitPrice");
    form.setValue(
      "total",
      (typeof quantity === "number" ? quantity : 0) *
        (typeof unitPrice === "number" ? unitPrice : 0),
    );
  },
});

const orderModules = [
  ob.module({
    fields: ["quantity", "unitPrice", "total"],
    rules: [totalDerivation],
  }),
];

function DerivationExample() {
  const bundle = useFormEngine<Order, undefined, typeof orderFields>({
    fields: orderFields,
    modules: orderModules,
    context: undefined,
    initialErrors: "gated",
    initialValues: { quantity: 3, unitPrice: 40 },
  });
  return (
    <div className="split">
      <div className="split__pane">
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
        <div className="actions">
          <button type="button" className="btn" onClick={() => bundle.reset()}>
            Reset
          </button>
        </div>
      </div>
      <EnginePeek
        bundle={bundle}
        hint="The pristine light is the point: the rule wrote total before
          first paint, and it's still off."
        serializeHint="The derived total ships like any other value."
      />
    </div>
  );
}

/* ── 3. rung 2: the engine API from page code ──────────────────────── */

interface Assignment {
  assignee: string;
  budget: number;
}

const rungTwoFields = {
  assignee: {
    key: "assignee",
    type: "select",
    label: "Assignee",
    description: "options arrive via engine.setOptions",
  },
  budget: { key: "budget", type: "number", label: "Budget" },
} as const satisfies FieldMap<Assignment>;

function RungTwoExample() {
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bundle = useFormEngine<Assignment, undefined, typeof rungTwoFields>({
    fields: rungTwoFields,
    modules: [{ fields: ["assignee", "budget"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: { budget: 25000 },
  });

  const loadAssignees = () => {
    setLoading(true);
    clearTimeout(timer.current);
    // your data layer fetches; the engine only receives the result
    timer.current = setTimeout(() => {
      bundle.engine.setOptions("assignee", [
        { label: "Alice Muniz", value: "alice" },
        { label: "Sam Ortiz", value: "sam" },
        { label: "Dana Reyes", value: "dana" },
      ]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="split">
      <div className="split__pane">
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
        <div className="actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={loading}
            onClick={loadAssignees}
          >
            {loading ? "Loading…" : "Load assignees (as your data layer)"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => bundle.engine.setValue("budget", 50000)}
          >
            Import budget (setValue)
          </button>
          <button type="button" className="btn" onClick={() => bundle.reset()}>
            Reset
          </button>
        </div>
      </div>
      <EnginePeek
        bundle={bundle}
        hint="Watch the dirty light: options landing leave it off; a
          page-code setValue turns it on."
        serializeHint="Options never appear here — they're state, not values."
      />
    </div>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

export function Rules() {
  return (
    <PageShell
      guide={guide("rules")}
      title="Rung 1 reacts to values, rung 2 to the app"
      lede="Dynamic behavior climbs a ladder, and you climb only as high as
        a requirement forces: schema data that doesn't move, then rules —
        declarative watchers that run inside the engine — then imperative
        engine calls from page code. The differences that matter here (what
        serializes, what counts as dirty) live in engine data, so each
        example is paired with it."
      wide
    >
      <Exhibit
        title="Anatomy of a rule"
        note={
          <>
            A rule is a declarative watcher with typed code inside, made through
            the form builder so everything infers from <code>watch</code> — no
            condition language to learn, <code>when</code> is a function. This
            is the exact rule running in the next example; it attaches to the
            form through a module, so a slice of fields travels with its
            behavior.
          </>
        }
        bare
      >
        <Code>{ruleAnatomy}</Code>
      </Exhibit>

      <Exhibit
        title="A rule owns visibility"
        note={
          <>
            The rule above, live — and it already ran on the initial, unfunded
            pass. Hiding is not clearing (check Funded: nothing was lost),
            hidden fields are excluded from validation (budget is required, yet
            the invalid light is off), and each field's <code>whenHidden</code>{" "}
            policy decides what the payload gets.
          </>
        }
        bare
      >
        <VisibilityExample />
      </Exhibit>

      <Exhibit
        title="Derived values — rule writes never dirty the form"
        note={
          <>
            No <code>when</code>, so <code>apply</code> reruns on every watched
            change, recomputing the total. It ran before first paint too — yet
            the form is pristine, because rule writes are derived state:
            recomputable from inputs, so losing them loses nothing, and an
            unsaved-changes warning here would cry wolf. Edit a quantity and the
            dirty light comes on — from your edit, not the rule's write.
          </>
        }
        bare
      >
        <DerivationExample />
      </Exhibit>

      <Exhibit
        title="Rung 2 — the same calls, made from page code"
        note={
          <>
            The surface rules receive is also on <code>bundle.engine</code>, for
            behavior that reacts to the app rather than to form values. One
            difference: page-code writes are the <em>user channel</em>. Load the
            options and the form stays pristine — options aren't values. Import
            the budget — the identical <code>setValue</code> a rule could make —
            and it dirties the form. You don't choose the channel; it follows
            from where the call is made, so provenance can't lie.
          </>
        }
        bare
      >
        <RungTwoExample />
      </Exhibit>
    </PageShell>
  );
}
