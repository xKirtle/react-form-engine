import {
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { FieldRenderProps } from "../types/renderers";
import { createClaimRegistry } from "./claims";
import { type AnyFormBundle, FormContext, useFormContext } from "./FormContext";
import { useRenderers } from "./FormRenderers";
import { useFieldProps } from "./useField";

export interface FormProps {
  form: AnyFormBundle;
  children: ReactNode;
}

export interface FieldProps {
  name: string;
  /**
   * Custom markup instead of the mapped renderer. Hosted as a component
   * body, so hooks are legal inside.
   */
  children?: (api: FieldRenderProps) => ReactNode;
}

export interface AutoFieldsProps {
  /** Names to skip, on top of fields claimed by explicit `Form.Field`s. */
  except?: readonly string[];
  filter?: (name: string) => boolean;
}

/**
 * The form's rendering root: provides the bundle to `Form.Field` and
 * `Form.AutoFields`. Headless — renders no markup of its own.
 */
export function Form(props: FormProps) {
  const [claims] = useState(createClaimRegistry);
  const value = useMemo(
    () => ({ bundle: props.form, claims }),
    [props.form, claims],
  );
  return (
    <FormContext.Provider value={value}>{props.children}</FormContext.Provider>
  );
}

function Field(props: FieldProps) {
  const { bundle, claims } = useFormContext();
  const renderers = useRenderers();

  // Claim before paint, so AutoFields never shows the field twice.
  useLayoutEffect(() => claims.claim(props.name), [claims, props.name]);

  const api = useFieldProps(bundle, props.name);
  const visible = useSyncExternalStore(
    useMemo(() => bundle.visibility.subscribe, [bundle.visibility]),
    () => bundle.visibility.isVisible(props.name),
  );

  if (!visible) {
    return null;
  }
  if (props.children !== undefined) {
    return <RenderPropHost render={props.children} api={api} />;
  }
  const Renderer = renderers[api.definition.type];
  if (Renderer === undefined) {
    throw new Error(
      `No renderer for field type "${api.definition.type}". ` +
        "Provide one through <FormRenderers>.",
    );
  }
  return <Renderer {...api} />;
}

/** The render-prop function executes as this component's body. */
function RenderPropHost(props: {
  render: (api: FieldRenderProps) => ReactNode;
  api: FieldRenderProps;
}) {
  return <>{props.render(props.api)}</>;
}

function AutoFields(props: AutoFieldsProps) {
  const { bundle, claims } = useFormContext();

  useSyncExternalStore(
    useMemo(() => claims.subscribe, [claims]),
    claims.version,
  );
  useSyncExternalStore(
    useMemo(() => bundle.internals.schemaVersion.subscribe, [bundle]),
    bundle.internals.schemaVersion.current,
  );

  const except = new Set(props.except ?? []);
  const names = [...bundle.internals.schema.fields.keys()].filter(
    (name) =>
      !claims.isClaimed(name) &&
      !except.has(name) &&
      (props.filter?.(name) ?? true),
  );
  return (
    <>
      {names.map((name) => (
        <AutoField key={name} name={name} />
      ))}
    </>
  );
}

/**
 * AutoFields' fields must not claim (claiming would exclude them from the
 * very list being rendered), so this is Field minus the claim effect.
 */
function AutoField(props: { name: string }) {
  const { bundle } = useFormContext();
  const renderers = useRenderers();
  const api = useFieldProps(bundle, props.name);
  const visible = useSyncExternalStore(
    useMemo(() => bundle.visibility.subscribe, [bundle.visibility]),
    () => bundle.visibility.isVisible(props.name),
  );

  if (!visible) {
    return null;
  }
  const Renderer = renderers[api.definition.type];
  if (Renderer === undefined) {
    throw new Error(
      `No renderer for field type "${api.definition.type}". ` +
        "Provide one through <FormRenderers>.",
    );
  }
  return <Renderer {...api} />;
}

Form.Field = Field;
Form.AutoFields = AutoFields;
