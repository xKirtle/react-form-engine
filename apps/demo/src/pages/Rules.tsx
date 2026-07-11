import {
  type FieldMap,
  Form,
  FormRenderers,
  formBuilder,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { useRef, useState } from "react";
import { EngineReadout } from "../components/EngineReadout";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

interface Project {
  funded: boolean;
  budget: number;
  forecast: number;
  costCenter: string;
  assignee: string;
}

const fields = {
  funded: { key: "funded", type: "checkbox", label: "Funded project" },
  budget: {
    key: "budget",
    type: "number",
    label: "Budget",
    description: "whenHidden: omit (default) — the key disappears",
    validation: { required: true },
  },
  forecast: {
    key: "forecast",
    type: "number",
    label: "Forecast",
    description: "whenHidden: null — the backend sees an explicit null",
    whenHidden: "null",
  },
  costCenter: {
    key: "costCenter",
    type: "text",
    label: "Cost center",
    description: "whenHidden: keep — hidden, but still submitted",
    whenHidden: "keep",
  },
  assignee: {
    key: "assignee",
    type: "select",
    label: "Assignee",
    description: "Options arrive via engine.setOptions",
  },
} as const satisfies FieldMap<Project>;

const bc = formBuilder<Project>().withFields(fields).withContext<undefined>();

const financialVisibility = bc.rule({
  watch: ["funded"],
  when: (funded) => funded,
  apply: (form) => {
    form.setVisible("budget", true);
    form.setVisible("forecast", true);
    form.setVisible("costCenter", true);
  },
  otherwise: (form) => {
    form.setVisible("budget", false);
    form.setVisible("forecast", false);
    form.setVisible("costCenter", false);
  },
});

const modules = [
  bc.module({
    fields: ["funded", "budget", "forecast", "costCenter", "assignee"],
    rules: [financialVisibility],
  }),
];

const schemaPeek = `budget:     { key: "budget",     type: "number" },                    // whenHidden defaults to "omit"
forecast:   { key: "forecast",   type: "number", whenHidden: "null" },
costCenter: { key: "costCenter", type: "text",   whenHidden: "keep" },

// rung 1: a rule — reacts to form values, runs inside the engine
const financialVisibility = bc.rule({
  watch: ["funded"],
  when: (funded) => funded,
  apply: (form) => { /* setVisible(..., true) */ },
  otherwise: (form) => { /* setVisible(..., false) */ },
});

// rung 2: the engine API — reacts to the app, called from page code
bundle.engine.setOptions("assignee", usersFromRequest);
bundle.engine.setValue("budget", 50000);`;

export function Rules() {
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules,
    context: undefined,
    initialErrors: "gated",
    initialValues: { budget: 25000, forecast: 12000, costCenter: "CC-7" },
  });

  const loadAssignees = () => {
    setLoading(true);
    clearTimeout(timer.current);
    // your data layer fetches; the engine only receives the result
    timer.current = setTimeout(() => {
      bundle.engine.setOptions("assignee", [
        { label: "Alice Muniz", value: "alice" },
        { label: "Sam Ortiz", value: "sam" },
        { label: "Dana Reyes", value: "dana" },
      ]);
      setLoading(false);
    }, 600);
  };

  return (
    <PageShell
      guide={guide("rules")}
      title="Rung 1 reacts to values, rung 2 to the app"
      lede={
        <>
          A rule hides the three financial fields while the project is unfunded
          — each with a different <code>whenHidden</code> policy, so the same
          hidden flag leaves three different payloads. Below it, the same engine
          surface is called from page code: options arriving from a request, an
          imperative write.
        </>
      }
      tries={[
        "The form loaded unfunded: all three financial fields are hidden (see field state), yet serialize() shows three outcomes — budget's key is gone, forecast is null, costCenter kept its value.",
        "Check Funded — the fields return with their parsed values intact. Hidden never meant cleared, and the rule ran on the initial pass too.",
        "While hidden, budget shows no invalid flag despite being required — hidden fields are excluded from validation entirely.",
        "Press Load assignees, then open the select: the options arrived through engine.setOptions, and the form is still pristine — options aren't values.",
        "Press Import budget: the same setValue a rule could make, but from page code it's the user channel — watch the dirty light come on.",
      ]}
      schema={schemaPeek}
      readout={<EngineReadout bundle={bundle} />}
    >
      <Exhibit
        title="Rung 1 — a visibility rule"
        note={
          <>
            The rule watches <code>funded</code>; its <code>setVisible</code>{" "}
            writes are derived state and never dirty the form.
          </>
        }
      >
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.Field name="funded" />
            <Form.Field name="budget" />
            <Form.Field name="forecast" />
            <Form.Field name="costCenter" />
          </Form>
        </FormRenderers>
      </Exhibit>

      <Exhibit
        title="Rung 2 — the engine API from page code"
        note={
          <>
            Identical calls, different channel: page-code writes dirty the form,
            rule writes never do.
          </>
        }
      >
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.Field name="assignee" />
          </Form>
        </FormRenderers>
        <div className="actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={loading}
            onClick={loadAssignees}
          >
            {loading ? "Loading…" : "Load assignees (as your data layer)"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => bundle.engine.setValue("budget", 50000)}
          >
            Import budget (setValue)
          </button>
        </div>
      </Exhibit>
    </PageShell>
  );
}
