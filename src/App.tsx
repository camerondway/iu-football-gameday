import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import PlayerInfoModal from './components/PlayerInfoModal'
import RosterCards from './components/RosterCards'
import RosterTable from './components/RosterTable'
import SearchField from './components/SearchField'
import { useRoster } from './hooks/useRoster'
import { DEFAULT_SORT } from './lib/roster/constants'
import {
  buildRecordHighlights,
  computeRecordSummary,
  filterAndSortPlayers,
  formatLastUpdated,
  formatUpcomingEvent,
} from './lib/roster/formatters'
import type { SortConfig, SortKey } from './types/roster'

function App() {
  const { players, recordSummary, recordStats, teamMeta, loading, error, notice, lastUpdated } = useRoster()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!selectedPlayerId) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPlayerId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      body.style.overflow = previousOverflow
    }
  }, [selectedPlayerId])

  const makeStaggerStyle = (index: number): CSSProperties => ({
    animationDelay: `${Math.min(index, 12) * 45}ms`,
  })

  const computedRecordSummary = useMemo(
    () => computeRecordSummary(recordSummary, recordStats),
    [recordSummary, recordStats],
  )

  const recordHighlights = useMemo(() => buildRecordHighlights(recordStats), [recordStats])

  const upcomingEvent = useMemo(() => formatUpcomingEvent(teamMeta), [teamMeta])

  const filteredPlayers = useMemo(
    () => filterAndSortPlayers(players, searchTerm, sortConfig),
    [players, searchTerm, sortConfig],
  )

  const formattedLastUpdated = useMemo(() => formatLastUpdated(lastUpdated), [lastUpdated])

  const teamRankValue = teamMeta?.rank ?? null
  const teamShortDisplay = teamMeta?.shortDisplayName ?? null
  const teamLocation = teamMeta?.location ?? null

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

  const openPlayerModal = (playerId: string) => {
    setSelectedPlayerId(playerId)
  }

  const closePlayerModal = () => {
    setSelectedPlayerId(null)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8 lg:px-12">
      <SearchField
        value={searchTerm}
        onChange={setSearchTerm}
        containerClassName="animate-fade-in-up sticky top-[calc(env(safe-area-inset-top)+1rem)] z-40 rounded-3xl bg-white/95 p-4 shadow-xl ring-1 ring-slate-100 backdrop-blur supports-[backdrop-filter]:bg-white/70 md:hidden"
        style={{ animationDelay: '60ms' }}
      />

      <header
        className="animate-fade-in-up flex flex-col gap-6 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-100 md:flex-row md:items-start md:justify-between md:gap-10 lg:p-8"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex-1 space-y-4">
          <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-hoosier-red" aria-hidden="true" />
            Hoosiers Football
          </p>
          <h1 className="text-3xl font-semibold text-hoosier-red sm:text-4xl">Indiana Football Roster</h1>
          <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
            Search the full Indiana University roster, powered by live data from ESPN. Find players by name, number,
            position, class, or hometown in seconds.
          </p>
          {(computedRecordSummary ||
            recordHighlights.length > 0 ||
            teamMeta?.rank !== null ||
            teamMeta?.standingSummary ||
            upcomingEvent) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(computedRecordSummary || recordHighlights.length > 0) && (
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm supports-[backdrop-filter]:bg-white/60">
                  {computedRecordSummary && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Current Record</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">{computedRecordSummary}</p>
                    </div>
                  )}
                  {recordHighlights.length > 0 && (
                    <dl className={`grid grid-cols-2 gap-3 text-sm text-slate-600 ${computedRecordSummary ? 'mt-4' : ''}`}>
                      {recordHighlights.map((item) => (
                        <div key={item.label}>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
                          <dd className="mt-1 text-base font-semibold text-slate-900">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}

              {(teamRankValue !== null || teamMeta?.standingSummary) && (
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm supports-[backdrop-filter]:bg-white/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Team Status</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {teamRankValue !== null ? `#${teamRankValue}` : 'Unranked'}
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    {teamMeta?.standingSummary && <p>{teamMeta.standingSummary}</p>}
                    {teamShortDisplay && (
                      <p className="text-slate-500">
                        {teamShortDisplay}
                        {teamLocation ? ` · ${teamLocation}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {upcomingEvent && (
                <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm supports-[backdrop-filter]:bg-white/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Next Game</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{upcomingEvent.opponent}</p>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    {upcomingEvent.formattedDate && <p>{upcomingEvent.formattedDate}</p>}
                    {upcomingEvent.homeAwayDescriptor && <p>{upcomingEvent.homeAwayDescriptor}</p>}
                    {upcomingEvent.locationText && <p>{upcomingEvent.locationText}</p>}
                    {upcomingEvent.weekText && (
                      <p className="text-slate-500">
                        {upcomingEvent.weekText}
                        {upcomingEvent.seasonText ? ` • ${upcomingEvent.seasonText}` : ''}
                      </p>
                    )}
                    {upcomingEvent.broadcasts.length > 0 && (
                      <p>Broadcast: {upcomingEvent.broadcasts.join(', ')}</p>
                    )}
                    {upcomingEvent.ticketsSummary && (
                      <p>
                        {upcomingEvent.ticketsSummary}
                        {upcomingEvent.ticketsStartingPrice !== null
                          ? ` • From $${upcomingEvent.ticketsStartingPrice.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}`
                          : ''}
                      </p>
                    )}
                    {upcomingEvent.statusText && <p className="text-slate-500">{upcomingEvent.statusText}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="hidden w-full max-w-sm md:block">
          <SearchField value={searchTerm} onChange={setSearchTerm} containerClassName="max-w-sm" />
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
          <div
            className="animate-fade-in-up mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
            style={{ animationDelay: '180ms' }}
          >
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
              <RosterTable
                players={filteredPlayers}
                sortConfig={sortConfig}
                onSort={handleSort}
                onSelect={openPlayerModal}
                makeRowStyle={makeStaggerStyle}
              />
            </div>

            <div className="md:hidden">
              <RosterCards players={filteredPlayers} onSelect={openPlayerModal} makeCardStyle={makeStaggerStyle} />
            </div>
          </div>
        )}
      </section>

      <PlayerInfoModal player={selectedPlayer} onClose={closePlayerModal} />
    </main>
  )
}

export default App
