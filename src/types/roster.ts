export type PlayerInjury = {
  id: string | null
  type: string | null
  status: string | null
  description: string | null
  date: string | null
}

export type Player = {
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

export type TeamRecordStats = {
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

export type ParsedTeamRecord = {
  summary: string | null
  stats: TeamRecordStats | null
}

export type TeamNextEvent = {
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

export type TeamMeta = {
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

export type SortKey = 'jersey' | 'displayName' | 'position' | 'experience' | 'height' | 'weight' | 'hometown'
export type SortDirection = 'asc' | 'desc'

export type SortConfig = {
  key: SortKey
  direction: SortDirection
}

export type CachedRoster = {
  players: Player[]
  updatedAt: number
  recordSummary: string | null
  recordStats: TeamRecordStats | null
  teamMeta: TeamMeta | null
}
