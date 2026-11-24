import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { ProfileHistoryItem } from '../types';
import { useFormat } from '../i18n/format';

interface WpsProgressChartProps {
  data: ProfileHistoryItem[];
  loadError?: boolean;
}

type ChartMode = 'wps' | 'rank';
type RangeMode = '7d' | '30d' | '90d' | 'all';

const RANGE_OPTIONS: Array<{ value: RangeMode; days: number | null }> = [
  { value: '7d', days: 7 },
  { value: '30d', days: 30 },
  { value: '90d', days: 90 },
  { value: 'all', days: null },
];

function getWpsDomain(data: ProfileHistoryItem[]): [number, number] {
  const values = data
    .map((item) => item.wps)
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return [0, 1];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const padding = Math.max(range * 0.2, 0.15);

  const domainMin = Math.max(0, Math.floor((min - padding) * 10) / 10);
  const domainMax = Math.ceil((max + padding) * 10) / 10;

  if (domainMax <= domainMin) {
    return [Math.max(0, domainMin - 0.2), domainMin + 0.2];
  }

  return [domainMin, domainMax];
}

function filterHistoryByRange(data: ProfileHistoryItem[], range: RangeMode): ProfileHistoryItem[] {
  const selectedRange = RANGE_OPTIONS.find((option) => option.value === range);
  if (!selectedRange || selectedRange.days == null || data.length === 0) {
    return data;
  }

  const latestDate = new Date(`${data[data.length - 1].date}T00:00:00Z`);
  const cutoffDate = new Date(latestDate);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - (selectedRange.days - 1));

  return data.filter((item) => new Date(`${item.date}T00:00:00Z`) >= cutoffDate);
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  activeClassName,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (nextValue: T) => void;
  activeClassName: string;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-600">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            value === option.value
              ? activeClassName
              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600 hover:text-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function WpsProgressChart({ data, loadError }: WpsProgressChartProps) {
  const { t } = useTranslation('profile');
  const fmt = useFormat();
  const [mode, setMode] = useState<ChartMode>('wps');
  // History dates are calendar days (YYYY-MM-DD): format them in UTC so no time zone shifts the day.
  const formatDate = (dateStr: string) => fmt.date(`${dateStr}T00:00:00Z`);
  const formatShortDate = (dateStr: string) =>
    new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(fmt.locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const [range, setRange] = useState<RangeMode>('30d');

  const filteredData = filterHistoryByRange(data, range);
  const yKey = mode === 'wps' ? 'wps' : 'globalRank';
  const yAxisReversed = mode === 'rank';
  const wpsDomain = getWpsDomain(filteredData);

  if (loadError) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-6 py-8 text-center text-gray-400">
        {t('chart.loadError')}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-6 py-8 text-center text-gray-400">
        {t('chart.empty')}
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-6 py-8 text-center text-gray-400">
        {t('chart.needTwoDays')}
      </div>
    );
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup
        options={RANGE_OPTIONS.map((option) => ({ value: option.value, label: t(`chart.range.${option.value}`) }))}
        value={range}
        onChange={setRange}
        activeClassName="bg-gray-200 text-gray-900"
      />
      <ToggleGroup
        options={[
          { value: 'wps', label: t('chart.wps') },
          { value: 'rank', label: t('chart.rank') },
        ]}
        value={mode}
        onChange={setMode}
        activeClassName="bg-green-700 text-white"
      />
    </div>
  );

  if (filteredData.length < 2) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50">
        <div className="flex flex-col gap-4 border-b border-gray-700 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-lg font-semibold text-white">{t('chart.title')}</h3>
          {controls}
        </div>
        <div className="px-6 py-8 text-center text-gray-400">
          {t('chart.notEnough')}
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ProfileHistoryItem }[] }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;

    return (
      <div className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm shadow-lg">
        <div className="text-gray-300">{formatDate(point.date)}</div>
        <div className="mt-1 text-white">{t('chart.tooltipWps', { value: fmt.num(point.wps) })}</div>
        <div className="text-gray-400">{t('chart.tooltipWorld', { value: `#${fmt.int(point.globalRank)}` })}</div>
        <div className="text-gray-400">
          {t('chart.tooltipCountry', { value: point.countryRank != null ? `#${fmt.int(point.countryRank)}` : '—' })}
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50">
      <div className="flex flex-col gap-4 border-b border-gray-700 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-lg font-semibold text-white">{t('chart.title')}</h3>
        {controls}
      </div>
      <div className="h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={(value: string) => formatShortDate(value)}
              stroke="#4b5563"
            />
            <YAxis
              dataKey={yKey}
              domain={mode === 'wps' ? wpsDomain : ['auto', 'auto']}
              reversed={yAxisReversed}
              allowDataOverflow={mode === 'wps'}
              tickCount={mode === 'wps' ? 6 : undefined}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={
                mode === 'wps'
                  ? // A narrow range (e.g. 63.2–63.6 in 6 ticks) needs 2 decimals, or ticks repeat.
                    (value: number) => fmt.num(value, wpsDomain[1] - wpsDomain[0] < 1 ? 2 : 1)
                  : (value: number) => `#${fmt.int(Number(value))}`
              }
              stroke="#4b5563"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
