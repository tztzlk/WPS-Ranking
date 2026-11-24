import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { WpsPotentialItem } from '../types';
import { useFormat, Format } from '../i18n/format';

/** "top 0.01%" style label for a rank / field-size ratio. */
function topShareLabel(share: number, t: TFunction<'profile'>, fmt: Format): string {
  const pct = share * 100;
  if (pct < 0.01) return t('top', { pct: fmt.num(0.01, 2) });
  if (pct < 1) return t('top', { pct: fmt.num(pct, 2) });
  if (pct < 10) return t('top', { pct: fmt.num(pct, 1) });
  return t('top', { pct: fmt.int(Math.round(pct)) });
}

/** "single" badge; used on the profile, compare and about pages, so its texts are not page-specific. */
export function SingleTag() {
  const { t } = useTranslation(['common', 'profile']);
  return (
    <span
      className="ml-2 rounded bg-gray-700 px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-gray-300"
      title={t('profile:singleTagTitle')}
    >
      {t('rankType.single')}
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
  const { t } = useTranslation('profile');
  const fmt = useFormat();
  if (items.length === 0) return null;
  const top = topShareLabel(typicalShare, t, fmt);
  const rankOrNone = (rank: number | null) => (rank ? `#${fmt.int(rank)}` : t('potential.noResult'));
  const maxGain = Math.max(...items.map((i) => i.gain));

  return (
    <section className="card">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
        <TrendingUp className="h-5 w-5 text-green-400" aria-hidden="true" />
        {t('potential.title')}
      </h2>
      <p className="mb-4 text-sm text-gray-400">
        {t('potential.intro', { name, top })}
      </p>
      <div className="text-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-gray-700 pb-2 text-xs font-medium uppercase tracking-wide text-gray-400 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem]">
          <span>{t('potential.event')}</span>
          <span className="hidden text-right sm:block">{t('potential.now')}</span>
          <span className="hidden text-right sm:block">{t('potential.target')}</span>
          <span className="text-right">{t('potential.gain')}</span>
        </div>
        {items.map((item) => (
          <div
            key={item.eventId}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-700/50 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem]"
          >
            <span className="min-w-0">
              <span className="text-white">{fmt.event(item.eventId, item.eventName)}</span>
              {item.rankType === 'single' && <SingleTag />}
              <span className="block text-xs text-gray-400 sm:hidden">
                {t('potential.fromTo', { from: rankOrNone(item.worldRank), to: `#${fmt.int(item.targetRank)}` })}
              </span>
            </span>
            <span className="hidden text-right tabular-nums text-gray-400 sm:block">
              {rankOrNone(item.worldRank)}
            </span>
            <span className="hidden text-right tabular-nums text-gray-300 sm:block">
              #{fmt.int(item.targetRank)}
            </span>
            <span className="flex items-center justify-end gap-3">
              <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-gray-700 sm:block" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-green-500"
                  style={{ width: `${(item.gain / maxGain) * 100}%` }}
                />
              </span>
              <span className="font-semibold tabular-nums text-green-400">+{fmt.num(item.gain)}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        {t('potential.note', { top })}
      </p>
    </section>
  );
}
