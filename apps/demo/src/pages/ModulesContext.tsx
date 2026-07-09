import {
  type FieldMap,
  Form,
  FormRenderers,
  formBuilder,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { useState } from "react";
import { EngineReadout } from "../components/EngineReadout";
import { PageShell } from "../components/PageShell";

interface Project {
  name: string;
  budget: number;
  invoiceEmail: string;
  currency: string;
}

const fields = {
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
} as const satisfies FieldMap<Project>;

interface Ctx {
  tier: "starter" | "pro";
}

const bc = formBuilder<Project>().withFields(fields).withContext<Ctx>();

const basics = bc.module({ fields: ["name"] });

// the billing slice only exists on the pro tier — and it guarantees a
// currency in the payload without defining (or rendering) a field for it
const billing = bc.moduleFactory((ctx) =>
  ctx.tier === "pro"
    ? { fields: ["budget", "invoiceEmail"], defaults: { currency: "EUR" } }
    : null,
);

export function ModulesContext() {
  const [tier, setTier] = useState<Ctx>({ tier: "starter" });
  const bundle = useFormEngine<Project, Ctx, typeof fields>({
    fields,
    modules: [basics, billing],
    context: tier,
    initialErrors: "gated",
  });

  return (
    <PageShell
      eyebrow="modules — composition"
      title="One schema, assembled per situation"
      lede="The tier below is the form's context. A module factory consults
        it: pro projects get the billing slice — two more fields plus a
        currency default that submits without any field at all. The form
        instance survives the switch."
      tries={[
        "Switch to Pro — billing fields appear, and serialize() gains a currency the form never renders.",
        "Blur the empty name to reveal its error, then switch tiers: the error (and your touched state) survives re-resolution.",
        "Switch back to Starter — billing fields leave the schema and the payload.",
        "Watch the dirty badge: tier switches are not user edits.",
      ]}
      readout={<EngineReadout bundle={bundle} />}
    >
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
    </PageShell>
  );
}
