import {
  type FieldMap,
  Form,
  FormRenderers,
  formBuilder,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { useState } from "react";

interface Project {
  name: string;
  kind: string;
  budget: number;
  archived: boolean;
  memberRoles: { key: string; value: string }[];
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
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
        { label: "Delegated", value: "delegated" },
      ],
    },
    defaultValue: "simple",
  },
  budget: {
    key: "budget",
    type: "number",
    label: "Budget",
    validation: { min: { value: 0 } },
  },
  archived: { key: "archived", type: "checkbox", label: "Archived" },
  memberRoles: {
    key: "memberRoles",
    type: "keyValueList",
    label: "Member roles",
  },
} as const satisfies FieldMap<Project>;

interface Ctx {
  defaultOwner: string;
}

const bc = formBuilder<Project>().withFields(fields).withContext<Ctx>();

const rules = [
  // budget only matters for funded projects
  bc.rule({
    watch: ["kind"],
    when: (kind) => kind === "funded",
    apply: (form) => form.setVisible("budget", true),
    otherwise: (form) => form.setVisible("budget", false),
  }),
  // delegated projects get a pinned owner row
  bc.rule({
    watch: ["kind"],
    when: (kind) => kind === "delegated",
    apply: (form, ctx) => {
      form.ensureRows("memberRoles", [
        {
          match: { key: "owner" },
          value: { key: "owner", value: ctx.defaultOwner },
          meta: { pinned: true, keyReadOnly: true },
        },
      ]);
    },
    otherwise: (form) => {
      form.removeRows("memberRoles", { origin: "seeded" });
    },
  }),
];

const modules = [
  bc.module({
    fields: ["name", "kind", "budget", "archived", "memberRoles"],
    rules,
  }),
];

const initialValues: Partial<Project> = {
  name: "Apollo",
  memberRoles: [{ key: "reviewer", value: "sam" }],
};

export function App() {
  const [output, setOutput] = useState("");
  const bundle = useFormEngine<Project, Ctx, typeof fields>({
    fields,
    modules,
    context: { defaultOwner: "alice" },
    initialValues,
    initialErrors: "gated",
    onSubmit: (project) => setOutput(JSON.stringify(project, null, 2)),
  });

  return (
    <main
      style={{ maxWidth: 560, margin: "2rem auto", fontFamily: "system-ui" }}
    >
      <h1>react-form-engine — dev harness</h1>
      <p style={{ color: "#666" }}>
        Try: switch Kind to “Delegated” (seeds a pinned owner row), to “Funded”
        (reveals Budget), submit empty (gated errors reveal).
        {bundle.isDirty ? " ● unsaved changes" : ""}
      </p>

      <FormRenderers renderers={htmlRenderers}>
        <Form form={bundle}>
          <Form.AutoFields />
        </Form>
      </FormRenderers>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="button" onClick={() => void bundle.handleSubmit()}>
          Submit
        </button>
        <button type="button" onClick={() => bundle.reset()}>
          Reset
        </button>
        <button
          type="button"
          onClick={() => setOutput(JSON.stringify(bundle.serialize(), null, 2))}
        >
          Peek serialized
        </button>
      </div>

      {output !== "" && (
        <pre style={{ background: "#f4f4f4", padding: 12 }}>{output}</pre>
      )}
    </main>
  );
}
