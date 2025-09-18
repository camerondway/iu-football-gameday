import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'

type PlayerInjury = {
  id: string | null
  type: string | null
  status: string | null
  description: string | null
  date: string | null
}

type Player = {
  id: string
  uid: string | null
  guid: string | null
  displayName: string
  fullName: string | null
  firstName: string | null
  lastName: string | null
  shortName: string | null
  jersey: string
  position: string
  positionAbbreviation: string | null
  positionName: string | null
  positionId: string | null
  experience: string
  experienceAbbreviation: string | null
  experienceYears: number | null
  height: string
  weight: string
  hometown: string
  birthCity: string | null
  birthState: string | null
  birthCountry: string | null
  birthCountryAbbreviation: string | null
  flagUrl: string | null
  flagAlt: string | null
  status: string
  statusType: string | null
  statusAbbreviation: string | null
  isActive: boolean
  slug: string | null
  type: string | null
  injuries: PlayerInjury[]
}

type TeamRecordStats = {
  wins: number | null
  losses: number | null
  ties: number | null
  streak: number | null
  pointsFor: number | null
  pointsAgainst: number | null
  avgPointsFor: number | null
  avgPointsAgainst: number | null
  pointDifferential: number | null
}

type ParsedTeamRecord = {
  summary: string | null
  stats: TeamRecordStats | null
}

type TeamNextEvent = {
  id: string
  name: string | null
  shortName: string | null
  date: string | null
  opponent: string | null
  opponentAbbreviation: string | null
  opponentRank: number | null
  isHome: boolean | null
  venue: string | null
  venueCity: string | null
  venueState: string | null
  venueCountry: string | null
  seasonText: string | null
  weekText: string | null
  broadcasts: string[]
  ticketsSummary: string | null
  ticketsStartingPrice: number | null
  statusDetail: string | null
  statusShortDetail: string | null
}

type TeamMeta = {
  rank: number | null
  standingSummary: string | null
  displayName: string | null
  shortDisplayName: string | null
  location: string | null
  nickname: string | null
  abbreviation: string | null
  color: string | null
  alternateColor: string | null
  nextEvent: TeamNextEvent | null
}

type SortKey = 'jersey' | 'displayName' | 'position' | 'experience' | 'height' | 'weight' | 'hometown'
type SortDirection = 'asc' | 'desc'

type SortConfig = {
  key: SortKey
  direction: SortDirection
}

const DEFAULT_SORT: SortConfig = { key: 'jersey', direction: 'asc' }
const ROSTER_STORAGE_KEY = 'iu-football-roster-cache'
const TEAM_ID = '84'
const ROSTER_ENDPOINT = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${TEAM_ID}?enable=roster`

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
      return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) * modifier
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
      return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) * modifier
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
      return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) * modifier
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

  return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) * modifier
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

const RECORD_STAT_KEYS: Array<keyof TeamRecordStats> = [
  'wins',
  'losses',
  'ties',
  'streak',
  'pointsFor',
  'pointsAgainst',
  'avgPointsFor',
  'avgPointsAgainst',
  'pointDifferential',
]

const createEmptyRecordStats = (): TeamRecordStats => ({
  wins: null,
  losses: null,
  ties: null,
  streak: null,
  pointsFor: null,
  pointsAgainst: null,
  avgPointsFor: null,
  avgPointsAgainst: null,
  pointDifferential: null,
})

const toNumberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const toStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' ? value : null

const trimStringOrNull = (value: string | null): string | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return trimStringOrNull(value)
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

const normalizeRecordStats = (value: unknown): TeamRecordStats | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const result = createEmptyRecordStats()
  let hasValue = false

  for (const key of RECORD_STAT_KEYS) {
    const numeric = toNumberOrNull((value as Record<string, unknown>)[key])
    if (numeric !== null) {
      result[key] = numeric
      hasValue = true
    }
  }

  return hasValue ? result : null
}

const RECORD_STAT_MAPPINGS: Array<[keyof TeamRecordStats, string]> = [
  ['wins', 'wins'],
  ['losses', 'losses'],
  ['ties', 'ties'],
  ['streak', 'streak'],
  ['pointsFor', 'pointsFor'],
  ['pointsAgainst', 'pointsAgainst'],
  ['avgPointsFor', 'avgPointsFor'],
  ['avgPointsAgainst', 'avgPointsAgainst'],
  ['pointDifferential', 'pointDifferential'],
]

const extractRecordStatsFromPayload = (rawStats: unknown): TeamRecordStats | null => {
  if (!Array.isArray(rawStats)) {
    return null
  }

  const values = new Map<string, number>()

  for (const entry of rawStats) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const record = entry as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name : null
    const value = toNumberOrNull(record.value)

    if (name && value !== null) {
      values.set(name, value)
    }
  }

  const stats = createEmptyRecordStats()
  let hasValue = false

  for (const [key, statName] of RECORD_STAT_MAPPINGS) {
    const statValue = values.get(statName)

    if (statValue === undefined) {
      continue
    }

    stats[key] = statValue
    hasValue = true
  }

  return hasValue ? stats : null
}

const normalizePlayerInjuries = (value: unknown): PlayerInjury[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null
      }

      const record = entry as Record<string, unknown>
      const statusValue = record.status
      let status: string | null = null

      if (typeof statusValue === 'string') {
        status = trimStringOrNull(statusValue)
      } else if (statusValue && typeof statusValue === 'object') {
        const statusRecord = statusValue as Record<string, unknown>
        status =
          trimStringOrNull(toStringOrNull(statusRecord.description)) ??
          trimStringOrNull(toStringOrNull(statusRecord.detail)) ??
          trimStringOrNull(toStringOrNull(statusRecord.type)) ??
          trimStringOrNull(toStringOrNull(statusRecord.name))
      }

      const description =
        trimStringOrNull(toStringOrNull(record.description)) ??
        trimStringOrNull(toStringOrNull(record.detail))

      const injury: PlayerInjury = {
        id: toTrimmedString(record.id),
        type: toTrimmedString(record.type),
        status,
        description,
        date: toTrimmedString(record.date),
      }

      if (injury.id || injury.type || injury.status || injury.description || injury.date) {
        return injury
      }

      return null
    })
    .filter((injury): injury is PlayerInjury => Boolean(injury))
}

const createEmptyTeamMeta = (): TeamMeta => ({
  rank: null,
  standingSummary: null,
  displayName: null,
  shortDisplayName: null,
  location: null,
  nickname: null,
  abbreviation: null,
  color: null,
  alternateColor: null,
  nextEvent: null,
})

const normalizeTeamNextEvent = (value: unknown): TeamNextEvent | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const id = toTrimmedString(record.id)

  if (!id) {
    return null
  }

  const broadcasts = Array.isArray(record.broadcasts)
    ? (record.broadcasts
        .map((item) => trimStringOrNull(toStringOrNull(item)))
        .filter((item): item is string => Boolean(item)) as string[])
    : []

  let isHome: boolean | null = null
  if (typeof record.isHome === 'boolean') {
    isHome = record.isHome
  } else if (typeof record.isHome === 'string') {
    const normalized = record.isHome.toLowerCase()
    if (normalized === 'true') {
      isHome = true
    } else if (normalized === 'false') {
      isHome = false
    }
  }

  return {
    id,
    name: trimStringOrNull(toStringOrNull(record.name)),
    shortName: trimStringOrNull(toStringOrNull(record.shortName)),
    date: trimStringOrNull(toStringOrNull(record.date)),
    opponent: trimStringOrNull(toStringOrNull(record.opponent)),
    opponentAbbreviation: trimStringOrNull(toStringOrNull(record.opponentAbbreviation)),
    opponentRank: toNumberOrNull(record.opponentRank),
    isHome,
    venue: trimStringOrNull(toStringOrNull(record.venue)),
    venueCity: trimStringOrNull(toStringOrNull(record.venueCity)),
    venueState: trimStringOrNull(toStringOrNull(record.venueState)),
    venueCountry: trimStringOrNull(toStringOrNull(record.venueCountry)),
    seasonText: trimStringOrNull(toStringOrNull(record.seasonText)),
    weekText: trimStringOrNull(toStringOrNull(record.weekText)),
    broadcasts,
    ticketsSummary: trimStringOrNull(toStringOrNull(record.ticketsSummary)),
    ticketsStartingPrice: toNumberOrNull(record.ticketsStartingPrice),
    statusDetail: trimStringOrNull(toStringOrNull(record.statusDetail)),
    statusShortDetail: trimStringOrNull(toStringOrNull(record.statusShortDetail)),
  }
}

const parseTeamNextEvent = (value: unknown): TeamNextEvent | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const event = value as Record<string, unknown>
  const id = toTrimmedString(event.id) ?? toTrimmedString(event.uid)

  if (!id) {
    return null
  }

  const date = trimStringOrNull(toStringOrNull(event.date))
  const name = trimStringOrNull(toStringOrNull(event.name))
  const shortName = trimStringOrNull(toStringOrNull(event.shortName))

  let seasonText: string | null = null
  const season = event.season
  if (season && typeof season === 'object') {
    const seasonRecord = season as Record<string, unknown>
    seasonText =
      trimStringOrNull(toStringOrNull(seasonRecord.displayName)) ?? toTrimmedString(seasonRecord.year)
  }

  let weekText: string | null = null
  const week = event.week
  if (week && typeof week === 'object') {
    const weekRecord = week as Record<string, unknown>
    weekText =
      trimStringOrNull(toStringOrNull(weekRecord.text)) ?? toTrimmedString(weekRecord.number)
  }

  let opponent: string | null = null
  let opponentAbbreviation: string | null = null
  let opponentRank: number | null = null
  let isHome: boolean | null = null

  const competitions = Array.isArray(event.competitions) ? event.competitions : []
  let venueName: string | null = null
  let venueCity: string | null = null
  let venueState: string | null = null
  let venueCountry: string | null = null
  const broadcasts: string[] = []
  let ticketsSummary: string | null = null
  let ticketsStartingPrice: number | null = null
  let statusDetail: string | null = null
  let statusShortDetail: string | null = null

  if (competitions.length > 0) {
    const competition = competitions[0]

    if (competition && typeof competition === 'object') {
      const competitionRecord = competition as Record<string, unknown>
      const competitors = Array.isArray(competitionRecord.competitors)
        ? competitionRecord.competitors
        : []

      for (const competitor of competitors) {
        if (!competitor || typeof competitor !== 'object') {
          continue
        }

        const competitorRecord = competitor as Record<string, unknown>
        const teamRecord = competitorRecord.team as Record<string, unknown> | undefined
        const teamIdValue = teamRecord?.id
        const teamId = teamIdValue !== undefined && teamIdValue !== null ? String(teamIdValue) : null
        const homeAway = trimStringOrNull(toStringOrNull(competitorRecord.homeAway))

        if (teamId === TEAM_ID) {
          if (homeAway) {
            isHome = homeAway === 'home'
          }
          continue
        }

        if (teamRecord) {
          opponent =
            trimStringOrNull(toStringOrNull(teamRecord.displayName)) ??
            trimStringOrNull(toStringOrNull(teamRecord.nickname)) ??
            trimStringOrNull(toStringOrNull(teamRecord.location))
          opponentAbbreviation =
            trimStringOrNull(toStringOrNull(teamRecord.abbreviation)) ?? opponentAbbreviation
        }

        if (homeAway) {
          isHome = homeAway === 'home'
        }

        const curatedRank = competitorRecord.curatedRank as Record<string, unknown> | undefined
        const currentRank = curatedRank ? toNumberOrNull(curatedRank.current) : null
        if (currentRank !== null) {
          opponentRank = currentRank
        }

        break
      }

      if (isHome === null) {
        const ourCompetitor = competitors.find((entry) => {
          if (!entry || typeof entry !== 'object') {
            return false
          }

          const competitorRecord = entry as Record<string, unknown>
          const teamRecord = competitorRecord.team as Record<string, unknown> | undefined
          const teamIdValue = teamRecord?.id
          const teamId = teamIdValue !== undefined && teamIdValue !== null ? String(teamIdValue) : null

          return teamId === TEAM_ID
        })

        if (ourCompetitor && typeof ourCompetitor === 'object') {
          const homeAway = trimStringOrNull(
            toStringOrNull((ourCompetitor as Record<string, unknown>).homeAway),
          )

          if (homeAway) {
            isHome = homeAway === 'home'
          }
        }
      }

      const venue = competitionRecord.venue as Record<string, unknown> | undefined
      venueName = venue ? trimStringOrNull(toStringOrNull(venue.fullName)) : null
      const venueAddress = venue?.address as Record<string, unknown> | undefined
      venueCity = venueAddress ? trimStringOrNull(toStringOrNull(venueAddress.city)) : null
      venueState = venueAddress ? trimStringOrNull(toStringOrNull(venueAddress.state)) : null
      venueCountry = venueAddress ? trimStringOrNull(toStringOrNull(venueAddress.country)) : null

      const broadcastRecords = Array.isArray(competitionRecord.broadcasts)
        ? competitionRecord.broadcasts
        : []
      for (const broadcast of broadcastRecords) {
        if (!broadcast || typeof broadcast !== 'object') {
          continue
        }

        const broadcastRecord = broadcast as Record<string, unknown>
        const media = broadcastRecord.media as Record<string, unknown> | undefined
        const mediaName =
          trimStringOrNull(toStringOrNull(media?.shortName)) ??
          trimStringOrNull(toStringOrNull(media?.name))

        if (mediaName && !broadcasts.includes(mediaName)) {
          broadcasts.push(mediaName)
        }
      }

      const ticketsRecords = Array.isArray(competitionRecord.tickets)
        ? competitionRecord.tickets
        : []
      const primaryTicket = ticketsRecords.find((ticket) => ticket && typeof ticket === 'object')

      if (primaryTicket && typeof primaryTicket === 'object') {
        const ticketRecord = primaryTicket as Record<string, unknown>
        ticketsSummary = trimStringOrNull(toStringOrNull(ticketRecord.summary))
        ticketsStartingPrice =
          toNumberOrNull(ticketRecord.startingPrice) ?? toNumberOrNull(ticketRecord.minPrice)
      }

      const status = competitionRecord.status as Record<string, unknown> | undefined
      if (status) {
        statusDetail =
          trimStringOrNull(toStringOrNull(status.detail)) ??
          trimStringOrNull(toStringOrNull(status.description))
        statusShortDetail =
          trimStringOrNull(toStringOrNull(status.shortDetail)) ??
          trimStringOrNull(toStringOrNull(status.type))

        const statusType = status.type
        if (statusType && typeof statusType === 'object') {
          const statusTypeRecord = statusType as Record<string, unknown>
          statusDetail =
            trimStringOrNull(toStringOrNull(statusTypeRecord.detail)) ?? statusDetail
          statusShortDetail =
            trimStringOrNull(toStringOrNull(statusTypeRecord.shortDetail)) ??
            trimStringOrNull(toStringOrNull(statusTypeRecord.description)) ??
            statusShortDetail
        }
      }
    }
  }

  return {
    id,
    name,
    shortName,
    date,
    opponent,
    opponentAbbreviation,
    opponentRank,
    isHome,
    venue: venueName,
    venueCity,
    venueState,
    venueCountry,
    seasonText,
    weekText,
    broadcasts,
    ticketsSummary,
    ticketsStartingPrice,
    statusDetail,
    statusShortDetail,
  }
}

const normalizeTeamMeta = (value: unknown): TeamMeta | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const result = createEmptyTeamMeta()

  result.rank = toNumberOrNull(record.rank)
  result.standingSummary = trimStringOrNull(toStringOrNull(record.standingSummary))
  result.displayName = trimStringOrNull(toStringOrNull(record.displayName))
  result.shortDisplayName = trimStringOrNull(toStringOrNull(record.shortDisplayName))
  result.location = trimStringOrNull(toStringOrNull(record.location))
  result.nickname = trimStringOrNull(toStringOrNull(record.nickname))
  result.abbreviation = trimStringOrNull(toStringOrNull(record.abbreviation))
  result.color = trimStringOrNull(toStringOrNull(record.color))
  result.alternateColor = trimStringOrNull(toStringOrNull(record.alternateColor))
  result.nextEvent = normalizeTeamNextEvent(record.nextEvent)

  return result
}

const parseTeamMeta = (payload: unknown): TeamMeta => {
  const result = createEmptyTeamMeta()

  if (!payload || typeof payload !== 'object') {
    return result
  }

  const team = (payload as Record<string, unknown>).team

  if (!team || typeof team !== 'object') {
    return result
  }

  const teamRecord = team as Record<string, unknown>

  result.rank = toNumberOrNull(teamRecord.rank)
  result.standingSummary = trimStringOrNull(toStringOrNull(teamRecord.standingSummary))
  result.displayName = trimStringOrNull(toStringOrNull(teamRecord.displayName))
  result.shortDisplayName = trimStringOrNull(toStringOrNull(teamRecord.shortDisplayName))
  result.location = trimStringOrNull(toStringOrNull(teamRecord.location))
  result.nickname = trimStringOrNull(toStringOrNull(teamRecord.nickname))
  result.abbreviation = trimStringOrNull(toStringOrNull(teamRecord.abbreviation))
  result.color = trimStringOrNull(toStringOrNull(teamRecord.color))
  result.alternateColor = trimStringOrNull(toStringOrNull(teamRecord.alternateColor))

  const nextEvent = Array.isArray(teamRecord.nextEvent) ? teamRecord.nextEvent[0] : null
  const parsedNextEvent = parseTeamNextEvent(nextEvent)
  if (parsedNextEvent) {
    result.nextEvent = parsedNextEvent
  }

  return result
}

const parseTeamRecord = (payload: unknown): ParsedTeamRecord => {
  const result: ParsedTeamRecord = { summary: null, stats: null }

  if (!payload || typeof payload !== 'object') {
    return result
  }

  const team = (payload as Record<string, unknown>).team

  if (!team || typeof team !== 'object') {
    return result
  }

  const teamSummary = (team as Record<string, unknown>).recordSummary

  if (typeof teamSummary === 'string' && teamSummary.trim()) {
    result.summary = teamSummary.trim()
  }

  const record = (team as Record<string, unknown>).record

  if (!record || typeof record !== 'object') {
    return result
  }

  const items = (record as Record<string, unknown>).items

  if (!Array.isArray(items)) {
    return result
  }

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const recordItem = item as Record<string, unknown>
    const type = typeof recordItem.type === 'string' ? recordItem.type : ''
    const description = typeof recordItem.description === 'string' ? recordItem.description : ''

    if (type !== 'total' && description !== 'Overall Record') {
      continue
    }

    const summary = recordItem.summary

    if (typeof summary === 'string' && summary.trim()) {
      result.summary = summary.trim()
    }

    const stats = extractRecordStatsFromPayload(recordItem.stats)

    if (stats) {
      result.stats = stats
    }

    break
  }

  return result
}

type CachedRoster = {
  players: Player[]
  updatedAt: number
  recordSummary: string | null
  recordStats: TeamRecordStats | null
  teamMeta: TeamMeta | null
}

function App() {
  const [players, setPlayers] = useState<Player[]>([])
  const [recordSummary, setRecordSummary] = useState<string | null>(null)
  const [recordStats, setRecordStats] = useState<TeamRecordStats | null>(null)
  const [teamMeta, setTeamMeta] = useState<TeamMeta | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
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

  const computedRecordSummary = useMemo(() => {
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
  }, [recordSummary, recordStats])

  const recordHighlights = useMemo(() => {
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
  }, [recordStats])

  const upcomingEvent = useMemo(() => {
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

    const homeAwayDescriptor =
      event.isHome === null ? null : event.isHome ? 'Home matchup' : 'Road matchup'

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
  }, [teamMeta])


  const teamRankValue = teamMeta?.rank ?? null
  const teamShortDisplay = teamMeta?.shortDisplayName ?? null
  const teamLocation = teamMeta?.location ?? null

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
    let cachedTeamMeta: TeamMeta | null = null

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
        const summaryCandidate =
          typeof parsed.recordSummary === 'string' ? parsed.recordSummary.trim() : ''
        const cachedSummary = summaryCandidate ? summaryCandidate : null
        const cachedStats = normalizeRecordStats(parsed.recordStats)
        cachedTeamMeta = normalizeTeamMeta(parsed.teamMeta)

        setRecordSummary(cachedSummary)
        setRecordStats(cachedStats)
        setTeamMeta(cachedTeamMeta)
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
        const parsedRecord = parseTeamRecord(payload)
        const parsedTeamMeta = parseTeamMeta(payload)
        const rawAthletes = (payload?.team?.athletes ?? []) as unknown[]

        const mapped: Player[] = rawAthletes
          .map((athlete) => {
            if (!athlete || typeof athlete !== 'object') {
              return null
            }

            const record = athlete as Record<string, unknown>

            const idValue = record.id
            const id = idValue !== undefined && idValue !== null ? String(idValue).trim() : ''

            const displayName =
              trimStringOrNull(toStringOrNull(record.displayName)) ??
              trimStringOrNull(toStringOrNull(record.fullName)) ??
              ''

            if (!id || !displayName) {
              return null
            }

            const firstName = trimStringOrNull(toStringOrNull(record.firstName))
            const lastName = trimStringOrNull(toStringOrNull(record.lastName))
            const fullName = trimStringOrNull(toStringOrNull(record.fullName))
            const shortName = trimStringOrNull(toStringOrNull(record.shortName))
            const uid = trimStringOrNull(toStringOrNull(record.uid))
            const guid = trimStringOrNull(toStringOrNull(record.guid))
            const slug = trimStringOrNull(toStringOrNull(record.slug))
            const type = trimStringOrNull(toStringOrNull(record.type))

            const jersey = trimStringOrNull(toStringOrNull(record.jersey)) ?? '—'

            const positionRecord = record.position as Record<string, unknown> | undefined
            const positionDisplay =
              trimStringOrNull(toStringOrNull(positionRecord?.displayName)) ??
              trimStringOrNull(toStringOrNull(positionRecord?.abbreviation)) ??
              '—'
            const positionAbbreviation = trimStringOrNull(toStringOrNull(positionRecord?.abbreviation))
            const positionName =
              trimStringOrNull(toStringOrNull(positionRecord?.name)) ?? positionDisplay
            const positionId = toTrimmedString(positionRecord?.id)

            const experienceRecord = record.experience as Record<string, unknown> | undefined
            const experience =
              trimStringOrNull(toStringOrNull(experienceRecord?.displayValue)) ?? '—'
            const experienceAbbreviation = trimStringOrNull(
              toStringOrNull(experienceRecord?.abbreviation),
            )
            const experienceYears = toNumberOrNull(experienceRecord?.years)

            const height = trimStringOrNull(toStringOrNull(record.displayHeight)) ?? '—'
            const weight = trimStringOrNull(toStringOrNull(record.displayWeight)) ?? '—'

            const birthPlace = record.birthPlace as Record<string, unknown> | undefined
            const birthCity = trimStringOrNull(toStringOrNull(birthPlace?.city))
            const birthState = trimStringOrNull(toStringOrNull(birthPlace?.state))
            const birthCountryName = trimStringOrNull(toStringOrNull(birthPlace?.country))

            const birthCountryRecord = record.birthCountry as Record<string, unknown> | undefined
            const birthCountryAbbreviation = trimStringOrNull(
              toStringOrNull(birthCountryRecord?.abbreviation),
            )
            const birthCountry =
              birthCountryName ??
              trimStringOrNull(toStringOrNull(birthCountryRecord?.name)) ??
              birthCountryAbbreviation

            const hometownParts = [birthCity, birthState || birthCountry].filter(Boolean)
            const hometown = hometownParts.join(', ') || '—'

            const flagRecord = record.flag as Record<string, unknown> | undefined
            const flagUrl = trimStringOrNull(toStringOrNull(flagRecord?.href))
            const flagAlt = trimStringOrNull(toStringOrNull(flagRecord?.alt))

            const statusRecord = record.status as Record<string, unknown> | undefined
            const status =
              trimStringOrNull(toStringOrNull(statusRecord?.name)) ??
              trimStringOrNull(toStringOrNull(statusRecord?.type)) ??
              '—'
            const statusType = trimStringOrNull(toStringOrNull(statusRecord?.type))
            const statusAbbreviation = trimStringOrNull(
              toStringOrNull(statusRecord?.abbreviation),
            )

            const isActive =
              typeof record.active === 'boolean'
                ? record.active
                : statusType?.toLowerCase() === 'active'

            const injuries = normalizePlayerInjuries(record.injuries)

            return {
              id,
              uid,
              guid,
              displayName,
              fullName,
              firstName,
              lastName,
              shortName,
              jersey,
              position: positionDisplay,
              positionAbbreviation,
              positionName,
              positionId,
              experience,
              experienceAbbreviation,
              experienceYears,
              height,
              weight,
              hometown,
              birthCity,
              birthState,
              birthCountry,
              birthCountryAbbreviation,
              flagUrl,
              flagAlt,
              status,
              statusType,
              statusAbbreviation,
              isActive,
              slug,
              type,
              injuries,
            } as Player
          })
          .filter((player): player is Player => player !== null)

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

        setRecordSummary(parsedRecord.summary)
        setRecordStats(parsedRecord.stats)
        setTeamMeta(parsedTeamMeta)
        setPlayers(sorted)
        setLastUpdated(timestamp)

        if (typeof window !== 'undefined') {
          try {
            const payloadToStore: CachedRoster = {
              players: sorted,
              updatedAt: timestamp,
              recordSummary: parsedRecord.summary,
              recordStats: parsedRecord.stats,
              teamMeta: parsedTeamMeta,
            }
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
          setRecordSummary(null)
          setRecordStats(null)
          setTeamMeta(null)
          setLastUpdated(null)
        } else {
          setNotice('Showing the last saved roster. Live data is currently unavailable.')

          if (cachedTimestamp) {
            setLastUpdated(cachedTimestamp)
          } else {
            setLastUpdated(null)
          }

          if (cachedTeamMeta) {
            setTeamMeta(cachedTeamMeta)
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

  const openPlayerModal = (playerId: string) => {
    setSelectedPlayerId(playerId)
  }

  const closePlayerModal = () => {
    setSelectedPlayerId(null)
  }

  const PlayerInfoModal = ({
    player,
    onClose,
  }: {
    player: Player | null
    onClose: () => void
  }) => {
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
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10"
        >
          <header className="flex items-start justify-between border-b border-slate-100 p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Player Info</p>
              <h2 className="text-2xl font-semibold text-slate-900">{player.displayName}</h2>
              <p className="text-sm text-slate-500">
                #{player.jersey} · {player.position} · {player.experience}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-hoosier-red hover:text-hoosier-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hoosier-red"
              aria-label="Close player info"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z"
                />
              </svg>
            </button>
          </header>
          <div className="max-h-[70vh] overflow-y-auto p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              {vitals.map((item) => (
                <div key={item.label} className="space-y-1">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </dt>
                  <dd className="text-sm text-slate-700">{item.value}</dd>
                </div>
              ))}
            </dl>

            {player.flagUrl && (
              <div className="mt-6 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Country Flag
                </span>
                <img
                  src={player.flagUrl}
                  alt={player.flagAlt ?? 'Country flag'}
                  className="h-6 w-10 rounded object-cover ring-1 ring-slate-200"
                  loading="lazy"
                />
              </div>
            )}

            {identifiers.length > 0 && (
              <div className="mt-6">
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
              <div className="mt-6">
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
        <div className="flex-1 space-y-4">
          <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-hoosier-red" aria-hidden="true" />
            Hoosiers Football
          </p>
          <h1 className="text-3xl font-semibold text-hoosier-red sm:text-4xl">
            Indiana Football Roster
          </h1>
          <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
            Search the full Indiana University roster, powered by live data from ESPN. Find players by
            name, number, position, class, or hometown in seconds.
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
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                        Current Record
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">{computedRecordSummary}</p>
                    </div>
                  )}
                  {recordHighlights.length > 0 && (
                    <dl
                      className={`grid grid-cols-2 gap-3 text-sm text-slate-600 ${
                        computedRecordSummary ? 'mt-4' : ''
                      }`}
                    >
                      {recordHighlights.map((item) => (
                        <div key={item.label}>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {item.label}
                          </dt>
                          <dd className="mt-1 text-base font-semibold text-slate-900">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}

              {(teamRankValue !== null || teamMeta?.standingSummary) && (
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm supports-[backdrop-filter]:bg-white/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Team Status
                  </p>
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
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Next Game
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {upcomingEvent.opponent}
                  </p>
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
                    {upcomingEvent.statusText && (
                      <p className="text-slate-500">{upcomingEvent.statusText}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
              <div
                className="animate-fade-in-up max-h-[65vh] overflow-auto rounded-2xl border border-slate-200"
                style={{ animationDelay: '220ms' }}
              >
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
                        <td
                          colSpan={7}
                          className="px-6 py-10 text-center text-base font-medium text-slate-500"
                        >
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
                          <td className="whitespace-nowrap px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openPlayerModal(player.id)}
                              className="text-left font-medium text-slate-800 underline-offset-2 transition hover:text-hoosier-red hover:underline focus-visible:text-hoosier-red focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hoosier-red"
                            >
                              {player.displayName}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {player.position}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {player.experience}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {player.height}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {player.weight}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {player.hometown}
                          </td>
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
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={() => openPlayerModal(player.id)}
                        className="w-full text-left text-slate-900 underline-offset-2 transition hover:text-hoosier-red hover:underline focus-visible:text-hoosier-red focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hoosier-red"
                      >
                        {player.displayName}
                      </button>
                    </h2>
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

      <PlayerInfoModal player={selectedPlayer} onClose={closePlayerModal} />
    </main>
  )
}

export default App
