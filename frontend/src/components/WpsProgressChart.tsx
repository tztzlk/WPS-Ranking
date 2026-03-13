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
import type { ProfileHistoryItem } from '../types';

interface WpsProgressChartProps {
  data: ProfileHistoryItem[];
  loadError?: boolean;
}

type ChartMode = 'wps' | 'rank';
type RangeMode = '7d' | '30d' | '90d' | 'all';

const RANGE_OPTIONS: Array<{ value: RangeMode; label: string; days: number | null }> = [
  { value: '7d', label: '7D', days: 7 },
  { value: '30d', label: '30D', days: 30 },
  { value: '90d', label: '90D', days: 90 },
  { value: 'all', label: 'All', days: null },
];

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

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
  const [mode, setMode] = useState<ChartMode>('wps');
  const [range, setRange] = useState<RangeMode>('30d');

  const filteredData = filterHistoryByRange(data, range);
  const yKey = mode === 'wps' ? 'wps' : 'globalRank';
  const yAxisReversed = mode === 'rank';

  if (loadError) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-6 py-8 text-center text-gray-400">
        Unable to load history data.
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-6 py-8 text-center text-gray-400">
        No history data available for the last 180 days.
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-6 py-8 text-center text-gray-400">
        Only one historical snapshot is available so far. More WPS history will appear after future daily refreshes.
      </div>
    );
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup
        options={RANGE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        value={range}
        onChange={setRange}
        activeClassName="bg-gray-200 text-gray-900"
      />
      <ToggleGroup
        options={[
          { value: 'wps', label: 'WPS' },
          { value: 'rank', label: 'Rank' },
        ]}
        value={mode}
        onChange={setMode}
        activeClassName="bg-green-600 text-white"
      />
    </div>
  );

  if (filteredData.length < 2) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50">
        <div className="flex flex-col gap-4 border-b border-gray-700 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-lg font-semibold text-white">WPS Progress</h3>
          {controls}
        </div>
        <div className="px-6 py-8 text-center text-gray-400">
          Not enough snapshots for the selected range yet.
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
        <div className="mt-1 text-white">WPS: {point.wps.toFixed(2)}</div>
        <div className="text-gray-400">Global rank: #{point.globalRank.toLocaleString()}</div>
        <div className="text-gray-400">
          Country rank: {point.countryRank != null ? `#${point.countryRank.toLocaleString()}` : '—'}
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50">
      <div className="flex flex-col gap-4 border-b border-gray-700 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-lg font-semibold text-white">WPS Progress</h3>
        {controls}
      </div>
      <div className="h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={(value) =>
                new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              }
              stroke="#4b5563"
            />
            <YAxis
              dataKey={yKey}
              reversed={yAxisReversed}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={
                mode === 'wps'
                  ? (value: number) => value.toFixed(1)
                  : (value: number) => `#${Number(value).toLocaleString()}`
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
