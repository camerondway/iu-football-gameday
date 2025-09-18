import type { CSSProperties } from 'react'
import type { Player, SortConfig, SortKey } from '../types/roster'

type Column = {
  key: SortKey
  label: string
}

type RosterTableProps = {
  players: Player[]
  sortConfig: SortConfig
  onSort: (key: SortKey) => void
  onSelect: (playerId: string) => void
  makeRowStyle?: (index: number) => CSSProperties
  columns?: Column[]
}

const defaultColumns: Column[] = [
  { key: 'jersey', label: '#' },
  { key: 'displayName', label: 'Name' },
  { key: 'position', label: 'Pos' },
  { key: 'experience', label: 'Class' },
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'hometown', label: 'Hometown' },
]

const RosterTable = ({ players, sortConfig, onSort, onSelect, makeRowStyle, columns = defaultColumns }: RosterTableProps) => (
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
              <th key={column.key} scope="col" className="sticky top-0 z-10 px-4 py-3" aria-sort={ariaSort}>
                <button
                  type="button"
                  onClick={() => onSort(column.key)}
                  aria-label={
                    isActive
                      ? `Sort by ${column.label}, ${sortConfig.direction === 'asc' ? 'ascending' : 'descending'}`
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
      <tbody>
        {players.map((player, index) => (
          <tr
            key={player.id}
            className="animate-fade-in-up odd:bg-white even:bg-slate-50/60 transition hover:bg-hoosier-red/5"
            style={makeRowStyle ? makeRowStyle(index) : undefined}
          >
            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{player.jersey}</td>
            <td className="whitespace-nowrap px-4 py-3">
              <button
                type="button"
                onClick={() => onSelect(player.id)}
                className="text-left font-medium text-slate-800 underline-offset-2 transition hover:text-hoosier-red hover:underline focus-visible:text-hoosier-red focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hoosier-red"
              >
                {player.displayName}
              </button>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{player.position}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{player.experience}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{player.height}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{player.weight}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{player.hometown}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default RosterTable
