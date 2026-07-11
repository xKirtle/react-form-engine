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

type PayloadName = "full" | "sparse" | "empty";

const payloads: Record<PayloadName, Partial<Project>> = {
  full: {
    name: "Apollo",
    budget: 25000,
    launchDate: "2026-09-01",
    settings: { visibility: "public" },
  },
  sparse: { name: "Apollo" },
  empty: {},
};

const schemaPeek = `const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true, maxLength: { value: 40 } },
  },
  budget: { key: "budget", type: "number", label: "Budget" },
  launchDate: { key: "launchDate", type: "date", label: "Launch date" },
  visibility: {
    key: "settings.visibility",   // a nested path behind a friendly name
    type: "select",
    label: "Visibility",
    config: { items: [/* private, public */] },
    defaultValue: "private",      // used when the API sends nothing
  },
} as const satisfies FieldMap<Project>;

// the payloads this page parses from:
const full   = { name: "Apollo", budget: 25000,
                 launchDate: "2026-09-01",
                 settings: { visibility: "public" } };
const sparse = { name: "Apollo" };
const empty  = {};`;

export function FieldDefinitions() {
  const [payload, setPayload] = useState<PayloadName>("full");
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "budget", "launchDate", "visibility"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: payloads.full,
  });

  return (
    <PageShell
      guide={guide("field-definitions")}
      title="Fields are data; parsing fills the gaps"
      lede={
        <>
          One field map, three incoming payloads. Whatever the API leaves out,
          parsing fills in — <code>defaultValue</code> first, the type&apos;s
          empty value past that — so the form model never holds{" "}
          <code>undefined</code>. The visibility field also shows a nested key:
          it binds <code>settings.visibility</code> behind a friendlier name.
        </>
      }
      tries={[
        "Switch to the sparse payload: budget and launch date come up empty, and visibility falls back to its defaultValue, private.",
        "Open the form model in the readout under sparse — budget reads null there. That's NaN, the one honest “no value yet” for a number; JSON just has no spelling for it. serialize() omits the key entirely.",
        "Change visibility and watch serialize() write into settings.visibility — the nested path the field binds, not the name it goes by.",
        "Switch payloads while a field is edited: switching re-parses from the chosen payload, so it's a reset by design — dirty state clears with it.",
      ]}
      schema={schemaPeek}
      readout={<EngineReadout bundle={bundle} formModel="closed" />}
    >
      <Exhibit>
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
      </Exhibit>
    </PageShell>
  );
}
