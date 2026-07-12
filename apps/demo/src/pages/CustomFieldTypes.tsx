import {
  type FieldMap,
  type FieldRenderProps,
  type FieldTypeRuntime,
  type FieldTypeSpec,
  Form,
  FormRenderers,
  type UseFormEngineReturn,
  useFormEngine,
  useListField,
} from "@react-form-engine/core";
import { FieldFrame, htmlRenderers } from "@react-form-engine/renderers-html";
import { type ReactNode, useState } from "react";
import { StateBadges, useEngineTick } from "../components/EngineReadout";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

/** One row of the list-shaped custom type below. */
interface Permission {
  name: string;
  read: boolean;
  write: boolean;
}

/* Registration — module augmentation, once for the app. The guide walks
   through every line; here it just runs. */
declare module "@react-form-engine/core" {
  interface FieldTypeRegistry {
    rating: FieldTypeSpec<number, { max: number }>;
    permissionList: FieldTypeSpec<Permission[]>;
  }
}

/* Runtime — the engine refuses to parse a type it has no runtime for. */
const appFieldTypes: Record<string, FieldTypeRuntime> = {
  rating: { emptyValue: () => Number.NaN },
  permissionList: {
    emptyValue: () => [],
    list: {
      // a permission row is blank only while its name is empty;
      // its boolean flags don't count as content
      isBlankItem: (item) => (item as Permission).name.trim() === "",
      isCompleteItem: (item) => (item as Permission).name.trim() !== "",
    },
  },
};

/** JSON view that keeps NaN visible instead of JSON's null. */
function stringify(value: unknown): string {
  const json = JSON.stringify(
    value,
    (_key, v) => (typeof v === "number" && Number.isNaN(v) ? "__NaN__" : v),
    2,
  );
  return (json ?? "undefined").replaceAll('"__NaN__"', "NaN");
}

/**
 * The engine data behind one exhibit. Sections read live values through
 * getters, so the panel always shows the current engine state.
 */
function TypePeek<TApi, TContext, TFields extends FieldMap<TApi>>(props: {
  bundle: UseFormEngineReturn<TApi, TContext, TFields>;
  hint: ReactNode;
  sections: readonly {
    label: string;
    hint?: ReactNode;
    value: () => unknown;
  }[];
}) {
  useEngineTick(props.bundle);
  return (
    <aside className="readout readout--inline" aria-label="Engine data">
      <div className="readout__title">engine data</div>
      <p className="readout__hint">{props.hint}</p>
      <StateBadges bundle={props.bundle} />
      {props.sections.map((section) => (
        <div key={section.label}>
          <div className="readout__label">{section.label}</div>
          {section.hint !== undefined && (
            <p className="readout__hint">{section.hint}</p>
          )}
          <pre className="readout__json">{stringify(section.value())}</pre>
        </div>
      ))}
    </aside>
  );
}

/* ── 1. the rating type: scalar, config, free validation ───────────── */

function RatingRenderer(props: FieldRenderProps) {
  const value = props.value as number;
  const max =
    (props.definition.config as { max: number } | undefined)?.max ?? 5;
  return (
    <FieldFrame
      label={props.definition.label ?? props.name}
      description={props.definition.description}
      error={props.presentation.error}
      required={props.required}
      asGroup
    >
      {() => (
        <div
          className="rating"
          role="radiogroup"
          aria-label={String(props.definition.label)}
        >
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            // biome-ignore lint/a11y/useSemanticElements: an ARIA radiogroup of buttons is the star-rating pattern the guide's walkthrough uses; this page mirrors that code exactly
            <button
              key={n}
              type="button"
              className="rating__star"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} of ${max}`}
              onClick={() => props.setValue(n)}
              onBlur={props.markTouched}
            >
              {value >= n ? "★" : "☆"}
            </button>
          ))}
        </div>
      )}
    </FieldFrame>
  );
}

interface Survey {
  respondent: string;
  satisfaction: number;
}

const surveyFields = {
  respondent: {
    key: "respondent",
    type: "text",
    label: "Your name",
  },
  satisfaction: {
    key: "satisfaction", // must be a number in the API model
    type: "rating",
    label: "Satisfaction",
    config: { max: 5 }, // typed against the registration
    validation: { min: { value: 1, message: "Rate at least one star" } },
  },
} as const satisfies FieldMap<Survey>;

function RatingExample() {
  const [submitted, setSubmitted] = useState<unknown>();
  const bundle = useFormEngine<Survey, undefined, typeof surveyFields>({
    fields: surveyFields,
    fieldTypes: appFieldTypes,
    modules: [{ fields: ["respondent", "satisfaction"] }],
    context: undefined,
    initialErrors: "gated",
    onSubmit: (survey) => setSubmitted(survey),
  });

  const sections = [
    {
      label: "form model — satisfaction",
      hint: "NaN is the type's declared emptyValue — absence never reaches the form model.",
      value: () => bundle.engine.getValue("satisfaction"),
    },
    {
      label: "serialize()",
      hint: "NaN never ships: until you rate, the key is simply absent.",
      value: () => bundle.serialize(),
    },
    ...(submitted !== undefined
      ? [{ label: "last onSubmit", value: () => submitted }]
      : []),
  ];

  return (
    <div className="split">
      <div className="split__pane">
        <FormRenderers renderers={{ ...htmlRenderers, rating: RatingRenderer }}>
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
            Submit survey
          </button>
          <button type="button" className="btn" onClick={() => bundle.reset()}>
            Reset
          </button>
        </div>
      </div>
      <TypePeek
        bundle={bundle}
        hint="A registered type is ordinary engine data — nothing in here
          knows it's custom."
        sections={sections}
      />
    </div>
  );
}

/* ── 2. a list-shaped type: rows for free, blankness redefined ─────── */

function PermissionListRenderer(props: FieldRenderProps) {
  const list = useListField<Permission>(props.name);
  return (
    <FieldFrame
      label={props.definition.label ?? props.name}
      error={props.presentation.error}
      required={props.required}
      asGroup
    >
      {() => (
        <div className="rfe-list">
          {list.items.map((item) => (
            <div key={item.id} className="rfe-list__row perm-row">
              <input
                className="rfe-input"
                placeholder="role or user"
                aria-label={`Name, ${item.value.name || "new row"}`}
                value={item.value.name}
                onChange={(e) =>
                  item.update({ ...item.value, name: e.target.value })
                }
                onBlur={() => item.markCellTouched("name")}
              />
              <label className="perm-flag">
                <input
                  type="checkbox"
                  checked={item.value.read}
                  onChange={(e) =>
                    item.update({ ...item.value, read: e.target.checked })
                  }
                />
                read
              </label>
              <label className="perm-flag">
                <input
                  type="checkbox"
                  checked={item.value.write}
                  onChange={(e) =>
                    item.update({ ...item.value, write: e.target.checked })
                  }
                />
                write
              </label>
              <button
                type="button"
                className="rfe-list__remove"
                aria-label={`Remove ${item.value.name || "new row"}`}
                onClick={item.remove}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rfe-list__add"
            disabled={!list.canAdd}
            onClick={() => list.add({ name: "", read: false, write: false })}
          >
            Add permission
          </button>
        </div>
      )}
    </FieldFrame>
  );
}

interface Access {
  permissions: Permission[];
}

const accessFields = {
  permissions: {
    key: "permissions",
    type: "permissionList",
    label: "Permissions",
  },
} as const satisfies FieldMap<Access>;

function PermissionsExample() {
  const bundle = useFormEngine<Access, undefined, typeof accessFields>({
    fields: accessFields,
    fieldTypes: appFieldTypes,
    modules: [{ fields: ["permissions"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: {
      permissions: [{ name: "alice", read: true, write: true }],
    },
  });

  return (
    <div className="split">
      <div className="split__pane">
        <FormRenderers
          renderers={{
            ...htmlRenderers,
            permissionList: PermissionListRenderer,
          }}
        >
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
      </div>
      <TypePeek
        bundle={bundle}
        hint="The same row model the built-in lists use — rows, origins,
          blank-row semantics — with no extra registration."
        sections={[
          {
            label: "form model — permissions",
            hint: "Parsed items arrive wrapped in rows: id, origin, meta.",
            value: () => bundle.engine.getValue("permissions"),
          },
          {
            label: "serialize()",
            hint: "Blank rows — by this type's own definition of blank — are dropped.",
            value: () => bundle.serialize(),
          },
        ]}
      />
    </div>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

export function CustomFieldTypes() {
  return (
    <PageShell
      guide={guide("custom-field-types")}
      title="A registered type is a built-in"
      lede="Anything the built-ins don't cover, you register yourself: a type
        registration, a runtime entry, a renderer — three small parts, all in
        your codebase, and the guide walks through every line of them. This
        page shows the result: two custom types that the compiler, the
        validator, and the row model treat exactly like built-ins. (A one-off
        appearance is just a render prop — a type earns its registration when
        the concept recurs.)"
      wide
    >
      <Exhibit
        title="A scalar type — rating"
        note={
          <>
            Registered as number-valued with a <code>{"{ max }"}</code> config,
            so the compiler binds it only to number keys, checks the config
            shape, and hands it the number validation vocabulary for free —
            press Submit with no stars and <code>min: {"{ value: 1 }"}</code>{" "}
            fails with the field's own message. The touch gate, reset, submit
            all behave exactly like the text field above it.
          </>
        }
        bare
      >
        <RatingExample />
      </Exhibit>

      <Exhibit
        title="A list-shaped type — permissions"
        note={
          <>
            An array-valued registration joins the row model automatically. The
            runtime's two list knobs define what counts as content for this item
            shape: a permission row is blank while its <em>name</em> is empty —
            boolean flags don't count. Add a row and toggle its flags: it stays
            blank, stays out of the payload, and blocks nothing, until you name
            it. Then it's complete, and Add re-enables for the next one.
          </>
        }
        bare
      >
        <PermissionsExample />
      </Exhibit>
    </PageShell>
  );
}
