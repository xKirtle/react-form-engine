import {
  type EngineMessagesOverride,
  type FieldMap,
  Form,
  FormRenderers,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { useState } from "react";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

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

const schemaPeek = `const portuguese: EngineMessagesOverride = {
  validation: {
    required: "Este campo é obrigatório",
    maxLength: (max) => \`Máximo de \${max} caracteres\`,
  },
  lists: {
    add: "Adicionar item",
    remove: (rowName) => \`Remover \${rowName}\`,
    rowName: (position, key) =>
      key === undefined ? \`linha \${position}\` : \`linha \${position} (\${key})\`,
  },
};

useFormEngine({ ...options, messages: portuguese });`;

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
      guide={guide("localization")}
      title="Every engine string is replaceable"
      lede={
        <>
          Validation messages and list mechanics all route through one{" "}
          <code>messages</code> object. Overrides are partial and merge per
          message — the Portuguese object below localizes only what it names,
          and the English defaults cover the rest.
        </>
      }
      tries={[
        "Switch to Português and blur the empty name — “Este campo é obrigatório”.",
        "Check the tag list: the add and remove strings (including the row names inside remove buttons — screen-reader output too) follow the locale.",
        "Type past 12 characters in either locale — the parameterized message is a function, so each locale controls its own word order.",
        "Messages are read at form creation, so the locale switch remounts the form — the same key={locale} pattern the guide recommends.",
      ]}
      schema={schemaPeek}
    >
      <Exhibit>
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
      </Exhibit>
    </PageShell>
  );
}
