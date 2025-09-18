import type { CSSProperties, ChangeEvent } from 'react'

export type SearchFieldProps = {
  value: string
  onChange: (value: string) => void
  containerClassName?: string
  style?: CSSProperties
}

const SearchField = ({ value, onChange, containerClassName, style }: SearchFieldProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }

  return (
    <label
      className={`block w-full space-y-2 text-sm font-semibold text-slate-600 ${containerClassName ?? ''}`}
      style={style}
    >
      <span className="block uppercase tracking-wide">Search players</span>
      <div className="relative">
        <input
          type="search"
          name="roster-search"
          autoComplete="off"
          placeholder="Name, number, position, class, hometown..."
          value={value}
          onChange={handleChange}
          className="w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 pr-12 text-base font-normal text-slate-900 shadow-sm transition focus:border-hoosier-red focus:outline-none focus:ring-4 focus:ring-hoosier-red/15"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-2 inline-flex items-center justify-center rounded-xl bg-white/60 px-2 text-slate-400 transition hover:text-hoosier-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hoosier-red"
            aria-label="Clear search"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z"
              />
            </svg>
          </button>
        )}
      </div>
    </label>
  )
}

export default SearchField
