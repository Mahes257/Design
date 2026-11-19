/** Form primitives: Field wrapper, text Input and Select. */
export function Field({ label, htmlFor, hint, children }) {
  return (
    <div className="form-field">
      {label && (
        <label className="form-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}

export default function Input({ label, id, hint, className = '', ...rest }) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input id={id} className={`form-input ${className}`.trim()} {...rest} />
    </Field>
  );
}

export function Select({ label, id, hint, options = [], className = '', ...rest }) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <select id={id} className={`form-select ${className}`.trim()} {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Textarea({ label, id, hint, className = '', ...rest }) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <textarea id={id} className={`form-textarea ${className}`.trim()} {...rest} />
    </Field>
  );
}
