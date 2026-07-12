import {
  type FieldMap,
  Form,
  FormRenderers,
  formBuilder,
  type UseFormEngineReturn,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { type ReactNode, useState } from "react";
import { Code } from "../components/Code";
import {
  FieldStateTable,
  StateBadges,
  useEngineTick,
} from "../components/EngineReadout";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

/** The engine data behind the context exhibit, live. */
function ModulePeek<TApi, TContext, TFields extends FieldMap<TApi>>(props: {
  bundle: UseFormEngineReturn<TApi, TContext, TFields>;
  hint: ReactNode;
  serializeHint?: ReactNode;
}) {
  useEngineTick(props.bundle);
  return (
    <aside className="readout readout--inline" aria-label="Engine data">
      <div className="readout__title">engine data</div>
      <p className="readout__hint">{props.hint}</p>
      <StateBadges bundle={props.bundle} />
      <div className="readout__label">field state</div>
      <FieldStateTable bundle={props.bundle} />
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

/* ── 1. one vocabulary, two forms ──────────────────────────────────── */

interface Project {
  name: string;
  kind: string;
  budget: number;
}

const projectFields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true },
  },
  kind: {
    key: "kind",
    type: "select",
    label: "Kind",
    config: {
      items: [
        { label: "Simple", value: "simple" },
        { label: "Funded", value: "funded" },
      ],
    },
    defaultValue: "simple",
  },
  budget: { key: "budget", type: "number", label: "Budget" },
} as const satisfies FieldMap<Project>;

const b = formBuilder<Project>().withFields(projectFields);

const basics = b.module({ fields: ["name", "kind"] });

const financials = b.module({
  fields: ["budget"],
  overrides: {
    budget: {
      label: "Budget (EUR)",
      validation: { required: true, min: { value: 0 } },
    },
  },
});

function VariantPane(props: {
  heading: string;
  note: string;
  modules: (typeof basics)[];
}) {
  const bundle = useFormEngine<Project, unknown, typeof projectFields>({
    fields: projectFields,
    modules: props.modules,
    context: undefined,
    initialErrors: "gated",
    initialValues: { name: "Apollo" },
  });
  return (
    <div className="split__pane">
      <h3 className="split__heading">{props.heading}</h3>
      <p className="split__note">{props.note}</p>
      <FormRenderers renderers={htmlRenderers}>
        <Form form={bundle}>
          <Form.AutoFields />
        </Form>
      </FormRenderers>
    </div>
  );
}

/* ── 2. context decides what materializes ──────────────────────────── */

interface Billing {
  name: string;
  budget: number;
  invoiceEmail: string;
  currency: string;
}

const billingFields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true },
  },
  budget: { key: "budget", type: "number", label: "Budget" },
  invoiceEmail: {
    key: "invoiceEmail",
    type: "text",
    label: "Invoice email",
    validation: { pattern: { value: /^\S+@\S+$/, message: "Not an email" } },
  },
} as const satisfies FieldMap<Billing>;

interface Ctx {
  tier: "starter" | "pro";
}

const bc = formBuilder<Billing>().withFields(billingFields).withContext<Ctx>();

const billingBasics = bc.module({ fields: ["name"] });

// consulted at resolution; may opt out entirely — and it guarantees a
// currency in the payload without defining (or rendering) a field for it
const billing = bc.moduleFactory((ctx) =>
  ctx.tier === "pro"
    ? { fields: ["budget", "invoiceEmail"], defaults: { currency: "EUR" } }
    : null,
);

function ContextExample() {
  const [tier, setTier] = useState<Ctx>({ tier: "starter" });
  const bundle = useFormEngine<Billing, Ctx, typeof billingFields>({
    fields: billingFields,
    modules: [billingBasics, billing],
    context: tier,
    initialErrors: "gated",
  });

  return (
    <div className="split">
      <div className="split__pane">
        <div className="context-bar">
          <span className="context-bar__label">Plan tier (form context)</span>
          <div
            className="context-bar__options"
            role="radiogroup"
            aria-label="Plan tier"
          >
            {(["starter", "pro"] as const).map((option) => (
              <label key={option} className="context-bar__option">
                <input
                  type="radio"
                  name="tier"
                  checked={tier.tier === option}
                  onChange={() => setTier({ tier: option })}
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
      <ModulePeek
        bundle={bundle}
        hint="Switch the tier and watch: the schema re-resolves on the same
          form instance — touched flags survive, and the dirty light never
          blinks, because a context switch is not a user edit."
        serializeHint="On pro, the payload gains a currency the form never
          renders — a module default, not a hidden field."
      />
    </div>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

export function ModulesContext() {
  return (
    <PageShell
      guide={guide("modules")}
      title="One schema, assembled per situation"
      lede="A field map is a vocabulary; a module is a sentence built from it
        — a slice of fields carrying its own overrides, rules, and defaults.
        A form is just a list of modules, which is how near-identical
        variants share one definition instead of drifting apart as copies.
        Context decides, at resolution, which modules materialize."
      wide
    >
      <Exhibit
        title="One vocabulary, two forms"
        note={
          <>
            Both forms draw from the same field map; they differ only in their
            module list. The full variant's <code>financials</code> module also
            overrides the budget it includes — new label, stricter validation —
            and overrides may touch any slot except <code>key</code> and{" "}
            <code>type</code>, a field's identity. All of it is checked against
            the map: a typo'd name is a compile error.
          </>
        }
        bare
      >
        <Code>{`const basics = b.module({ fields: ["name", "kind"] });

const financials = b.module({
  fields: ["budget"],
  overrides: { budget: {  // adjust anything but key & type
    label: "Budget (EUR)",
    validation: { required: true, min: { value: 0 } },
  } },
});

// two variants, zero copied definitions
modules: [basics]              // quick create
modules: [basics, financials]  // full edit`}</Code>
        <div className="split">
          <VariantPane
            heading="Quick create"
            note="modules: [basics]"
            modules={[basics]}
          />
          <VariantPane
            heading="Full edit"
            note="modules: [basics, financials] — note the overridden budget"
            modules={[basics, financials]}
          />
        </div>
      </Exhibit>

      <Exhibit
        title="Context decides what materializes"
        note={
          <>
            Context is read-only data the form is created with — a plan tier, a
            role, feature flags. A module <em>factory</em> consults it at
            resolution and returns a module or <code>null</code>, so the{" "}
            <code>modules</code> list stays declarative while the context
            decides what exists. Blur the empty name to reveal its error, then
            switch tiers: the schema changes in place and the error survives —
            the form never forgets where the user was.
          </>
        }
        bare
      >
        <Code>{`const bc = b.withContext<{ tier: "starter" | "pro" }>();

// consulted at resolution; may opt out entirely
const billing = bc.moduleFactory((ctx) =>
  ctx.tier === "pro"
    ? { fields: ["budget", "invoiceEmail"],
        defaults: { currency: "EUR" } }  // a value, no field
    : null,
);

useFormEngine({ fields, modules: [basics, billing], context: tier });`}</Code>
        <ContextExample />
      </Exhibit>
    </PageShell>
  );
}
