import {
  type FieldMap,
  Form,
  FormRenderers,
  formBuilder,
  type UseFormEngineReturn,
  useFormEngine,
  useFormValue,
  useListField,
} from "@react-form-engine/core";
import { FieldFrame, htmlRenderers } from "@react-form-engine/renderers-html";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

/**
 * The live form model behind one list field: every stamp and lock the UI
 * shows is this data — id, origin, and meta live on the row itself.
 */
function RowPeek<TApi, TContext, TFields extends FieldMap<TApi>>(props: {
  bundle: UseFormEngineReturn<TApi, TContext, TFields>;
  name: keyof TFields & string;
  showSerialize?: boolean;
}) {
  const rows = useFormValue(props.bundle, props.name);
  return (
    <aside className="readout readout--inline" aria-label="Row data">
      <div className="readout__title">row data</div>
      <p className="readout__hint">
        The form model behind this list, live. The stamps and locks in the UI
        are this data — not styling.
      </p>
      <div className="readout__label">form model — {props.name}</div>
      <pre className="readout__json">{JSON.stringify(rows, null, 2)}</pre>
      {props.showSerialize === true && (
        <>
          <div className="readout__label">serialize()</div>
          <p className="readout__hint">
            Rows unwrap to plain values — your API never sees them.
          </p>
          <pre className="readout__json">
            {JSON.stringify(props.bundle.serialize(), null, 2)}
          </pre>
        </>
      )}
    </aside>
  );
}

/* ── 1. origins: who put each row here ─────────────────────────────── */

interface Project {
  delegation: boolean;
  memberRoles: { key: string; value: string }[];
}

const originFields = {
  delegation: {
    key: "delegation",
    type: "checkbox",
    label: "Enable delegation",
  },
  memberRoles: {
    key: "memberRoles",
    type: "keyValueList",
    label: "Member roles",
    // a fact about the data: API-sent owners are pinned, in every form
    knownRows: [{ match: { key: "owner" }, meta: { pinned: true } }],
  },
} as const satisfies FieldMap<Project>;

const bc = formBuilder<Project>()
  .withFields(originFields)
  .withContext<undefined>();

const delegateSeeding = bc.rule({
  watch: ["delegation"],
  when: (delegation) => delegation,
  apply: (form) => {
    form.ensureRows("memberRoles", [
      {
        match: { key: "delegate" },
        value: { key: "delegate", value: "agent-7" },
        meta: { pinned: true },
      },
    ]);
  },
  otherwise: (form) => {
    form.removeRows("memberRoles", { origin: "seeded" });
  },
});

const originModules = [
  bc.module({
    fields: ["delegation", "memberRoles"],
    rules: [delegateSeeding],
  }),
];

/**
 * A custom list UI built on useListField — used here (instead of the
 * package renderer) to make each row's origin stamp visible.
 */
function OriginList() {
  const list = useListField<{ key: string; value: string }>("memberRoles");
  return (
    <div className="rfe-list">
      {list.items.map((item) => (
        <div key={item.id} className="rfe-list__row origin-row">
          <span className={`origin origin--${item.origin}`}>{item.origin}</span>
          <input
            className="rfe-input"
            aria-label={`Key, ${item.value.key || "new row"}`}
            value={item.value.key}
            onChange={(e) =>
              item.update({ ...item.value, key: e.target.value })
            }
            onBlur={() => item.markCellTouched("key")}
          />
          <input
            className="rfe-input"
            aria-label={`Value, ${item.value.key || "new row"}`}
            value={item.value.value}
            onChange={(e) =>
              item.update({ ...item.value, value: e.target.value })
            }
            onBlur={() => item.markCellTouched("value")}
          />
          <button
            type="button"
            className="rfe-list__remove"
            aria-label={`Remove ${item.value.key || "new row"}`}
            disabled={item.meta.pinned === true}
            title={
              item.meta.pinned === true ? "Pinned by its source" : "Remove"
            }
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
        onClick={() => list.add({ key: "", value: "" })}
      >
        Add row
      </button>
    </div>
  );
}

function OriginExample() {
  const bundle = useFormEngine<Project, undefined, typeof originFields>({
    fields: originFields,
    modules: originModules,
    context: undefined,
    initialValues: {
      memberRoles: [
        { key: "owner", value: "alice" },
        { key: "reviewer", value: "sam" },
      ],
    },
  });

  return (
    <div className="split">
      <div className="split__pane">
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.Field name="delegation" />
            <Form.Field name="memberRoles">
              {(api) => (
                <FieldFrame
                  label={(api.definition.label as string) ?? api.name}
                  error={api.presentation.error}
                  required={api.required}
                  asGroup
                >
                  {() => <OriginList />}
                </FieldFrame>
              )}
            </Form.Field>
          </Form>
        </FormRenderers>
        <p className="legend">
          <span className="origin origin--api">api</span> loaded from the server
          <span className="origin origin--seeded">seeded</span> created by a
          rule
          <span className="origin origin--user">user</span> added by you
        </p>
      </div>
      <RowPeek bundle={bundle} name="memberRoles" />
    </div>
  );
}

/* ── 2. meta flags: pinned vs keyReadOnly ──────────────────────────── */

interface Deployment {
  variables: { key: string; value: string }[];
}

const flagFields = {
  variables: {
    key: "variables",
    type: "keyValueList",
    label: "Environment variables",
    knownRows: [
      // must exist AND must not be renamed
      {
        match: { key: "NODE_ENV" },
        meta: { pinned: true, keyReadOnly: true },
      },
      // must not be renamed — but removable
      { match: { key: "REGION" }, meta: { keyReadOnly: true } },
    ],
  },
} as const satisfies FieldMap<Deployment>;

function FlagsExample() {
  const bundle = useFormEngine<Deployment, undefined, typeof flagFields>({
    fields: flagFields,
    modules: [{ fields: ["variables"] }],
    context: undefined,
    initialValues: {
      variables: [
        { key: "NODE_ENV", value: "production" },
        { key: "REGION", value: "eu-west-1" },
        { key: "DEBUG", value: "false" },
      ],
    },
  });

  return (
    <div className="split">
      <div className="split__pane">
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
      </div>
      <RowPeek bundle={bundle} name="variables" />
    </div>
  );
}

/* ── 3. blank and incomplete rows ──────────────────────────────────── */

interface Tagged {
  labels: { key: string; value: string }[];
}

const blankFields = {
  labels: {
    key: "labels",
    type: "keyValueList",
    label: "Labels",
  },
} as const satisfies FieldMap<Tagged>;

function BlankExample() {
  const bundle = useFormEngine<Tagged, undefined, typeof blankFields>({
    fields: blankFields,
    modules: [{ fields: ["labels"] }],
    context: undefined,
    initialValues: { labels: [{ key: "env", value: "prod" }] },
  });

  return (
    <div className="split">
      <div className="split__pane">
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
      </div>
      <RowPeek bundle={bundle} name="labels" showSerialize />
    </div>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

export function RowModel() {
  return (
    <PageShell
      guide={guide("row-model")}
      title="Every row knows where it came from"
      lede="A list value is a list of rows: one immutable object carrying the
        item plus identity, provenance, and metadata — value and flags live
        together, so they cannot drift apart. Each example pairs a list with
        the live row data behind it; your API never sees any of this, rows
        unwrap back to plain arrays at serialize."
      wide
    >
      <Exhibit
        title="Who put each row here"
        note={
          <>
            Three channels stamp an unforgeable <code>origin</code>: parsing
            (api), rules (seeded), the list UI (user). That's what makes
            machine-managed rows safe to mix with human ones — toggling
            delegation off runs{" "}
            <code>removeRows({'{ origin: "seeded" }'})</code>, which can only
            remove what the rule created. Type your own “delegate” row first,
            then toggle: the rule adopts your row — pin stamped, your value
            untouched.
          </>
        }
        bare
      >
        <OriginExample />
      </Exhibit>

      <Exhibit
        title="pinned vs keyReadOnly — two different locks"
        note={
          <>
            “Must exist” and “must not be renamed” are separate guarantees,
            declared as facts on the schema via <code>knownRows</code>.{" "}
            <code>NODE_ENV</code> carries both; <code>REGION</code> can be
            removed but not renamed; <code>DEBUG</code> is entirely yours. Every
            value stays editable throughout — check <code>meta</code> in the row
            data.
          </>
        }
        bare
      >
        <FlagsExample />
      </Exhibit>

      <Exhibit
        title="Blank and incomplete rows"
        note="Add a row and leave it empty: it exists in the form model, but
          validation ignores it and serialize() drops it — a stray
          placeholder never blocks a save or pollutes a payload. Fill in
          only the key and the row is incomplete instead: its empty value
          cell errors once touched, and Add stays disabled until the row is
          finished."
        bare
      >
        <BlankExample />
      </Exhibit>
    </PageShell>
  );
}
