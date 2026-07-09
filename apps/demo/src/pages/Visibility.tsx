import {
  type FieldMap,
  Form,
  FormRenderers,
  formBuilder,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { EngineReadout } from "../components/EngineReadout";
import { PageShell } from "../components/PageShell";

interface Project {
  funded: boolean;
  budget: number;
  forecast: number;
  costCenter: string;
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
    fields: ["funded", "budget", "forecast", "costCenter"],
    rules: [financialVisibility],
  }),
];

const schemaPeek = `budget:     { key: "budget",     type: "number" },                      // whenHidden defaults to "omit"
forecast:   { key: "forecast",   type: "number", whenHidden: "null" },
costCenter: { key: "costCenter", type: "text",   whenHidden: "keep" },

const financialVisibility = bc.rule({
  watch: ["funded"],
  when: (funded) => funded,
  apply: (form) => { /* setVisible(..., true) */ },
  otherwise: (form) => { /* setVisible(..., false) */ },
});`;

export function Visibility() {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules,
    context: undefined,
    initialErrors: "gated",
    initialValues: { budget: 25000, forecast: 12000, costCenter: "CC-7" },
  });

  return (
    <PageShell
      eyebrow="visibility"
      title="One feature: what hidden fields leave behind"
      lede="A rule hides the three financial fields while the project is
        unfunded. Each declares a different whenHidden policy — compare
        serialize() against the field state panel: same hidden flag, three
        different payloads."
      tries={[
        "The form loaded unfunded: all three fields are hidden (see the field state panel), yet serialize() shows three different outcomes — budget's key is gone, forecast is null, costCenter kept its value.",
        "Check the funded box — the fields return with their parsed values intact. Hidden never meant cleared.",
        "Uncheck it again and note budget shows no invalid flag while hidden — hidden fields are excluded from validation, required and all.",
        "The form only dirties when you toggle the checkbox: the rule's setVisible calls are derived state.",
      ]}
      schema={schemaPeek}
      readout={<EngineReadout bundle={bundle} />}
    >
      <FormRenderers renderers={htmlRenderers}>
        <Form form={bundle}>
          <Form.AutoFields />
        </Form>
      </FormRenderers>
    </PageShell>
  );
}
