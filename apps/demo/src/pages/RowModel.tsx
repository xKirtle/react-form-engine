import {
  type FieldMap,
  Form,
  FormRenderers,
  formBuilder,
  useFormEngine,
  useListField,
} from "@react-form-engine/core";
import { FieldFrame, htmlRenderers } from "@react-form-engine/renderers-html";
import { EngineReadout } from "../components/EngineReadout";
import { PageShell } from "../components/PageShell";

interface Project {
  delegation: boolean;
  memberRoles: { key: string; value: string }[];
}

const fields = {
  delegation: {
    key: "delegation",
    type: "checkbox",
    label: "Enable delegation",
  },
  memberRoles: {
    key: "memberRoles",
    type: "keyValueList",
    label: "Member roles",
    // rows the schema knows about: if the API sends an owner, pin it
    knownRows: [{ match: { key: "owner" }, meta: { pinned: true } }],
  },
} as const satisfies FieldMap<Project>;

const bc = formBuilder<Project>().withFields(fields).withContext<undefined>();

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

const modules = [
  bc.module({
    fields: ["delegation", "memberRoles"],
    rules: [delegateSeeding],
  }),
];

/**
 * A custom list UI built on useListField — used here (instead of the
 * package renderer) to make each row's origin and meta visible.
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

export function RowModel() {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules,
    context: undefined,
    initialValues: {
      memberRoles: [
        { key: "owner", value: "alice" },
        { key: "reviewer", value: "sam" },
      ],
    },
  });

  return (
    <PageShell
      eyebrow="row model"
      title="Every row knows where it came from"
      lede="Rows carry identity, provenance, and metadata. The API sent two
        rows (the schema's knownRows pinned the owner); a rule seeds a
        delegate; anything you add is yours. The origin tag on each row is
        real engine state, not UI guesswork."
      tries={[
        "Toggle delegation on — a seeded, pinned delegate row appears. (The dirty badge reflects your checkbox edit; the seeded row itself never dirties.)",
        "Toggle it off — the seeded row leaves. Rows with other origins never do.",
        "Type a row with key “delegate”, then toggle delegation on: the rule adopts your row — origin stays user, your value survives, only the pin is stamped.",
        "Toggle delegation back off after adoption: the pin is released, your row and edits remain.",
        "Open the form model in the readout — each row is { id, value, origin, meta }. The pins and origin tags in the UI are that data, not styling; serialize() below it unwraps rows back to plain values.",
      ]}
      readout={<EngineReadout bundle={bundle} formModelOpen />}
    >
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
        <span className="origin origin--seeded">seeded</span> created by a rule
        <span className="origin origin--user">user</span> added by you
      </p>
    </PageShell>
  );
}
