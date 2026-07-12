import {
  type FieldMap,
  type FieldRenderProps,
  Form,
  FormRenderers,
  type RendererMap,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { Code } from "../components/Code";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

/* ── 1. two renderer maps, one form ────────────────────────────────── */

interface Project {
  name: string;
  kind: string;
  public: boolean;
}

const projectFields = {
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

/* A hand-rolled renderer map — the whole contract, per type:
   value in, setValue/markTouched out, presentation.error when present. */

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

function TwoMapsExample() {
  const bundle = useFormEngine<Project, undefined, typeof projectFields>({
    fields: projectFields,
    modules: [{ fields: ["name", "kind", "public"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: { name: "Apollo" },
  });
  return (
    <div className="split">
      <div className="split__pane">
        <h3 className="split__heading">@react-form-engine/renderers-html</h3>
        <p className="split__note">
          The packaged map: native elements, FieldFrame accessibility chrome
          (label association, aria-invalid, polite error announcements).
        </p>
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
      </div>
      <div className="split__pane">
        <h3 className="split__heading">A hand-rolled map</h3>
        <p className="split__note">
          Three components, ~15 lines per type, no chrome — the same contract.
        </p>
        <FormRenderers renderers={plainRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
      </div>
    </div>
  );
}

/* ── 2. explicit placement: Form.Field claims, AutoFields skips ─────── */

function PlacementExample() {
  const bundle = useFormEngine<Project, undefined, typeof projectFields>({
    fields: projectFields,
    modules: [{ fields: ["name", "kind", "public"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: { name: "Apollo" },
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <div className="slot">
          <span className="slot__tag">
            {'<Form.Field name="name" /> — placed by hand'}
          </span>
          <Form.Field name="name" />
        </div>
        <div className="slot">
          <span className="slot__tag">
            {"<Form.AutoFields /> — the rest; name is claimed, so skipped"}
          </span>
          <Form.AutoFields />
        </div>
      </Form>
    </FormRenderers>
  );
}

/* ── 3. bespoke markup for one field: the render prop ──────────────── */

interface Draft {
  title: string;
  summary: string;
}

const draftFields = {
  title: { key: "title", type: "text", label: "Title" },
  summary: {
    key: "summary",
    type: "text",
    label: "Summary",
    validation: { maxLength: { value: 80 } },
  },
} as const satisfies FieldMap<Draft>;

function BespokeExample() {
  const bundle = useFormEngine<Draft, undefined, typeof draftFields>({
    fields: draftFields,
    modules: [{ fields: ["title", "summary"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: {
      title: "Launch note",
      summary: "Ship the new row model, then rewrite the rendering guide.",
    },
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields except={["summary"]} />
        <Form.Field name="summary">
          {(api) => {
            const text = (api.value as string) ?? "";
            return (
              <label className="plain-field">
                <span className="plain-field__label">
                  {api.definition.label as string}
                </span>
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => api.setValue(e.target.value)}
                  onBlur={api.markTouched}
                />
                <span className="bespoke-meta">
                  <span
                    className={
                      text.length > 80 ? "bespoke-meta__over" : undefined
                    }
                  >
                    {text.length}/80
                  </span>
                  {api.presentation.error !== undefined && (
                    <span className="plain-field__error">
                      {api.presentation.error}
                    </span>
                  )}
                </span>
              </label>
            );
          }}
        </Form.Field>
      </Form>
    </FormRenderers>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

export function Rendering() {
  return (
    <PageShell
      guide={guide("rendering")}
      title="The core renders nothing"
      lede="It computes everything a field's UI needs — value, label, gated
        error, options, required — and hands it to whatever renderer you map
        to the field type. Swap the whole map for your design system, place
        one field by hand, or write bespoke markup for a single field: the
        schema never changes."
      wide
    >
      <Exhibit
        title="Two renderer maps, one form"
        note={
          <>
            Both columns render the <em>same form bundle</em> through different
            renderer maps. Type in either and the other follows, keystroke for
            keystroke — renderers hold no state, so there is nothing to fall out
            of sync. Clear the name and blur it: the error appears in both,
            because the touch gate is engine state too. Neither column decides{" "}
            <em>when</em> — showing <code>presentation.error</code> when present
            is the complete error story.
          </>
        }
        bare
      >
        <Code>{`const bundle = useFormEngine({ ... });      // one bundle…

<FormRenderers renderers={htmlRenderers}>   // …two providers
  <Form form={bundle}><Form.AutoFields /></Form>
</FormRenderers>

<FormRenderers renderers={plainRenderers}>  // same bundle, other map
  <Form form={bundle}><Form.AutoFields /></Form>
</FormRenderers>`}</Code>
        <TwoMapsExample />
      </Exhibit>

      <div className="gallery">
        <Exhibit
          title="Explicit placement"
          note={
            <>
              <code>Form.AutoFields</code> renders every field in schema order —
              often the entire layout. When one field needs a specific home,
              place it: an explicit <code>Form.Field</code> claims its name and{" "}
              <code>AutoFields</code> skips it. No double rendering, no
              bookkeeping — and placement is layout only; a field placed nowhere
              still parses, validates, and serializes.
            </>
          }
        >
          <Code>{`<Form form={bundle}>
  <header>
    <Form.Field name="name" />  // claims it
  </header>
  <Form.AutoFields />  // skips claimed names
</Form>`}</Code>
          <PlacementExample />
        </Exhibit>

        <Exhibit
          title="Bespoke markup for one field"
          note={
            <>
              A one-off that doesn't deserve a registered renderer:{" "}
              <code>Form.Field</code> takes a function child receiving the exact
              contract a renderer gets — here a textarea with a live character
              count. It's hosted as a component body, so hooks are legal inside.
            </>
          }
        >
          <Code>{`<Form.Field name="summary">
  {(api) => (  // the renderer contract
    <textarea
      value={api.value}
      onBlur={api.markTouched}
      onChange={(e) =>
        api.setValue(e.target.value)}
    />
  )}
</Form.Field>`}</Code>
          <BespokeExample />
        </Exhibit>
      </div>
    </PageShell>
  );
}
