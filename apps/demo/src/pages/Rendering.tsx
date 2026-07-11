import {
  type FieldMap,
  type FieldRenderProps,
  Form,
  FormRenderers,
  type RendererMap,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { EngineReadout } from "../components/EngineReadout";
import { PageShell } from "../components/PageShell";
import { guide } from "../guides";

interface Project {
  name: string;
  kind: string;
  public: boolean;
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true, maxLength: { value: 20 } },
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
  public: { key: "public", type: "checkbox", label: "Public project" },
} as const satisfies FieldMap<Project>;

/* ── a hand-rolled renderer map — the guide's minimal contract ──────── */

function PlainText(props: FieldRenderProps) {
  return (
    <label className="plain-field">
      <span className="plain-field__label">
        {props.definition.label}
        {props.required ? " *" : ""}
      </span>
      <input
        type="text"
        value={props.value as string}
        onChange={(e) => props.setValue(e.target.value)}
        onBlur={props.markTouched}
      />
      {props.presentation.error !== undefined && (
        <span className="plain-field__error">{props.presentation.error}</span>
      )}
    </label>
  );
}

function PlainSelect(props: FieldRenderProps) {
  return (
    <label className="plain-field">
      <span className="plain-field__label">{props.definition.label}</span>
      <select
        value={props.value as string}
        onChange={(e) => props.setValue(e.target.value)}
        onBlur={props.markTouched}
      >
        {(props.options ?? []).map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PlainCheckbox(props: FieldRenderProps) {
  return (
    <label className="plain-field plain-field--checkbox">
      <input
        type="checkbox"
        checked={props.value as boolean}
        onChange={(e) => props.setValue(e.target.checked)}
        onBlur={props.markTouched}
      />
      {props.definition.label}
    </label>
  );
}

const plainRenderers: RendererMap = {
  text: PlainText,
  select: PlainSelect,
  checkbox: PlainCheckbox,
};

const schemaPeek = `// the whole contract, per type — value in, writes out:
function PlainText(props: FieldRenderProps) {
  return (
    <label>
      {props.definition.label}
      <input
        value={props.value as string}
        onChange={(e) => props.setValue(e.target.value)}
        onBlur={props.markTouched}
      />
      {props.presentation.error && <span>{props.presentation.error}</span>}
    </label>
  );
}

// two providers, one bundle — both columns render the same form:
<FormRenderers renderers={htmlRenderers}>
  <Form form={bundle}><Form.AutoFields /></Form>
</FormRenderers>
<FormRenderers renderers={plainRenderers}>
  <Form form={bundle}><Form.AutoFields /></Form>
</FormRenderers>`;

export function Rendering() {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "kind", "public"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: { name: "Apollo" },
  });

  return (
    <PageShell
      guide={guide("rendering")}
      title="The core renders nothing — twice"
      lede={
        <>
          Both columns render the <em>same form bundle</em> through different
          renderer maps: the packaged HTML renderers on the left, a hand-rolled
          map of ~15 lines per type on the right. They stay in sync because no
          state lives in either — value, error, touched, all of it belongs to
          the engine.
        </>
      }
      tries={[
        "Type in either column and watch the other follow, keystroke for keystroke. Two renderer maps, one engine.",
        "Clear the name in the right column and blur it: the error appears in both — the touch gate is engine state, not component state.",
        "Compare the columns' error handling: each simply shows presentation.error when present. Neither decides when — that's the display policy's job.",
        "The left column's extras (label association, aria-invalid, live-region announcements) come from FieldFrame — the packaged renderers are the reference implementation of the same contract the right column implements.",
      ]}
      schema={schemaPeek}
      readout={<EngineReadout bundle={bundle} />}
    >
      <div className="split">
        <div className="split__pane">
          <h2 className="split__heading">@react-form-engine/renderers-html</h2>
          <p className="split__note">
            The packaged map: native elements, accessible chrome.
          </p>
          <FormRenderers renderers={htmlRenderers}>
            <Form form={bundle}>
              <Form.AutoFields />
            </Form>
          </FormRenderers>
        </div>
        <div className="split__pane">
          <h2 className="split__heading">A hand-rolled map</h2>
          <p className="split__note">
            Three components, the minimal contract, no chrome.
          </p>
          <FormRenderers renderers={plainRenderers}>
            <Form form={bundle}>
              <Form.AutoFields />
            </Form>
          </FormRenderers>
        </div>
      </div>
    </PageShell>
  );
}
