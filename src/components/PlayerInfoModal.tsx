import type { Player } from '../types/roster'

type PlayerInfoModalProps = {
  player: Player | null
  onClose: () => void
}

const PlayerInfoModal = ({ player, onClose }: PlayerInfoModalProps) => {
  if (!player) {
    return null
  }

  const birthplaceParts = [player.birthCity, player.birthState, player.birthCountry].filter(Boolean)
  const birthplace = birthplaceParts.join(', ') || '—'

  const identifiers = [
    { label: 'Full Name', value: player.fullName ?? player.displayName },
    { label: 'Preferred Name', value: player.displayName !== player.fullName ? player.displayName : null },
    { label: 'Short Name', value: player.shortName },
    { label: 'First Name', value: player.firstName },
    { label: 'Last Name', value: player.lastName },
    { label: 'UID', value: player.uid },
    { label: 'GUID', value: player.guid },
    { label: 'Slug', value: player.slug },
    { label: 'Type', value: player.type },
  ].filter((item) => item.value)

  const vitals = [
    { label: 'Jersey', value: player.jersey },
    { label: 'Position', value: player.positionName ?? player.position },
    { label: 'Position Abbr.', value: player.positionAbbreviation },
    { label: 'Class', value: player.experience },
    { label: 'Class Abbr.', value: player.experienceAbbreviation },
    {
      label: 'Experience (Years)',
      value:
        player.experienceYears !== null
          ? player.experienceYears.toLocaleString(undefined, { maximumFractionDigits: 0 })
          : '—',
    },
    { label: 'Status', value: player.status },
    { label: 'Status Type', value: player.statusType },
    { label: 'Status Abbr.', value: player.statusAbbreviation },
    { label: 'Active', value: player.isActive ? 'Yes' : 'No' },
    { label: 'Height', value: player.height },
    { label: 'Weight', value: player.weight },
    { label: 'Hometown', value: player.hometown },
    { label: 'Birthplace', value: birthplace },
    { label: 'Birth Country Abbr.', value: player.birthCountryAbbreviation },
  ].filter((item) => item.value)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl animate-fade-in-up rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-100 lg:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">Player</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{player.displayName}</h2>
            <p className="mt-1 text-sm text-slate-500">
              #{player.jersey} • {player.position}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:text-hoosier-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hoosier-red"
            aria-label="Close player details"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z"
              />
            </svg>
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Vitals</p>
            <dl className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              {vitals.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
                  <dd className="mt-0.5 text-slate-700">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {identifiers.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Identifiers</p>
              <dl className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                {identifiers.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
                    <dd className="mt-0.5 text-slate-700">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {player.injuries.length > 0 && (
            <div className="lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Recent Injuries</p>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                {player.injuries.map((injury, index) => (
                  <li key={injury.id ?? `${player.id}-injury-${index}`} className="rounded-xl border border-slate-200 px-3 py-2">
                    <p className="font-semibold text-slate-800">{injury.type ?? injury.status ?? 'Injury'}</p>
                    {injury.description && <p className="text-slate-600">{injury.description}</p>}
                    <div className="mt-1 flex flex-wrap gap-3 text-xs uppercase tracking-wide text-slate-400">
                      {injury.status && <span>Status: {injury.status}</span>}
                      {injury.date && <span>Updated: {injury.date}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlayerInfoModal
