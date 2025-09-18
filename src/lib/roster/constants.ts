import type { SortConfig } from '../../types/roster'

export const TEAM_ID = '84'
export const ROSTER_STORAGE_KEY = 'iu-football-roster-cache'
export const ROSTER_ENDPOINT = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${TEAM_ID}?enable=roster`

export const DEFAULT_SORT: SortConfig = { key: 'jersey', direction: 'asc' }
