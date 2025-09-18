import { TEAM_ID } from './constants'
import type {
  ParsedTeamRecord,
  Player,
  PlayerInjury,
  SortConfig,
  TeamMeta,
  TeamNextEvent,
  TeamRecordStats,
} from '../../types/roster'

export const parseWeight = (weight: string): number | null => {
  const match = weight.match(/\d+/)
  return match ? Number.parseInt(match[0] ?? '', 10) : null
}

export const parseHeight = (height: string): number | null => {
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

export const comparePlayers = (a: Player, b: Player, config: SortConfig): number => {
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

  const baseComparison = (a[key] as string).localeCompare(b[key] as string, undefined, {
    sensitivity: 'base',
  })

  if (baseComparison !== 0) {
    return baseComparison * modifier
  }

  return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) * modifier
}

export const isValidPlayerRecord = (value: unknown): value is Player => {
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

export const toNumberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export const toStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' ? value : null

export const trimStringOrNull = (value: string | null): string | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export const toTrimmedString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return trimStringOrNull(value)
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

export const normalizeRecordStats = (value: unknown): TeamRecordStats | null => {
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

export const normalizePlayerInjuries = (value: unknown): PlayerInjury[] => {
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

const parseTeamNextEvent = (record: unknown): TeamNextEvent | null => {
  if (!record || typeof record !== 'object') {
    return null
  }

  const source = record as Record<string, unknown>
  const id = toTrimmedString(source.id)

  if (!id) {
    return null
  }

  const competitions = Array.isArray(source.competitions) ? source.competitions : []

  let opponent: string | null = null
  let opponentAbbreviation: string | null = null
  let opponentRank: number | null = null
  let isHome: boolean | null = null
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

  const season = source.season as Record<string, unknown> | undefined
  const week = source.week as Record<string, unknown> | undefined

  return {
    id,
    name: trimStringOrNull(toStringOrNull(source.name)),
    shortName: trimStringOrNull(toStringOrNull(source.shortName)),
    date: trimStringOrNull(toStringOrNull(source.date)),
    opponent,
    opponentAbbreviation,
    opponentRank,
    isHome,
    venue: venueName,
    venueCity,
    venueState,
    venueCountry,
    seasonText:
      trimStringOrNull(toStringOrNull(season?.displayName)) ??
      trimStringOrNull(toStringOrNull(source.seasonType)),
    weekText: trimStringOrNull(toStringOrNull(week?.text)),
    broadcasts,
    ticketsSummary,
    ticketsStartingPrice,
    statusDetail,
    statusShortDetail,
  }
}

export const normalizeTeamMeta = (value: unknown): TeamMeta | null => {
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

export const parseTeamMeta = (payload: unknown): TeamMeta => {
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

export const parseTeamRecord = (payload: unknown): ParsedTeamRecord => {
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

export const mapPlayersFromPayload = (payload: unknown): Player[] => {
  const athletes = (payload as { team?: { athletes?: unknown[] } })?.team?.athletes ?? []

  return (Array.isArray(athletes) ? athletes : [])
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
      const experienceAbbreviation = trimStringOrNull(toStringOrNull(experienceRecord?.abbreviation))
      const experienceYears = toNumberOrNull(experienceRecord?.years)

      const height = trimStringOrNull(toStringOrNull(record.displayHeight)) ?? '—'
      const weight = trimStringOrNull(toStringOrNull(record.displayWeight)) ?? '—'

      const birthPlace = record.birthPlace as Record<string, unknown> | undefined
      const birthCity = trimStringOrNull(toStringOrNull(birthPlace?.city))
      const birthState = trimStringOrNull(toStringOrNull(birthPlace?.state))
      const birthCountryName = trimStringOrNull(toStringOrNull(birthPlace?.country))

      const birthCountryRecord = record.birthCountry as Record<string, unknown> | undefined
      const birthCountryAbbreviation = trimStringOrNull(toStringOrNull(birthCountryRecord?.abbreviation))
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
      const statusAbbreviation = trimStringOrNull(toStringOrNull(statusRecord?.abbreviation))

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
}

export const sortPlayersByJersey = (players: Player[]): Player[] =>
  [...players].sort((a, b) => {
    const aNumber = Number.parseInt(a.jersey, 10)
    const bNumber = Number.parseInt(b.jersey, 10)

    if (Number.isNaN(aNumber) && Number.isNaN(bNumber)) {
      return a.displayName.localeCompare(b.displayName)
    }

    if (Number.isNaN(aNumber)) return 1
    if (Number.isNaN(bNumber)) return -1
    return aNumber - bNumber
  })

export const parseRosterPayload = (payload: unknown) => {
  const teamRecord = parseTeamRecord(payload)
  const teamMeta = parseTeamMeta(payload)
  const players = sortPlayersByJersey(mapPlayersFromPayload(payload))

  return { players, teamRecord, teamMeta }
}
