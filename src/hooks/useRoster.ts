import { useEffect, useState } from 'react'
import { ROSTER_ENDPOINT, ROSTER_STORAGE_KEY } from '../lib/roster/constants'
import {
  isValidPlayerRecord,
  normalizeRecordStats,
  normalizeTeamMeta,
  parseRosterPayload,
} from '../lib/roster/data'
import type { CachedRoster, Player, TeamMeta, TeamRecordStats } from '../types/roster'

export type UseRosterResult = {
  players: Player[]
  recordSummary: string | null
  recordStats: TeamRecordStats | null
  teamMeta: TeamMeta | null
  loading: boolean
  error: string | null
  notice: string | null
  lastUpdated: number | null
}

export const useRoster = (): UseRosterResult => {
  const [players, setPlayers] = useState<Player[]>([])
  const [recordSummary, setRecordSummary] = useState<string | null>(null)
  const [recordStats, setRecordStats] = useState<TeamRecordStats | null>(null)
  const [teamMeta, setTeamMeta] = useState<TeamMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

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

        if (cancelled) {
          return
        }

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

    const loadRoster = async () => {
      try {
        if (cancelled) {
          return
        }

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
        const { players: parsedPlayers, teamRecord, teamMeta: parsedTeamMeta } = parseRosterPayload(payload)

        if (cancelled) {
          return
        }

        cachedPlayers = parsedPlayers
        const timestamp = Date.now()
        cachedTimestamp = timestamp

        setRecordSummary(teamRecord.summary)
        setRecordStats(teamRecord.stats)
        setTeamMeta(parsedTeamMeta)
        setPlayers(parsedPlayers)
        setLastUpdated(timestamp)
        setLoading(false)

        if (typeof window !== 'undefined') {
          try {
            const payloadToStore: CachedRoster = {
              players: parsedPlayers,
              updatedAt: timestamp,
              recordSummary: teamRecord.summary,
              recordStats: teamRecord.stats,
              teamMeta: parsedTeamMeta,
            }
            window.localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(payloadToStore))
          } catch (storageError) {
            console.error('Unable to cache roster', storageError)
          }
        }
      } catch (err) {
        if (cancelled) {
          return
        }

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
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    hydrateFromCache()
    loadRoster()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return {
    players,
    recordSummary,
    recordStats,
    teamMeta,
    loading,
    error,
    notice,
    lastUpdated,
  }
}
