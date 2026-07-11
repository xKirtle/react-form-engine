import {
  type FieldMap,
  type FieldRenderProps,
  type FieldTypeRuntime,
  type FieldTypeSpec,
  Form,
  FormRenderers,
  useFormEngine,
} from "@react-form-engine/core";
import { FieldFrame, htmlRenderers } from "@react-form-engine/renderers-html";
import { useState } from "react";
import { EngineReadout } from "../components/EngineReadout";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

/* ── 1. register the type: what values it holds, what config it takes ── */
declare module "@react-form-engine/core" {
  interface FieldTypeRegistry {
    rating: FieldTypeSpec<number, { max: number }>;
  }
}

/* ── 2. the runtime: what the engine needs to parse it ─────────────── */
const appFieldTypes: Record<string, FieldTypeRuntime> = {
  rating: { emptyValue: () => Number.NaN },
};

/* ── 3. the renderer: same contract as every built-in ──────────────── */
function RatingRenderer(props: FieldRenderProps) {
  const value = props.value as number;
  const max =
    (props.definition.config as { max: number } | undefined)?.max ?? 5;
  return (
    <FieldFrame
      label={props.definition.label ?? props.name}
      description={props.definition.description}
      error={props.presentation.error}
      required={props.required}
      asGroup
    >
      {() => (
        <div
          className="rating"
          role="radiogroup"
          aria-label={String(props.definition.label)}
        >
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            // biome-ignore lint/a11y/useSemanticElements: an ARIA radiogroup of buttons is the star-rating pattern the guide's walkthrough uses; this page mirrors that code exactly
            <button
              key={n}
              type="button"
              className="rating__star"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} of ${max}`}
              onClick={() => props.setValue(n)}
              onBlur={props.markTouched}
            >
              {value >= n ? "★" : "☆"}
            </button>
          ))}
        </div>
      )}
    </FieldFrame>
  );
}

interface Survey {
  respondent: string;
  satisfaction: number;
}

const fields = {
  respondent: {
    key: "respondent",
    type: "text",
    label: "Your name",
  },
  satisfaction: {
    key: "satisfaction", // must be a number in the API model
    type: "rating",
    label: "Satisfaction",
    config: { max: 5 }, // typed against the registration
    validation: { min: { value: 1, message: "Rate at least one star" } },
  },
} as const satisfies FieldMap<Survey>;

const schemaPeek = `// 1. registration — module augmentation, once for the app
declare module "@react-form-engine/core" {
  interface FieldTypeRegistry {
    rating: FieldTypeSpec<number, { max: number }>;
  }
}

// 2. runtime — the engine refuses types it can't parse
const appFieldTypes = {
  rating: { emptyValue: () => Number.NaN },
};

// 3. use — checked like any built-in
satisfaction: {
  key: "satisfaction",              // must be number-valued
  type: "rating",
  config: { max: 5 },               // wrong shape = compile error
  validation: { min: { value: 1 } }, // number vocabulary, for free
},

<FormRenderers renderers={{ ...htmlRenderers, rating: RatingRenderer }}>`;

export function CustomFieldTypes() {
  const [submitted, setSubmitted] = useState<unknown>();
  const bundle = useFormEngine<Survey, undefined, typeof fields>({
    fields,
    fieldTypes: appFieldTypes,
    modules: [{ fields: ["respondent", "satisfaction"] }],
    context: undefined,
    initialErrors: "gated",
    onSubmit: (survey) => setSubmitted(survey),
  });

  return (
    <PageShell
      guide={guide("custom-field-types")}
      title="A registered type is a built-in"
      lede={
        <>
          The star rating below is the guide&apos;s walkthrough, live: a{" "}
          <code>rating</code> type registered in three small parts — a type
          registration, a runtime entry, a renderer. From there the compiler
          treats it like <code>number</code>: it binds only number-valued keys,
          takes the number validation vocabulary, and checks its{" "}
          <code>config</code> shape.
        </>
      }
      tries={[
        "Click a star and watch satisfaction serialize as a plain number — the custom type is ordinary data on the way out.",
        "Before any click, open the form model: the rating holds NaN, the type's declared empty value. Absence never reaches the form.",
        "Press Submit with no stars — min: { value: 1 } fails with the field's own message. The number vocabulary came free with the value domain.",
        "The renderer wraps its buttons in FieldFrame, so the label, error, and live-region plumbing match the built-ins around it.",
      ]}
      schema={schemaPeek}
      readout={<EngineReadout bundle={bundle} submitted={submitted} />}
    >
      <Exhibit>
        <FormRenderers renderers={{ ...htmlRenderers, rating: RatingRenderer }}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
        <div className="actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void bundle.handleSubmit()}
          >
            Submit survey
          </button>
          <button type="button" className="btn" onClick={() => bundle.reset()}>
            Reset
          </button>
        </div>
      </Exhibit>
    </PageShell>
  );
}
