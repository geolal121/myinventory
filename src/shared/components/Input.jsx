function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  helperText = '',
  error = '',
  className = '',
  ...props
}) {
  const inputId = id || props.name
  const hasError = Boolean(error)

  const classes = [
    'ui-input',
    hasError ? 'ui-input--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="ui-input-field">
      {label && (
        <label className="ui-input-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={classes}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={hasError}
        {...props}
      />

      {error ? (
        <p className="ui-input-field__error">{error}</p>
      ) : helperText ? (
        <p className="ui-input-field__helper">{helperText}</p>
      ) : null}
    </div>
  )
}

export default Input