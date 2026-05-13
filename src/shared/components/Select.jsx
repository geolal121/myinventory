function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  helperText = '',
  error = '',
  className = '',
  ...props
}) {
  const selectId = id || props.name
  const hasError = Boolean(error)

  const classes = [
    'ui-select',
    hasError ? 'ui-select--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="ui-select-field">
      {label && (
        <label className="ui-select-field__label" htmlFor={selectId}>
          {label}
        </label>
      )}

      <select
        id={selectId}
        className={classes}
        value={value}
        onChange={onChange}
        aria-invalid={hasError}
        {...props}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p className="ui-select-field__error">{error}</p>
      ) : helperText ? (
        <p className="ui-select-field__helper">{helperText}</p>
      ) : null}
    </div>
  )
}

export default Select