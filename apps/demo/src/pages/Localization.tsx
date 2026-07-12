import {
  type EngineMessagesOverride,
  type FieldMap,
  Form,
  FormRenderers,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { useState } from "react";
import { Code } from "../components/Code";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

type Locale = "en" | "pt" | "fr" | "de";

const locales: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "pt", label: "Português" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
];

/* One object per locale. Overrides are partial and merge per message —
   anything unnamed keeps its English default. */
const messagesByLocale: Record<Locale, EngineMessagesOverride | undefined> = {
  en: undefined, // the defaults are English
  pt: {
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
  },
  fr: {
    validation: {
      required: "Ce champ est obligatoire",
      maxLength: (max) => `${max} caractères maximum`,
    },
    lists: {
      add: "Ajouter un élément",
      remove: (rowName) => `Supprimer ${rowName}`,
      rowName: (position, key) =>
        key === undefined ? `ligne ${position}` : `ligne ${position} (${key})`,
    },
  },
  de: {
    validation: {
      required: "Dieses Feld ist erforderlich",
      maxLength: (max) => `Höchstens ${max} Zeichen`,
    },
    lists: {
      add: "Eintrag hinzufügen",
      remove: (rowName) => `${rowName} entfernen`,
      rowName: (position, key) =>
        key === undefined ? `Zeile ${position}` : `Zeile ${position} (${key})`,
    },
  },
};

/* Labels are your content, not engine output — localized like any app
   copy, in a plain map of your own. */
const labels: Record<Locale, { name: string; tags: string; badge: string }> = {
  en: { name: "Project name", tags: "Tags", badge: "Badge code" },
  pt: { name: "Nome do projeto", tags: "Etiquetas", badge: "Código do crachá" },
  fr: { name: "Nom du projet", tags: "Étiquettes", badge: "Code du badge" },
  de: { name: "Projektname", tags: "Tags", badge: "Ausweiscode" },
};

/** One language switch per exhibit — `group` keeps the radios separate. */
function LocaleBar(props: {
  group: string;
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="context-bar">
      <span className="context-bar__label">Language</span>
      <div
        className="context-bar__options"
        role="radiogroup"
        aria-label="Language"
      >
        {locales.map((option) => (
          <label key={option.id} className="context-bar__option">
            <input
              type="radio"
              name={props.group}
              checked={props.locale === option.id}
              onChange={() => props.onChange(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

/* ── 1. the validation vocabulary follows the locale ───────────────── */

interface Basics {
  name: string;
}

function VocabularyForm(props: { locale: Locale }) {
  const fields = {
    name: {
      key: "name",
      type: "text",
      label: labels[props.locale].name,
      validation: { required: true, maxLength: { value: 12 } },
    },
  } as const satisfies FieldMap<Basics>;
  const bundle = useFormEngine<Basics, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name"] }],
    context: undefined,
    initialErrors: "eager",
    initialValues: { name: "A name that is far too long" },
    messages: messagesByLocale[props.locale],
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

/* ── 2. list mechanics, accessible names included ──────────────────── */

interface Tagged {
  tags: string[];
}

function ListForm(props: { locale: Locale }) {
  const fields = {
    tags: {
      key: "tags",
      type: "stringList",
      label: labels[props.locale].tags,
    },
  } as const satisfies FieldMap<Tagged>;
  const bundle = useFormEngine<Tagged, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["tags"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: { tags: ["infra", "docs"] },
    messages: messagesByLocale[props.locale],
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

/* ── 3. precedence: per-field text sits above the locale ───────────── */

interface Badge {
  name: string;
  code: string;
}

function PrecedenceForm(props: { locale: Locale }) {
  const fields = {
    name: {
      key: "name",
      type: "text",
      label: labels[props.locale].name,
      description:
        "its error uses the vocabulary default — the locale translates it",
      validation: { maxLength: { value: 12 } },
    },
    code: {
      key: "code",
      type: "text",
      label: labels[props.locale].badge,
      description:
        "its error is a per-field message — deliberately out of the locale's reach",
      validation: {
        maxLength: {
          value: 8,
          message: "Keep it under 8 — it goes on the badge",
        },
      },
    },
  } as const satisfies FieldMap<Badge>;
  const bundle = useFormEngine<Badge, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "code"] }],
    context: undefined,
    initialErrors: "eager",
    initialValues: {
      name: "A name that is far too long",
      code: "ENGINEERING",
    },
    messages: messagesByLocale[props.locale],
  });
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

function VocabularyExample() {
  const [locale, setLocale] = useState<Locale>("en");
  return (
    <>
      <LocaleBar
        group="locale-vocabulary"
        locale={locale}
        onChange={setLocale}
      />
      <VocabularyForm key={locale} locale={locale} />
    </>
  );
}

function ListExample() {
  const [locale, setLocale] = useState<Locale>("en");
  return (
    <>
      <LocaleBar group="locale-lists" locale={locale} onChange={setLocale} />
      <ListForm key={locale} locale={locale} />
    </>
  );
}

function PrecedenceExample() {
  const [locale, setLocale] = useState<Locale>("en");
  return (
    <>
      <LocaleBar
        group="locale-precedence"
        locale={locale}
        onChange={setLocale}
      />
      <PrecedenceForm key={locale} locale={locale} />
    </>
  );
}

export function Localization() {
  return (
    <PageShell
      guide={guide("localization")}
      title="Every engine string is replaceable"
      lede="Validation messages, list mechanics, the accessible names on row
        buttons — every string the engine generates routes through one
        messages object, so localizing a form is one object per locale, not
        a string hunt. The dividing line is authorship: the engine translates
        what it authors; what you author — labels, descriptions, per-field
        messages — you translate, like any app copy. Overrides are partial
        and merge per message: name only what you translate, and the English
        defaults cover the rest."
    >
      <Exhibit
        title="One object per locale"
        note={
          <>
            The whole mechanism, for three locales. Parameterized messages are
            functions, not template strings, so each locale owns its word order
            — German leads with “Höchstens”, French trails with “maximum”.
            Messages are read at form creation, so the switch remounts the form
            (<code>key={"{locale}"}</code>). The label switches too, but through
            this page's own per-locale map — authored by you, so translated by
            you; the engine just passes it through.
          </>
        }
      >
        <Code>{`const byLocale: Record<Locale, EngineMessagesOverride> = {
  pt: { validation: {
    required: "Este campo é obrigatório",
    maxLength: (max) => \`Máximo de \${max} caracteres\`,
  } },
  fr: { validation: {
    required: "Ce champ est obligatoire",
    maxLength: (max) => \`\${max} caractères maximum\`,
  } },
  de: { validation: {
    required: "Dieses Feld ist erforderlich",
    maxLength: (max) => \`Höchstens \${max} Zeichen\`,
  } },
};  // en: the defaults — anything unnamed stays English

useFormEngine({ ...options, messages: byLocale[locale] });`}</Code>
        <VocabularyExample />
      </Exhibit>

      <Exhibit
        title="List mechanics — screen readers included"
        note={
          <>
            The <code>lists</code> slot covers the add button, remove buttons,
            and <code>rowName</code> — the row identifier embedded in accessible
            names (“Remove row 2”). Inspect a remove button after switching:{" "}
            <code>aria-label</code> localizes with everything else, so
            screen-reader output follows the locale too.
          </>
        }
      >
        <ListExample />
      </Exhibit>

      <Exhibit
        title="Precedence — per-field text sits above the locale"
        note={
          <>
            A message resolves most-specific-first: a rule's own{" "}
            <code>message</code>, then the form's <code>messages</code> object,
            then the English defaults. Both fields are over their limit — switch
            the language and the name follows the locale, while the badge code
            stays English <em>on purpose</em>: its hand-written per-field
            message outranks the locale object, so no switch can reach it. That
            cuts both ways — per-field text is right for genuinely
            field-specific wording, and wrong for anything a locale switch
            should translate.
          </>
        }
      >
        <PrecedenceExample />
      </Exhibit>
    </PageShell>
  );
}
