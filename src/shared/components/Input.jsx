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
  onClear,
  clearLabel = 'Clear input',
  ...props
}) {
  const inputId = id || props.name
  const hasError = Boolean(error)

  const classes = [
    'ui-input',
    hasError ? 'ui-input--error' : '',
    onClear && value ? 'ui-input--clearable' : '',
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

      <div className="ui-input-field__control">
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

        {onClear && value && (
          <button
            className="ui-input-field__clear"
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
          >
            Clear
          </button>
        )}
      </div>

      {error ? (
        <p className="ui-input-field__error">{error}</p>
      ) : helperText ? (
        <p className="ui-input-field__helper">{helperText}</p>
      ) : null}
    </div>
  )
}

export default Input
