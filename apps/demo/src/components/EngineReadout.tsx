import type { FieldMap, UseFormEngineReturn } from "@react-form-engine/core";
import { useMemo, useRef, useSyncExternalStore } from "react";

function adapt(store: { subscribe: (listener: () => void) => unknown }) {
  return (listener: () => void) => {
    const subscription = store.subscribe(listener);
    return typeof subscription === "function"
      ? (subscription as () => void)
      : () => (subscription as { unsubscribe: () => void }).unsubscribe();
  };
}

/** Re-renders on every notification from a store, whatever it carries. */
function useStoreTick(subscribe: (listener: () => void) => () => void): void {
  const tick = useRef(0);
  useSyncExternalStore(
    useMemo(
      () => (listener: () => void) =>
        subscribe(() => {
          tick.current += 1;
          listener();
        }),
      [subscribe],
    ),
    () => tick.current,
  );
}

export function StateBadges<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(props: { bundle: UseFormEngineReturn<TApi, TContext, TFields> }) {
  const { bundle } = props;
  const valid = useSyncExternalStore(
    useMemo(() => bundle.validation.subscribe, [bundle.validation]),
    () => bundle.validation.isValid(),
  );
  const submitted = useSyncExternalStore(
    useMemo(() => bundle.validation.subscribe, [bundle.validation]),
    () => bundle.validation.isSubmitted(),
  );
  return (
    <div className="badges">
      <span
        className={`badge ${bundle.isDirty ? "badge--dirty" : "badge--pristine"}`}
      >
        {bundle.isDirty ? "dirty" : "pristine"}
      </span>
      <span className={`badge ${valid ? "badge--valid" : "badge--invalid"}`}>
        {valid ? "valid" : "invalid"}
      </span>
      {submitted && <span className="badge badge--pristine">submitted</span>}
    </div>
  );
}

/**
 * Per-field engine metadata: the touch gate, visibility, server errors,
 * and the raw-vs-shown validation distinction, one row per resolved field.
 */
function FieldStateTable<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(props: { bundle: UseFormEngineReturn<TApi, TContext, TFields> }) {
  const { bundle } = props;
  const names = [...bundle.internals.schema.fields.keys()] as string[];
  return (
    <table className="readout__fields">
      <tbody>
        {names.map((name) => {
          const presentation = bundle.validation.presentationFor(name);
          const flags: [string, string][] = [];
          if (bundle.validation.isTouched(name)) {
            flags.push(["touched", "flag--meta"]);
          }
          if (!bundle.visibility.isVisible(name)) {
            flags.push(["hidden", "flag--meta"]);
          }
          if (bundle.internals.serverErrors.get(name) !== undefined) {
            flags.push(["server", "flag--shown"]);
          }
          if (presentation.invalid) {
            flags.push(["invalid", "flag--raw"]);
          }
          if (
            presentation.error !== undefined ||
            presentation.cellErrors.size > 0
          ) {
            flags.push(["shown", "flag--shown"]);
          }
          return (
            <tr key={name}>
              <td className="readout__field-name">{name}</td>
              <td>
                {flags.length === 0
                  ? "—"
                  : flags.map(([label, kind], i) => (
                      <span key={label}>
                        {i > 0 && " · "}
                        <span className={`flag ${kind}`}>{label}</span>
                      </span>
                    ))}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * The live view of what the engine holds: per-field metadata, the form
 * model (rows carry id/origin/meta), and the serialized API model.
 */
export function EngineReadout<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(props: {
  bundle: UseFormEngineReturn<TApi, TContext, TFields>;
  submitted?: unknown;
  /** Open the form-model section by default (row-model pages). */
  formModelOpen?: boolean;
}) {
  const { bundle } = props;
  const values = useSyncExternalStore(
    useMemo(() => adapt(bundle.internals.form.store), [bundle.internals]),
    () => bundle.internals.form.state.values,
  );
  useStoreTick(bundle.validation.subscribe);
  useStoreTick(bundle.visibility.subscribe);
  useStoreTick(bundle.internals.serverErrors.subscribe);
  const serialized = bundle.serialize();

  return (
    <aside className="readout" aria-label="Engine state">
      <div className="readout__title">engine state</div>
      <StateBadges bundle={bundle} />

      <div className="readout__label">field state</div>
      <FieldStateTable bundle={bundle} />

      <details className="readout__section" open={props.formModelOpen === true}>
        <summary>form model</summary>
        <pre className="readout__json">{JSON.stringify(values, null, 2)}</pre>
      </details>

      <div className="readout__label">serialize()</div>
      <pre className="readout__json">{JSON.stringify(serialized, null, 2)}</pre>

      {props.submitted !== undefined && (
        <>
          <div className="readout__label">last onSubmit</div>
          <pre className="readout__json readout__json--submitted">
            {JSON.stringify(props.submitted, null, 2)}
          </pre>
        </>
      )}
    </aside>
  );
}
