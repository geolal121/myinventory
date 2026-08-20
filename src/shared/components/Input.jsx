import { Search, X } from 'lucide-react'

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
  const isSearch = type === 'search'
  const hasClearButton = Boolean(onClear && value)

  const classes = [
    'ui-input',
    hasError ? 'ui-input--error' : '',
    isSearch ? 'ui-input--search' : '',
    hasClearButton ? 'ui-input--clearable' : '',
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
        {isSearch && (
          <Search
            className="ui-input-field__search-icon"
            size={19}
            strokeWidth={2}
            aria-hidden="true"
          />
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

        {hasClearButton && (
          <button
            className="ui-input-field__clear"
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            title={clearLabel}
          >
            <X size={18} strokeWidth={2.25} aria-hidden="true" />
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
