import {
  type EngineMessagesOverride,
  type FieldMap,
  Form,
  FormRenderers,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { useState } from "react";
import { PageShell } from "../components/PageShell";

interface Project {
  name: string;
  tags: string[];
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true, maxLength: { value: 12 } },
  },
  tags: { key: "tags", type: "stringList", label: "Tags" },
} as const satisfies FieldMap<Project>;

const portuguese: EngineMessagesOverride = {
  validation: {
    required: "Este campo é obrigatório",
    maxLength: (max) => `Máximo de ${max} caracteres`,
  },
  lists: {
    add: "Adicionar item",
    remove: (rowName) => `Remover ${rowName}`,
    rowName: (position, key) =>
      key === undefined ? `linha ${position}` : `linha ${position} (${key})`,
  },
};

function LocalizedForm(props: { locale: "en" | "pt" }) {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "tags"] }],
    context: undefined,
    initialErrors: "eager",
    initialValues: { tags: ["infra"] },
    messages: props.locale === "pt" ? portuguese : undefined,
  });

  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

export function Localization() {
  const [locale, setLocale] = useState<"en" | "pt">("en");

  return (
    <PageShell
      eyebrow="messages"
      title="Every engine string is replaceable"
      lede="Validation messages and list mechanics all route through one
        messages object — a partial override localizes only what it names
        and the English defaults cover the rest."
      tries={[
        "Switch to Português and blur the empty name — “Este campo é obrigatório”.",
        "Check the tag list: add and remove strings (including the row names in remove buttons) follow the locale.",
        "Type past 12 characters in either locale — the parameterized message formats itself.",
      ]}
      schema={`const portuguese: EngineMessagesOverride = {
  validation: {
    required: "Este campo é obrigatório",
    maxLength: (max) => \`Máximo de \${max} caracteres\`,
  },
  lists: {
    add: "Adicionar item",
    remove: (rowName) => \`Remover \${rowName}\`,
  },
};

useFormEngine({ ...options, messages: portuguese });`}
    >
      <div className="context-bar">
        <span className="context-bar__label">Language</span>
        <div
          className="context-bar__options"
          role="radiogroup"
          aria-label="Language"
        >
          {(["en", "pt"] as const).map((option) => (
            <label key={option} className="context-bar__option">
              <input
                type="radio"
                name="locale"
                checked={locale === option}
                onChange={() => setLocale(option)}
              />
              {option === "en" ? "English" : "Português"}
            </label>
          ))}
        </div>
      </div>
      {/* messages are read at form creation; remount to switch locale */}
      <LocalizedForm key={locale} locale={locale} />
    </PageShell>
  );
}
