import type { Player, SortConfig, TeamMeta, TeamRecordStats } from '../../types/roster'
import { comparePlayers } from './data'

export const computeRecordSummary = (
  recordSummary: string | null,
  recordStats: TeamRecordStats | null,
): string | null => {
  if (recordSummary) {
    const trimmed = recordSummary.trim()

    if (trimmed) {
      return trimmed
    }
  }

  if (recordStats && recordStats.wins !== null && recordStats.losses !== null) {
    const baseRecord = `${recordStats.wins}-${recordStats.losses}`

    if (recordStats.ties !== null && recordStats.ties > 0) {
      return `${baseRecord}-${recordStats.ties}`
    }

    return baseRecord
  }

  return null
}

export const buildRecordHighlights = (recordStats: TeamRecordStats | null) => {
  if (!recordStats) {
    return [] as Array<{ label: string; value: string }>
  }

  const formatValue = (value: number | null, format: 'integer' | 'decimal' | 'difference'): string => {
    if (value === null) {
      return '—'
    }

    if (format === 'decimal') {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    }

    if (format === 'difference') {
      const sign = value > 0 ? '+' : value < 0 ? '-' : ''
      const absolute = Math.abs(value)
      const formatted = absolute.toLocaleString(undefined, { maximumFractionDigits: 0 })
      return `${sign}${formatted}`
    }

    return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  const items: Array<{ label: string; value: number | null; format: 'integer' | 'decimal' | 'difference' }> = [
    { label: 'Points For', value: recordStats.pointsFor, format: 'integer' },
    { label: 'Points Against', value: recordStats.pointsAgainst, format: 'integer' },
    { label: 'PPG', value: recordStats.avgPointsFor, format: 'decimal' },
    { label: 'Opp PPG', value: recordStats.avgPointsAgainst, format: 'decimal' },
    { label: 'Point Diff', value: recordStats.pointDifferential, format: 'difference' },
  ]

  return items
    .map((item) => ({ label: item.label, value: formatValue(item.value, item.format) }))
    .filter((item) => item.value !== '—')
}

export const formatUpcomingEvent = (teamMeta: TeamMeta | null) => {
  const event = teamMeta?.nextEvent

  if (!event) {
    return null
  }

  let formattedDate: string | null = null

  if (event.date) {
    try {
      formattedDate = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(event.date))
    } catch (formatError) {
      console.error('Unable to format next event date', formatError)
      formattedDate = new Date(event.date).toLocaleString()
    }
  }

  const venueParts: string[] = []
  if (event.venueCity) {
    venueParts.push(event.venueCity)
  }
  if (event.venueState) {
    venueParts.push(event.venueState)
  }

  const locationDetail = venueParts.join(', ') || event.venueCountry || null
  const venueDisplay = event.venue ? event.venue : null
  const locationText =
    venueDisplay && locationDetail ? `${venueDisplay} • ${locationDetail}` : venueDisplay ?? locationDetail

  let opponentLine = event.opponent ?? 'TBD'
  if (event.opponentRank !== null) {
    opponentLine = `#${event.opponentRank} ${opponentLine}`
  }

  const homeAwayDescriptor = event.isHome === null ? null : event.isHome ? 'Home matchup' : 'Road matchup'

  return {
    opponent: opponentLine,
    opponentAbbreviation: event.opponentAbbreviation,
    formattedDate,
    locationText,
    broadcasts: event.broadcasts,
    seasonText: event.seasonText,
    weekText: event.weekText,
    ticketsSummary: event.ticketsSummary,
    ticketsStartingPrice: event.ticketsStartingPrice,
    statusText: event.statusDetail ?? event.statusShortDetail,
    homeAwayDescriptor,
  }
}

export const formatLastUpdated = (timestamp: number | null) => {
  if (!timestamp) {
    return null
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp))
  } catch (formatError) {
    console.error('Unable to format roster timestamp', formatError)
    return new Date(timestamp).toLocaleString()
  }
}

export const filterAndSortPlayers = (players: Player[], query: string, sortConfig: SortConfig) => {
  const normalizedQuery = query.trim().toLowerCase()

  const baseList = normalizedQuery
    ? players.filter((player) => {
        const searchable = [
          player.displayName,
          player.fullName,
          player.firstName,
          player.lastName,
          player.jersey,
          player.position,
          player.positionAbbreviation,
          player.experience,
          player.hometown,
          player.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return searchable.includes(normalizedQuery)
      })
    : players

  return [...baseList].sort((a, b) => comparePlayers(a, b, sortConfig))
}
