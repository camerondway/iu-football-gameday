import type { CSSProperties } from 'react'
import type { Player } from '../types/roster'

type RosterCardsProps = {
  players: Player[]
  onSelect: (playerId: string) => void
  makeCardStyle?: (index: number) => CSSProperties
  emptyMessage?: string
}

const RosterCards = ({ players, onSelect, makeCardStyle, emptyMessage = 'No players match that search.' }: RosterCardsProps) => {
  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-base font-medium text-slate-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {players.map((player, index) => (
        <article
          key={player.id}
          className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
          style={makeCardStyle ? makeCardStyle(index) : undefined}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-semibold text-hoosier-red">#{player.jersey}</span>
            <span className="text-sm font-medium uppercase tracking-wide text-slate-500">{player.position}</span>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            <button
              type="button"
              onClick={() => onSelect(player.id)}
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
      ))}
    </div>
  )
}

export default RosterCards
