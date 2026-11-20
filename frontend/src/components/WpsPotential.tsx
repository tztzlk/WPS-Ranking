import { TrendingUp } from 'lucide-react';
import { WpsPotentialItem } from '../types';

/** "top 0.01%" style label for a rank / field-size ratio. */
export function topShareLabel(share: number): string {
  const pct = share * 100;
  if (pct < 0.01) return 'top 0.01%';
  if (pct < 1) return `top ${pct.toFixed(2)}%`;
  if (pct < 10) return `top ${pct.toFixed(1)}%`;
  return `top ${Math.round(pct)}%`;
}

export function SingleTag() {
  return (
    <span
      className="ml-2 rounded bg-gray-700 px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-gray-300"
      title="Scored by the WCA ranking by single"
    >
      single
    </span>
  );
}

/**
 * Events where the cuber gains the most WPS by reaching their own typical
 * level (median rank / field size over the events they compete in).
 */
export function WpsPotential({
  name,
  typicalShare,
  items,
}: {
  name: string;
  typicalShare: number;
  items: WpsPotentialItem[];
}) {
  if (items.length === 0) return null;
  const maxGain = Math.max(...items.map((i) => i.gain));

  return (
    <section className="card">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
        <TrendingUp className="h-5 w-5 text-green-400" aria-hidden="true" />
        Where WPS can grow the most
      </h2>
      <p className="mb-4 text-sm text-gray-400">
        {name}&apos;s median result across their events is in the {topShareLabel(typicalShare)} of the field. Below is
        how much WPS each event adds at that level.
      </p>
      <div className="text-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-gray-700 pb-2 text-xs font-medium uppercase tracking-wide text-gray-500 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem]">
          <span>Event</span>
          <span className="hidden text-right sm:block">Now</span>
          <span className="hidden text-right sm:block">Target</span>
          <span className="text-right">Gain</span>
        </div>
        {items.map((item) => (
          <div
            key={item.eventId}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-700/50 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem]"
          >
            <span className="min-w-0">
              <span className="text-white">{item.eventName}</span>
              {item.rankType === 'single' && <SingleTag />}
              <span className="block text-xs text-gray-500 sm:hidden">
                {item.worldRank ? `#${item.worldRank.toLocaleString('en-US')}` : 'No result'} to #
                {item.targetRank.toLocaleString('en-US')}
              </span>
            </span>
            <span className="hidden text-right tabular-nums text-gray-400 sm:block">
              {item.worldRank ? `#${item.worldRank.toLocaleString('en-US')}` : 'No result'}
            </span>
            <span className="hidden text-right tabular-nums text-gray-300 sm:block">
              #{item.targetRank.toLocaleString('en-US')}
            </span>
            <span className="flex items-center justify-end gap-3">
              <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-gray-700 sm:block" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-green-500"
                  style={{ width: `${(item.gain / maxGain) * 100}%` }}
                />
              </span>
              <span className="font-semibold tabular-nums text-green-400">+{item.gain.toFixed(2)}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Target is the world rank at the {topShareLabel(typicalShare)} of the event&apos;s ranking. Gains are in WPS
        points.
      </p>
    </section>
  );
}
