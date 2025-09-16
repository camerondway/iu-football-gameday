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

const ROSTER_ENDPOINT =
  'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/84?enable=roster'

function App() {
  const [players, setPlayers] = useState<Player[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadRoster() {
      try {
        setError(null)
        setLoading(true)
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

        setPlayers(sorted)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }

        console.error('Unable to load roster', err)
        setError('Unable to load the roster right now. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    loadRoster()

    return () => controller.abort()
  }, [])

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase()

    if (!normalizedQuery) {
      return players
    }

    return players.filter((player) => {
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
  }, [players, searchTerm])

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-6 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-100 md:flex-row md:items-start md:justify-between md:gap-10 lg:p-8">
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

        <label className="w-full max-w-sm space-y-2 text-sm font-semibold text-slate-600">
          <span className="block uppercase tracking-wide">Search players</span>
          <input
            type="search"
            name="roster-search"
            autoComplete="off"
            placeholder="Name, number, position, class, hometown..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-hoosier-red focus:outline-none focus:ring-4 focus:ring-hoosier-red/15"
          />
        </label>
      </header>

      <section className="rounded-3xl bg-white/95 p-4 shadow-xl ring-1 ring-slate-100 sm:p-6">
        {loading && (
          <div className="flex h-40 items-center justify-center text-base font-medium text-slate-600">
            Loading roster…
          </div>
        )}

        {!loading && error && (
          <div className="flex h-40 items-center justify-center text-center text-base font-semibold text-hoosier-red">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            <div className="hidden md:block">
              <div className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th scope="col" className="sticky top-0 z-10 px-4 py-3">
                        #
                      </th>
                      <th scope="col" className="sticky top-0 z-10 px-4 py-3">
                        Name
                      </th>
                      <th scope="col" className="sticky top-0 z-10 px-4 py-3">
                        Pos
                      </th>
                      <th scope="col" className="sticky top-0 z-10 px-4 py-3">
                        Class
                      </th>
                      <th scope="col" className="sticky top-0 z-10 px-4 py-3">
                        Height
                      </th>
                      <th scope="col" className="sticky top-0 z-10 px-4 py-3">
                        Weight
                      </th>
                      <th scope="col" className="sticky top-0 z-10 px-4 py-3">
                        Hometown
                      </th>
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
                      filteredPlayers.map((player) => (
                        <tr
                          key={player.id}
                          className="odd:bg-white even:bg-slate-50/60 transition hover:bg-hoosier-red/5"
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
                filteredPlayers.map((player) => (
                  <article
                    key={player.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
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
