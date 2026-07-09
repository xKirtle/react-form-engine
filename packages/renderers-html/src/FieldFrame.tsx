import { type ReactNode, useId } from "react";

/**
 * Attributes for the framed control, spread onto the input/select. The
 * error region's id is always referenced (the empty live region resolves),
 * so announcements work from the first error on.
 */
export interface FieldControlProps {
  id: string;
  "aria-describedby": string;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
}

export interface FieldFrameProps {
  label: ReactNode;
  description?: string | undefined;
  error?: string | undefined;
  required?: boolean;
  /** `fieldset`/`legend` chrome for fields with multiple controls. */
  asGroup?: boolean;
  /** Extra class on the root, e.g. `"rfe-field--checkbox"`. */
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * The accessible chrome around one field: label (or legend), optional
 * description, the control, and a polite live region for the error —
 * polite rather than `role="alert"` so announcements never interrupt
 * typing. All ids come from `useId`, so multiple forms coexist on a page
 * without collisions.
 *
 * Class names are stable API for styling: `rfe-field`, `rfe-field__label`,
 * `rfe-field__description`, `rfe-field__error`, `rfe-field__required`,
 * and the `rfe-field--invalid` / `rfe-field--group` modifiers.
 */
export function FieldFrame(props: FieldFrameProps) {
  const baseId = useId();
  const controlId = `${baseId}-control`;
  const descriptionId = `${baseId}-description`;
  const errorId = `${baseId}-error`;
  const invalid = props.error !== undefined;
  const required = props.required === true;

  const control: FieldControlProps = {
    id: controlId,
    "aria-describedby":
      props.description !== undefined ? `${descriptionId} ${errorId}` : errorId,
    "aria-invalid": invalid ? true : undefined,
    "aria-required": required ? true : undefined,
  };

  const className = [
    "rfe-field",
    invalid ? "rfe-field--invalid" : undefined,
    props.asGroup === true ? "rfe-field--group" : undefined,
    props.className,
  ]
    .filter((entry) => entry !== undefined)
    .join(" ");

  const labelContent = (
    <>
      {props.label}
      {required && (
        <span className="rfe-field__required" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </>
  );
  const description =
    props.description !== undefined ? (
      <span className="rfe-field__description" id={descriptionId}>
        {props.description}
      </span>
    ) : null;
  const errorRegion = (
    <span className="rfe-field__error" id={errorId} aria-live="polite">
      {props.error}
    </span>
  );

  if (props.asGroup === true) {
    return (
      <fieldset
        className={className}
        aria-describedby={control["aria-describedby"]}
      >
        <legend className="rfe-field__label">{labelContent}</legend>
        {description}
        {props.children(control)}
        {errorRegion}
      </fieldset>
    );
  }

  return (
    <div className={className}>
      <label className="rfe-field__label" htmlFor={controlId}>
        {labelContent}
      </label>
      {description}
      {props.children(control)}
      {errorRegion}
    </div>
  );
}
