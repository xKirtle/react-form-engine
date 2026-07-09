import {
  type FieldMap,
  Form,
  FormRenderers,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { EngineReadout } from "../components/EngineReadout";
import { PageShell } from "../components/PageShell";

interface Project {
  name: string;
}

const fields = {
  name: { key: "name", type: "text", label: "Project name" },
} as const satisfies FieldMap<Project>;

const schemaPeek = `// after a failed save, or from your own async check:
bundle.engine.setServerError("name", "Name already taken");

// externally-driven errors can also be lifted explicitly:
bundle.engine.clearServerError("name");`;

export function ServerErrors() {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: { name: "Apollo" },
  });

  return (
    <PageShell
      eyebrow="server errors"
      title="One feature: errors the engine didn't compute"
      lede="Validation runs synchronously inside the engine; anything
        asynchronous — a uniqueness check, a rejected save — happens outside
        and pins its verdict onto a field. Pinned errors ignore the touch
        gate and clear themselves the moment the value changes."
      tries={[
        "Press Reject name — the error shows immediately, with no touched flag in sight: server errors are ungated.",
        "Edit the name — the pin clears on the first keystroke, because a changed value invalidates the old verdict.",
        "Pin it again, leave the field alone, and press Clear manually — for conflicts that resolve without the user typing.",
        "Note the field state panel while pinned: server, invalid, and shown — and serialize() is unaffected throughout.",
      ]}
      schema={schemaPeek}
      readout={<EngineReadout bundle={bundle} />}
    >
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
    </PageShell>
  );
}
