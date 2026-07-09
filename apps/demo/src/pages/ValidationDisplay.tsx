import {
  type FieldMap,
  Form,
  FormRenderers,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { useState } from "react";
import { EngineReadout } from "../components/EngineReadout";
import { PageShell } from "../components/PageShell";

interface Project {
  name: string;
  budget: number;
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true, maxLength: { value: 12 } },
  },
  budget: {
    key: "budget",
    type: "number",
    label: "Budget",
    validation: { min: { value: 0 } },
  },
} as const satisfies FieldMap<Project>;

type Policy = "eager" | "gated";

function PolicyForm(props: {
  policy: Policy;
  onPolicyChange: (policy: Policy) => void;
}) {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "budget"] }],
    context: undefined,
    initialErrors: props.policy,
    // data that is already invalid, as if loaded from the API
    initialValues: { name: "A name that is too long", budget: -50 },
  });

  return (
    <PageShell
      eyebrow="validation display"
      title="One feature: when computed errors are shown"
      lede="Both policies validate identically — watch the field state panel:
        invalid is the engine's raw verdict, shown is what the user sees, and
        touched is the per-field gate between them."
      tries={[
        "Under gated, nothing is shown at first even though both fields are invalid — the readout says so.",
        "Focus the name and blur it: touched appears for that field, and its error is now shown. The other field's gate is still closed.",
        "Once touched, feedback is live: fix the name and the error clears mid-keystroke; break it again and it returns.",
        "Press Save — submitted opens every gate at once.",
        "Switch to eager: errors that arrived with the initial data are shown from the start.",
      ]}
      readout={<EngineReadout bundle={bundle} />}
    >
      <div className="context-bar">
        <span className="context-bar__label">initialErrors policy</span>
        <div
          className="context-bar__options"
          role="radiogroup"
          aria-label="Display policy"
        >
          {(["gated", "eager"] as const).map((option) => (
            <label key={option} className="context-bar__option">
              <input
                type="radio"
                name="policy"
                checked={props.policy === option}
                onChange={() => props.onPolicyChange(option)}
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
      <div className="actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void bundle.handleSubmit()}
        >
          Save
        </button>
        <button type="button" className="btn" onClick={() => bundle.reset()}>
          Reset
        </button>
      </div>
    </PageShell>
  );
}

export function ValidationDisplay() {
  const [policy, setPolicy] = useState<Policy>("gated");
  // the policy is fixed at form creation; remount to compare
  return <PolicyForm key={policy} policy={policy} onPolicyChange={setPolicy} />;
}
