import { useId } from 'react';

/**
 * Campo de formulario accesible: etiqueta visible, ayuda, contador y error
 * asociados con aria-describedby; aria-invalid cuando hay error.
 */
export default function Field({
  label, error, hint, as = 'input', required = false, maxLength, value = '', className = '', ...props
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const countId = maxLength ? `${id}-count` : undefined;
  const Tag = as;
  const describedBy = [hintId, countId, errId].filter(Boolean).join(' ') || undefined;
  const length = String(value ?? '').length;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required ? <span className="field__req"> (obligatorio)</span> : <span className="field__opt"> (opcional)</span>}
      </label>
      {hint && <p id={hintId} className="field__hint">{hint}</p>}
      {as === 'select' ? (
        <select id={id} value={value} aria-invalid={Boolean(error)} aria-describedby={describedBy} required={required} {...props} />
      ) : (
        <Tag
          id={id}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          required={required}
          maxLength={maxLength}
          {...props}
        />
      )}
      {maxLength && (
        <p id={countId} className="field__count" aria-live="off">
          {length} de {maxLength} caracteres
        </p>
      )}
      {error && (
        <p id={errId} className="field__error">
          <span aria-hidden="true">⚠ </span>{error}
        </p>
      )}
    </div>
  );
}
