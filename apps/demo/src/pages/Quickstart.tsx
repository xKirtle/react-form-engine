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
  kind: string;
  launchDate: string;
  public: boolean;
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    description: "Shown in the project list",
    validation: { required: true, maxLength: { value: 40 } },
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
  launchDate: {
    key: "launchDate",
    type: "date",
    label: "Launch date",
  },
  public: {
    key: "public",
    type: "checkbox",
    label: "Public project",
  },
} as const satisfies FieldMap<Project>;

const schemaPeek = `const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    description: "Shown in the project list",
    validation: { required: true, maxLength: { value: 40 } },
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
  launchDate: { key: "launchDate", type: "date", label: "Launch date" },
  public: { key: "public", type: "checkbox", label: "Public project" },
} as const satisfies FieldMap<Project>;

const bundle = useFormEngine<Project, undefined, typeof fields>({
  fields,
  modules: [{ fields: ["name", "kind", "launchDate", "public"] }],
  context: undefined,
  initialErrors: "gated", // create form: reveal errors on touch or submit
  onSubmit: async (project) => save(project),
});`;

export function Quickstart() {
  const [submitted, setSubmitted] = useState<unknown>();
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "kind", "launchDate", "public"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: { name: "Apollo" },
    onSubmit: (project) => setSubmitted(project),
  });

  return (
    <PageShell
      guide={guide("quickstart")}
      title="A form from a schema"
      lede="The whole quickstart, live: fields defined as plain typed data,
        one module, one hook. The engine parses initial values, validates,
        and serializes back to the API model — the readout on the right is
        that model, updating as you type."
      tries={[
        "Type in a field and watch serialize() follow along.",
        "Tab through fields and watch touched flags accumulate in the field state panel.",
        "Clear the name and press Save project — the error reveals on submit (this form is gated), and last onSubmit stays empty because the save was blocked.",
        "Press Reset — values, flags, and errors return to the parsed baseline.",
      ]}
      schema={schemaPeek}
      readout={<EngineReadout bundle={bundle} submitted={submitted} />}
    >
      <Exhibit>
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
            Save project
          </button>
          <button type="button" className="btn" onClick={() => bundle.reset()}>
            Reset
          </button>
        </div>
      </Exhibit>
    </PageShell>
  );
}
