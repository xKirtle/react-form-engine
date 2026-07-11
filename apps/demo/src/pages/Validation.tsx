import {
  type FieldMap,
  Form,
  FormRenderers,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { useState } from "react";
import { EngineReadout } from "../components/EngineReadout";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

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

const schemaPeek = `name:   { validation: { required: true, maxLength: { value: 12 } } },
budget: { validation: { min: { value: 0 } } },

// the page loads data that is already invalid, as if from the API:
initialValues: { name: "A name that is too long", budget: -50 },
initialErrors: policy, // "eager" for edit forms, "gated" for create forms

// server verdicts pin from outside the engine:
bundle.engine.setServerError("name", "Name already taken");
bundle.engine.clearServerError("name");`;

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
      guide={guide("validation")}
      title="Validity is computed; showing it is policy"
      lede={
        <>
          Both policies below validate identically — watch the field state
          panel: <code>invalid</code> is the engine&apos;s raw verdict,{" "}
          <code>shown</code> is what the user sees, and <code>touched</code> is
          the per-field gate between them. Server errors are the third voice:
          verdicts the engine can&apos;t compute, pinned from outside.
        </>
      }
      tries={[
        "Under gated, nothing is shown at first even though both fields are invalid — the readout says so.",
        "Focus the name and blur it: touched appears for that field, and its error is now shown. The other field's gate is still closed.",
        "Once touched, feedback is live: fix the name and the error clears mid-keystroke; break it again and it returns.",
        "Press Save — submitted opens every gate at once.",
        "Switch to eager: errors that arrived with the initial data show from the first paint — the right call for edit forms.",
        "Press Reject name — the server error shows immediately, no touch gate: the user did nothing to deserve suspense. Edit the name and the pin clears on the first keystroke.",
        "Pin it again and press Clear manually — for conflicts that resolve without the user typing.",
      ]}
      schema={schemaPeek}
      readout={<EngineReadout bundle={bundle} />}
    >
      <Exhibit
        title="The display gate"
        note={
          <>
            <code>initialErrors</code> is fixed at form creation, so switching
            the policy remounts the form.
          </>
        }
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
      </Exhibit>

      <Exhibit
        title="The server error channel"
        note="Async verdicts — a uniqueness check, a rejected save — happen
          outside the engine and pin their result onto a field."
      >
        <div className="actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="btn"
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
      </Exhibit>
    </PageShell>
  );
}

export function Validation() {
  const [policy, setPolicy] = useState<Policy>("gated");
  // the policy is fixed at form creation; remount to compare
  return <PolicyForm key={policy} policy={policy} onPolicyChange={setPolicy} />;
}
