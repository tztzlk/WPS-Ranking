import { EVENT_NAMES, WpsBreakdownResponse } from '../types';
import { SingleTag } from './WpsPotential';

interface Side {
  name: string;
  breakdown: WpsBreakdownResponse;
}

function firstName(name: string): string {
  return name.replace(/\(.*?\)/g, '').trim().split(/\s+/)[0] ?? name;
}

/**
 * Per-event WPS contribution of two cubers as mirrored bars: the first cuber
 * grows to the left, the second to the right, so the longer bar in each row
 * shows who gains more WPS from that event.
 */
export function CompareEvents({ left, right }: { left: Side; right: Side }) {
  const byEvent = (b: WpsBreakdownResponse) => new Map(b.events.map((e) => [e.eventId, e]));
  const l = byEvent(left.breakdown);
  const r = byEvent(right.breakdown);
  const rows = [...new Set([...l.keys(), ...r.keys()])]
    .map((eventId) => {
      const le = l.get(eventId);
      const re = r.get(eventId);
      return {
        eventId,
        name: le?.eventName ?? re?.eventName ?? EVENT_NAMES[eventId] ?? eventId,
        single: (le ?? re)?.rankType === 'single',
        left: le?.eventScore ?? 0,
        right: re?.eventScore ?? 0,
        leftRank: le?.worldRank ?? null,
        rightRank: re?.worldRank ?? null,
      };
    })
    .sort((a, b) => Math.max(b.left, b.right) - Math.max(a.left, a.right));
  const max = Math.max(0.01, ...rows.map((row) => Math.max(row.left, row.right)));
  const leftWins = rows.filter((row) => row.left > row.right).length;
  const rightWins = rows.filter((row) => row.right > row.left).length;
  const leftLabel = firstName(left.name);
  const rightLabel = firstName(right.name) === leftLabel ? right.name : firstName(right.name);

  const rank = (n: number | null) => (n ? `#${n.toLocaleString('en-US')}` : 'No result');
  const bar = (value: number, winner: boolean, side: 'left' | 'right') => (
    <div className={`flex h-2.5 overflow-hidden rounded-full bg-gray-700/60 ${side === 'left' ? 'justify-end' : ''}`}>
      <div
        className={`h-full rounded-full ${winner ? 'bg-green-500' : 'bg-gray-400'}`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  );

  return (
    <section className="card">
      <h2 className="mb-1 text-lg font-semibold text-white">WPS by event</h2>
      <p className="mb-4 text-sm text-gray-400">
        Each bar is the WPS an event adds. {left.name} gains more in {leftWins} event{leftWins === 1 ? '' : 's'},{' '}
        {right.name} in {rightWins}.
      </p>

      <div className="mb-2 grid grid-cols-2 gap-4 text-xs font-medium uppercase tracking-wide text-gray-500">
        <span className="truncate">{leftLabel}</span>
        <span className="truncate text-right">{rightLabel}</span>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.eventId}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span
                className={`w-16 shrink-0 tabular-nums ${row.left > row.right ? 'font-semibold text-green-400' : 'text-gray-400'}`}
              >
                {row.left.toFixed(2)}
              </span>
              <span className="min-w-0 truncate text-center text-white">
                {row.name}
                {row.single && (
                  <span className="hidden sm:inline">
                    <SingleTag />
                  </span>
                )}
              </span>
              <span
                className={`w-16 shrink-0 text-right tabular-nums ${row.right > row.left ? 'font-semibold text-green-400' : 'text-gray-400'}`}
              >
                {row.right.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {bar(row.left, row.left > row.right, 'left')}
              {bar(row.right, row.right > row.left, 'right')}
            </div>
            <div className="mt-0.5 flex justify-between text-[11px] tabular-nums text-gray-500">
              <span>{rank(row.leftRank)}</span>
              <span>{rank(row.rightRank)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-baseline justify-between border-t border-gray-700 pt-3 text-sm">
        <span className="font-semibold tabular-nums text-white">{left.breakdown.wps.toFixed(2)}</span>
        <span className="text-gray-400">Total WPS</span>
        <span className="font-semibold tabular-nums text-white">{right.breakdown.wps.toFixed(2)}</span>
      </div>
    </section>
  );
}
