import {
  type FieldMap,
  Form,
  FormRenderers,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { z } from "zod";
import { StateBadges } from "../components/EngineReadout";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

/* Every sub-example loads data that is already invalid, with
   initialErrors: "eager", so the rule is visible from the first paint
   and fixing the value shows feedback staying live. */

/* ── required & length ─────────────────────────────────────────────── */

interface LengthApi {
  name: string;
}

const lengthFields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true, maxLength: { value: 12 } },
  },
} as const satisfies FieldMap<LengthApi>;

function LengthExample() {
  const bundle = useFormEngine<LengthApi, undefined, typeof lengthFields>({
    fields: lengthFields,
    modules: [{ fields: ["name"] }],
    context: undefined,
    initialErrors: "eager",
    initialValues: { name: "A name that is far too long" },
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

/* ── pattern ────────────────────────────────────────────────────────── */

interface PatternApi {
  slug: string;
}

const patternFields = {
  slug: {
    key: "slug",
    type: "text",
    label: "URL slug",
    validation: {
      pattern: {
        value: /^[a-z0-9-]+$/,
        message: "Lowercase letters, digits, and dashes only",
      },
    },
  },
} as const satisfies FieldMap<PatternApi>;

function PatternExample() {
  const bundle = useFormEngine<PatternApi, undefined, typeof patternFields>({
    fields: patternFields,
    modules: [{ fields: ["slug"] }],
    context: undefined,
    initialErrors: "eager",
    initialValues: { slug: "Hello World!" },
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

/* ── numeric bounds ─────────────────────────────────────────────────── */

interface BoundsApi {
  budget: number;
}

const boundsFields = {
  budget: {
    key: "budget",
    type: "number",
    label: "Budget",
    validation: { min: { value: 0 }, max: { value: 100000 } },
  },
} as const satisfies FieldMap<BoundsApi>;

function BoundsExample() {
  const bundle = useFormEngine<BoundsApi, undefined, typeof boundsFields>({
    fields: boundsFields,
    modules: [{ fields: ["budget"] }],
    context: undefined,
    initialErrors: "eager",
    initialValues: { budget: -50 },
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

/* ── item counts ────────────────────────────────────────────────────── */

interface CountApi {
  tags: string[];
}

const countFields = {
  tags: {
    key: "tags",
    type: "stringList",
    label: "Tags",
    validation: { minItems: { value: 2 }, maxItems: { value: 3 } },
  },
} as const satisfies FieldMap<CountApi>;

function CountExample() {
  const bundle = useFormEngine<CountApi, undefined, typeof countFields>({
    fields: countFields,
    modules: [{ fields: ["tags"] }],
    context: undefined,
    initialErrors: "eager",
    initialValues: { tags: ["infra"] },
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

/* ── custom (cross-field) ───────────────────────────────────────────── */

interface CustomApi {
  kind: string;
  budget: number;
}

/** Each project kind carries its own budget floor. */
const kindRules = {
  pilot: { label: "Pilot", minBudget: 0 },
  standard: { label: "Standard", minBudget: 10_000 },
  enterprise: { label: "Enterprise", minBudget: 50_000 },
} as const;

const customFields = {
  kind: {
    key: "kind",
    type: "select",
    label: "Kind",
    config: {
      items: [
        { label: "Pilot — no minimum", value: "pilot" },
        { label: "Standard — from 10,000", value: "standard" },
        { label: "Enterprise — from 50,000", value: "enterprise" },
      ],
    },
    defaultValue: "pilot",
  },
  budget: {
    key: "budget",
    type: "number",
    label: "Budget",
    validation: {
      custom: (budget, values) => {
        const rule = kindRules[values.kind as keyof typeof kindRules];
        return rule !== undefined && budget < rule.minBudget
          ? `${rule.label} projects need a budget of at least ${rule.minBudget.toLocaleString("en-US")}`
          : null;
      },
    },
  },
} as const satisfies FieldMap<CustomApi>;

function CustomExample() {
  const bundle = useFormEngine<CustomApi, undefined, typeof customFields>({
    fields: customFields,
    modules: [{ fields: ["kind", "budget"] }],
    context: undefined,
    initialErrors: "eager",
    initialValues: { kind: "enterprise", budget: 25_000 },
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

/* ── Standard Schema (Zod) ──────────────────────────────────────────── */

interface SchemaApi {
  amount: number;
}

const schemaFields = {
  amount: {
    key: "amount",
    type: "number",
    label: "Amount",
    description: "z.number().int().multipleOf(100)",
    validation: { schema: z.number().int().multipleOf(100) },
  },
} as const satisfies FieldMap<SchemaApi>;

function SchemaExample() {
  const bundle = useFormEngine<SchemaApi, undefined, typeof schemaFields>({
    fields: schemaFields,
    modules: [{ fields: ["amount"] }],
    context: undefined,
    initialErrors: "eager",
    initialValues: { amount: 250 },
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

/* ── display policy: gated vs eager, side by side ───────────────────── */

interface PolicyApi {
  name: string;
}

const policyFields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true, maxLength: { value: 12 } },
  },
} as const satisfies FieldMap<PolicyApi>;

function PolicyPane(props: { policy: "gated" | "eager"; note: string }) {
  const bundle = useFormEngine<PolicyApi, undefined, typeof policyFields>({
    fields: policyFields,
    modules: [{ fields: ["name"] }],
    context: undefined,
    initialErrors: props.policy,
    initialValues: { name: "A name that is far too long" },
  });
  return (
    <div className="split__pane">
      <h3 className="split__heading">initialErrors: "{props.policy}"</h3>
      <p className="split__note">{props.note}</p>
      <StateBadges bundle={bundle} />
      <FormRenderers renderers={htmlRenderers}>
        <Form form={bundle}>
          <Form.AutoFields />
        </Form>
      </FormRenderers>
      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={() => void bundle.handleSubmit()}
        >
          Save
        </button>
        <button type="button" className="btn" onClick={() => bundle.reset()}>
          Reset
        </button>
      </div>
    </div>
  );
}

/* ── server errors ──────────────────────────────────────────────────── */

interface ServerApi {
  name: string;
}

const serverFields = {
  name: { key: "name", type: "text", label: "Project name" },
} as const satisfies FieldMap<ServerApi>;

function ServerExample() {
  const bundle = useFormEngine<ServerApi, undefined, typeof serverFields>({
    fields: serverFields,
    modules: [{ fields: ["name"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: { name: "Apollo" },
  });
  return (
    <>
      <FormRenderers renderers={htmlRenderers}>
        <Form form={bundle}>
          <Form.AutoFields />
        </Form>
      </FormRenderers>
      <div className="actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() =>
            bundle.engine.setServerError("name", "Name already taken")
          }
        >
          Reject name (as the server)
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => bundle.engine.clearServerError("name")}
        >
          Clear manually
        </button>
      </div>
    </>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

export function Validation() {
  return (
    <PageShell
      guide={guide("validation")}
      title="Every way a field can fail"
      lede="Validation rules are data on the field definition, drawn from each
        type's own vocabulary, and every rule ships a sensible error message
        (overridable per rule, or per locale). On top of that: two escape
        hatches for what data can't express, a display policy deciding when
        errors are shown, and a channel for the server's verdicts. Each
        example below loaded already-invalid data, so fix it and watch the
        feedback stay live."
    >
      <div className="gallery">
        <Exhibit
          title="Required & length"
          note="Shorten the name and the error clears mid-keystroke; clear it
            entirely and required takes over."
        >
          <LengthExample />
        </Exhibit>

        <Exhibit
          title="Pattern"
          note={
            <>
              Every rule ships a default message, but a <code>RegExp</code>{" "}
              can't explain itself — without a <code>message</code> this would
              read “Invalid format” — so pattern is the one rule you'll usually
              write your own for. Lowercase the slug to satisfy it.
            </>
          }
        >
          <PatternExample />
        </Exhibit>

        <Exhibit
          title="Bounds"
          note={
            <>
              <code>min</code>/<code>max</code> on numbers; date fields take the
              same bounds as ISO strings. Raise the budget to zero or above.
            </>
          }
        >
          <BoundsExample />
        </Exhibit>

        <Exhibit
          title="Item counts"
          note={
            <>
              <code>minItems</code> and <code>maxItems</code> count non-blank
              rows, so an empty row doesn't count either way. Add a second tag
              to satisfy the minimum — then keep going: a fourth breaks the
              maximum of 3.
            </>
          }
        >
          <CountExample />
        </Exhibit>

        <Exhibit
          title="Custom — cross-field"
          note="A custom check sees the whole form's values: each kind
            carries its own budget floor, and the budget's error follows
            the kind. This 25,000 budget is too small for an Enterprise
            project — switch the kind to Standard and the same number
            becomes valid."
        >
          <CustomExample />
        </Exhibit>

        <Exhibit
          title="Standard Schema — Zod"
          note={
            <>
              The <code>schema</code> slot takes any Standard Schema validator
              (Zod, Valibot, ArkType…) with zero engine dependencies. Try 300 —
              or 250.5.
            </>
          }
        >
          <SchemaExample />
        </Exhibit>
      </div>

      <Exhibit
        title="When errors show — the display policy"
        note="Both forms loaded identical invalid data and validate
          identically — the invalid light is on in both. Only display
          differs: eager flags bad API data immediately (right for edit
          forms); gated waits for a blur or a submit (right for create
          forms). Press Save in the gated form to open every gate at once."
        bare
      >
        <div className="split">
          <PolicyPane
            policy="gated"
            note="Nothing shows yet — blur the field or press Save."
          />
          <PolicyPane
            policy="eager"
            note="The same errors, revealed from the first paint."
          />
        </div>
      </Exhibit>

      <Exhibit
        title="Server errors"
        note="Some verdicts only the outside world can give — a uniqueness
          check, a rejected save. Pin one onto the field: it shows
          immediately, no touch gate, and clears on the first keystroke
          because an edit invalidates the old verdict."
      >
        <ServerExample />
      </Exhibit>
    </PageShell>
  );
}
