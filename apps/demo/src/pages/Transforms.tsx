import {
  type FieldMap,
  Form,
  FormRenderers,
  useFormEngine,
} from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import { EngineReadout } from "../components/EngineReadout";
import { Exhibit, PageShell } from "../components/PageShell";
import { guide } from "../guides";

interface Project {
  title: string;
  startedAt: Date;
  labels: Record<string, string>;
  internalRef: string;
}

const fields = {
  title: { key: "title", type: "text", label: "Title" },
  startedAt: {
    key: "startedAt",
    type: "date",
    label: "Started",
    // the API stores a Date; the date input speaks ISO strings.
    // without this pair the definition does not typecheck.
    transform: {
      parse: (date) => date.toISOString().slice(0, 10),
      serialize: (iso) => new Date(iso),
    },
  },
  labels: {
    key: "labels",
    type: "keyValueList",
    label: "Labels",
    // the API stores a plain object; the form edits key/value rows
    transform: {
      parse: (record) =>
        Object.entries(record).map(([key, value]) => ({ key, value })),
      serialize: (entries) =>
        Object.fromEntries(entries.map((entry) => [entry.key, entry.value])),
    },
  },
} as const satisfies FieldMap<Project>;

const initialValues: Project = {
  title: "Apollo",
  startedAt: new Date("2026-03-15T00:00:00Z"),
  labels: { env: "prod", region: "eu" },
  internalRef: "PRJ-0042",
};

const schemaPeek = `interface Project {
  title: string;
  startedAt: Date;                  // not a string — needs a transform
  labels: Record<string, string>;   // not an array — needs a transform
  internalRef: string;              // no field binds this one
}

startedAt: {
  key: "startedAt",
  type: "date",
  transform: {
    parse: (date) => date.toISOString().slice(0, 10),
    serialize: (iso) => new Date(iso),
  },
},
labels: {
  key: "labels",
  type: "keyValueList",
  transform: {
    parse: (record) =>
      Object.entries(record).map(([key, value]) => ({ key, value })),
    serialize: (entries) =>
      Object.fromEntries(entries.map((e) => [e.key, e.value])),
  },
},`;

export function Transforms() {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["title", "startedAt", "labels"] }],
    context: undefined,
    initialValues,
  });

  return (
    <PageShell
      guide={guide("transforms")}
      title="Two models, one bridge per field"
      lede={
        <>
          The API stores a <code>Date</code> and a plain object; the form edits
          an ISO string and key/value rows. Each mismatch is bridged by a{" "}
          <code>parse</code>/<code>serialize</code> pair on the field — and the
          compiler <em>requires</em> the pair exactly where the types disagree.
          Compare the form model and <code>serialize()</code> in the readout:
          same fields, two shapes.
        </>
      }
      tries={[
        "Pick a different start date, then check serialize() — the field writes a real Date back (shown in its ISO form), while the form model keeps the input's own string.",
        "Edit the labels and watch serialize() rebuild the plain object from the rows. Transforms never see rows — the engine unwraps them first.",
        "Note internalRef in serialize(): no field binds it, yet it rides through untouched. Serialization writes onto the parsed object, it doesn't rebuild a payload from scratch.",
        "Add a label row and leave it blank — blank rows are dropped at serialize, so the object never gains an empty key.",
      ]}
      schema={schemaPeek}
      readout={<EngineReadout bundle={bundle} formModelOpen />}
    >
      <Exhibit>
        <FormRenderers renderers={htmlRenderers}>
          <Form form={bundle}>
            <Form.AutoFields />
          </Form>
        </FormRenderers>
      </Exhibit>
    </PageShell>
  );
}
