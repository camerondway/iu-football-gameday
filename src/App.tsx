import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'

type Player = {
  id: string
  displayName: string
  jersey: string
  position: string
  experience: string
  height: string
  weight: string
  hometown: string
}

type SortKey = 'jersey' | 'displayName' | 'position' | 'experience' | 'height' | 'weight' | 'hometown'
type SortDirection = 'asc' | 'desc'

type SortConfig = {
  key: SortKey
  direction: SortDirection
}

const DEFAULT_SORT: SortConfig = { key: 'jersey', direction: 'asc' }
const ROSTER_STORAGE_KEY = 'iu-football-roster-cache'

type CachedRoster = {
  players: Player[]
  updatedAt: number
}

const parseWeight = (weight: string): number | null => {
  const match = weight.match(/\d+/)
  return match ? Number.parseInt(match[0] ?? '', 10) : null
}

const parseHeight = (height: string): number | null => {
  const trimmed = height.trim()
  const match = trimmed.match(/^(\d+)\s*'?\s*(\d+)?/)

  if (!match) {
    return null
  }

  const feet = Number.parseInt(match[1] ?? '', 10)
  const inches = match[2] ? Number.parseInt(match[2] ?? '', 10) : 0

  if (Number.isNaN(feet) || Number.isNaN(inches)) {
    return null
  }

  return feet * 12 + inches
}

const comparePlayers = (a: Player, b: Player, config: SortConfig): number => {
  const { key, direction } = config
  const modifier = direction === 'asc' ? 1 : -1

  if (key === 'jersey') {
    const jerseyA = Number.parseInt(a.jersey, 10)
    const jerseyB = Number.parseInt(b.jersey, 10)
    const hasJerseyA = Number.isFinite(jerseyA)
    const hasJerseyB = Number.isFinite(jerseyB)

    if (!hasJerseyA && !hasJerseyB) {
      return (
        a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) * modifier
      )
    }

    if (!hasJerseyA) {
      return direction === 'asc' ? 1 : -1
    }

    if (!hasJerseyB) {
      return direction === 'asc' ? -1 : 1
    }

    if (jerseyA !== jerseyB) {
      return (jerseyA - jerseyB) * modifier
    }
  }

  if (key === 'weight') {
    const weightA = parseWeight(a.weight)
    const weightB = parseWeight(b.weight)

    if (weightA === null && weightB === null) {
      return (
        a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) * modifier
      )
    }

    if (weightA === null) {
      return direction === 'asc' ? 1 : -1
    }

    if (weightB === null) {
      return direction === 'asc' ? -1 : 1
    }

    if (weightA !== weightB) {
      return (weightA - weightB) * modifier
    }
  }

  if (key === 'height') {
    const heightA = parseHeight(a.height)
    const heightB = parseHeight(b.height)

    if (heightA === null && heightB === null) {
      return (
        a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) * modifier
      )
    }

    if (heightA === null) {
      return direction === 'asc' ? 1 : -1
    }

    if (heightB === null) {
      return direction === 'asc' ? -1 : 1
    }

    if (heightA !== heightB) {
      return (heightA - heightB) * modifier
    }
  }

  const baseComparison = a[key].localeCompare(b[key], undefined, { sensitivity: 'base' })

  if (baseComparison !== 0) {
    return baseComparison * modifier
  }

  return (
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) * modifier
  )
}

const isValidPlayerRecord = (value: unknown): value is Player => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  const requiredKeys: Array<keyof Player> = [
    'id',
    'displayName',
    'jersey',
    'position',
    'experience',
    'height',
    'weight',
    'hometown',
  ]

  return requiredKeys.every((key) => typeof record[key] === 'string')
}

const ROSTER_ENDPOINT =
  'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/84?enable=roster'

function App() {
  const [players, setPlayers] = useState<Player[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const makeStaggerStyle = (index: number): CSSProperties => ({
    animationDelay: `${Math.min(index, 12) * 45}ms`,
  })

  const SearchField = ({
    containerClassName,
    style,
  }: {
    containerClassName?: string
    style?: CSSProperties
  }) => (
    <label
      className={`block w-full space-y-2 text-sm font-semibold text-slate-600 ${
        containerClassName ?? ''
      }`}
      style={style}
    >
      <span className="block uppercase tracking-wide">Search players</span>
      <div className="relative">
        <input
          type="search"
          name="roster-search"
          autoComplete="off"
          placeholder="Name, number, position, class, hometown..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 pr-12 text-base font-normal text-slate-900 shadow-sm transition focus:border-hoosier-red focus:outline-none focus:ring-4 focus:ring-hoosier-red/15"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
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

  const columns: Array<{ key: SortKey; label: string }> = [
    { key: 'jersey', label: '#' },
    { key: 'displayName', label: 'Name' },
    { key: 'position', label: 'Pos' },
    { key: 'experience', label: 'Class' },
    { key: 'height', label: 'Height' },
    { key: 'weight', label: 'Weight' },
    { key: 'hometown', label: 'Hometown' },
  ]

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        }
      }

      return { key, direction: 'asc' }
    })
  }

  useEffect(() => {
    const controller = new AbortController()
    let cachedPlayers: Player[] = []
    let cachedTimestamp: number | null = null

    const hydrateFromCache = () => {
      if (typeof window === 'undefined') {
        return
      }

      try {
        const raw = window.localStorage.getItem(ROSTER_STORAGE_KEY)

        if (!raw) {
          return
        }

        const parsed = JSON.parse(raw) as Partial<CachedRoster>
        const storedPlayers = Array.isArray(parsed.players)
          ? parsed.players.filter(isValidPlayerRecord)
          : []

        if (!storedPlayers.length) {
          return
        }

        cachedPlayers = storedPlayers
        cachedTimestamp =
          typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
            ? parsed.updatedAt
            : null

        setPlayers(storedPlayers)
        setError(null)
        setLoading(false)
        setNotice(null)

        if (cachedTimestamp) {
          setLastUpdated(cachedTimestamp)
        } else {
          setLastUpdated(null)
        }
      } catch (cacheError) {
        console.error('Unable to read cached roster', cacheError)
      }
    }

    hydrateFromCache()

    async function loadRoster() {
      try {
        setError(null)
        setNotice(null)

        if (!cachedPlayers.length) {
          setLoading(true)
        }

        const response = await fetch(ROSTER_ENDPOINT, { signal: controller.signal })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = await response.json()
        const rawAthletes = (payload?.team?.athletes ?? []) as unknown[]

        const mapped = rawAthletes
          .map((athlete) => {
            if (!athlete || typeof athlete !== 'object') {
              return null
            }

            const record = athlete as Record<string, unknown>
            const id = String(record.id ?? '')
            const displayName = String(record.displayName ?? record.fullName ?? '')
            const jersey = String(record.jersey ?? '').trim() || '—'

            if (!id || !displayName) {
              return null
            }

            const position = String(
              (record.position as Record<string, unknown> | undefined)?.displayName ??
                (record.position as Record<string, unknown> | undefined)?.abbreviation ??
                '—'
            )

            const experience = String(
              (record.experience as Record<string, unknown> | undefined)?.displayValue ?? '—'
            )

            const height = String(record.displayHeight ?? '—')
            const weight = String(record.displayWeight ?? '—')

            const birthPlace = record.birthPlace as Record<string, unknown> | undefined
            const city = birthPlace?.city ? String(birthPlace.city).trim() : ''
            const state = birthPlace?.state ? String(birthPlace.state).trim() : ''
            const country = birthPlace?.country ? String(birthPlace.country).trim() : ''
            const hometownParts = [city, state || country].filter(Boolean)
            const hometown = hometownParts.join(', ') || '—'

            return {
              id,
              displayName,
              jersey,
              position,
              experience,
              height,
              weight,
              hometown,
            }
          })
          .filter((player): player is Player => Boolean(player))

        const sorted = [...mapped].sort((a, b) => {
          const aNumber = Number.parseInt(a.jersey, 10)
          const bNumber = Number.parseInt(b.jersey, 10)

          if (Number.isNaN(aNumber) && Number.isNaN(bNumber)) {
            return a.displayName.localeCompare(b.displayName)
          }

          if (Number.isNaN(aNumber)) return 1
          if (Number.isNaN(bNumber)) return -1
          return aNumber - bNumber
        })

        cachedPlayers = sorted
        const timestamp = Date.now()
        cachedTimestamp = timestamp

        setPlayers(sorted)
        setLastUpdated(timestamp)

        if (typeof window !== 'undefined') {
          try {
            const payloadToStore: CachedRoster = { players: sorted, updatedAt: timestamp }
            window.localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(payloadToStore))
          } catch (storageError) {
            console.error('Unable to cache roster', storageError)
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }

        console.error('Unable to load roster', err)

        if (!cachedPlayers.length) {
          setError('Unable to load the roster right now. Please try again later.')
          setLastUpdated(null)
        } else {
          setNotice('Showing the last saved roster. Live data is currently unavailable.')

          if (cachedTimestamp) {
            setLastUpdated(cachedTimestamp)
          } else {
            setLastUpdated(null)
          }
        }
      } finally {
        setLoading(false)
      }
    }

    loadRoster()

    return () => controller.abort()
  }, [])

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase()

    const baseList = normalizedQuery
      ? players.filter((player) => {
          const searchable = [
            player.displayName,
            player.jersey,
            player.position,
            player.experience,
            player.hometown,
          ]
            .join(' ')
            .toLowerCase()

          return searchable.includes(normalizedQuery)
        })
      : players

    return [...baseList].sort((a, b) => comparePlayers(a, b, sortConfig))
  }, [players, searchTerm, sortConfig])

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) {
      return null
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(lastUpdated))
    } catch (formatError) {
      console.error('Unable to format roster timestamp', formatError)
      return new Date(lastUpdated).toLocaleString()
    }
  }, [lastUpdated])

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8 lg:px-12">
      <SearchField
        containerClassName="animate-fade-in-up sticky top-[calc(env(safe-area-inset-top)+1rem)] z-40 rounded-3xl bg-white/95 p-4 shadow-xl ring-1 ring-slate-100 backdrop-blur supports-[backdrop-filter]:bg-white/70 md:hidden"
        style={{ animationDelay: '60ms' }}
      />

      <header
        className="animate-fade-in-up flex flex-col gap-6 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-100 md:flex-row md:items-start md:justify-between md:gap-10 lg:p-8"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex-1 space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-hoosier-red" aria-hidden="true" />
            Hoosiers Football
          </p>
          <h1 className="text-3xl font-semibold text-hoosier-red sm:text-4xl">Indiana Football Roster</h1>
          <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
            Search the full Indiana University roster, powered by live data from ESPN. Find players by
            name, number, position, class, or hometown in seconds.
          </p>
        </div>
        <div className="hidden w-full max-w-sm md:block">
          <SearchField containerClassName="max-w-sm" />
        </div>
      </header>

      <section
        className="animate-fade-in-up rounded-3xl bg-white/95 p-4 shadow-xl ring-1 ring-slate-100 sm:p-6"
        style={{ animationDelay: '140ms' }}
      >
        {loading && (
          <div className="flex h-40 items-center justify-center text-base font-medium text-slate-600">
            <span className="animate-pulse">Loading roster…</span>
          </div>
        )}

        {!loading && notice && !error && (
          <div className="animate-fade-in-up mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900" style={{ animationDelay: '180ms' }}>
            {notice}
          </div>
        )}

        {!loading && error && (
          <div className="animate-fade-in-up flex h-40 items-center justify-center text-center text-base font-semibold text-hoosier-red">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {formattedLastUpdated && (
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                Last updated {formattedLastUpdated}
              </p>
            )}

            <div className="hidden md:block">
              <div className="animate-fade-in-up max-h-[65vh] overflow-auto rounded-2xl border border-slate-200" style={{ animationDelay: '220ms' }}>
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {columns.map((column) => {
                        const isActive = sortConfig.key === column.key
                        const ariaSort: 'ascending' | 'descending' | 'none' = isActive
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'

                        return (
                          <th
                            key={column.key}
                            scope="col"
                            className="sticky top-0 z-10 px-4 py-3"
                            aria-sort={ariaSort}
                          >
                            <button
                              type="button"
                              onClick={() => handleSort(column.key)}
                              aria-label={
                                isActive
                                  ? `Sort by ${column.label}, ${
                                      sortConfig.direction === 'asc' ? 'ascending' : 'descending'
                                    }`
                                  : `Sort by ${column.label}`
                              }
                              className="flex w-full items-center justify-between gap-2 text-left uppercase tracking-wider text-slate-500 transition hover:text-slate-700 focus:outline-none focus-visible:text-slate-700 focus-visible:ring-2 focus-visible:ring-hoosier-red/40"
                            >
                              <span>{column.label}</span>
                              <span className="text-[0.65rem] text-slate-400" aria-hidden="true">
                                {isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '▲▼'}
                              </span>
                            </button>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-base font-medium text-slate-500">
                          No players match that search.
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((player, index) => (
                        <tr
                          key={player.id}
                          className="animate-fade-in-up odd:bg-white even:bg-slate-50/60 transition hover:bg-hoosier-red/5"
                          style={makeStaggerStyle(index)}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                            {player.jersey}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                            {player.displayName}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{player.position}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{player.experience}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{player.height}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{player.weight}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{player.hometown}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 md:hidden">
              {filteredPlayers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-base font-medium text-slate-500">
                  No players match that search.
                </div>
              ) : (
                filteredPlayers.map((player, index) => (
                  <article
                    key={player.id}
                    className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                    style={makeStaggerStyle(index)}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-semibold text-hoosier-red">#{player.jersey}</span>
                      <span className="text-sm font-medium uppercase tracking-wide text-slate-500">
                        {player.position}
                      </span>
                    </div>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">{player.displayName}</h2>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                      <div>
                        <dt className="font-medium text-slate-500">Class</dt>
                        <dd>{player.experience}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">Hometown</dt>
                        <dd>{player.hometown}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">Height</dt>
                        <dd>{player.height}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">Weight</dt>
                        <dd>{player.weight}</dd>
                      </div>
                    </dl>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
