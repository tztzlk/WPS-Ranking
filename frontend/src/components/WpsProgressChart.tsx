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

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export function WpsProgressChart({ data, loadError }: WpsProgressChartProps) {
  const [mode, setMode] = useState<ChartMode>('wps');

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

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ProfileHistoryItem }[] }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm shadow-lg">
        <div className="text-gray-300">{formatDate(p.date)}</div>
        <div className="mt-1 text-white">WPS: {p.wps.toFixed(2)}</div>
        <div className="text-gray-400">Global rank: #{p.globalRank.toLocaleString()}</div>
        <div className="text-gray-400">
          Country rank: {p.countryRank != null ? `#${p.countryRank.toLocaleString()}` : '—'}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">WPS Progress</h3>
        <div className="flex rounded-lg border border-gray-600 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('wps')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'wps'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-600'
            }`}
          >
            WPS
          </button>
          <button
            type="button"
            onClick={() => setMode('rank')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'rank'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-600'
            }`}
          >
            Rank
          </button>
        </div>
      </div>
      <div className="p-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              stroke="#4b5563"
            />
            <YAxis
              dataKey={yKey}
              reversed={yAxisReversed}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={
                mode === 'wps'
                  ? (v) => v.toFixed(1)
                  : (v) => `#${Number(v).toLocaleString()}`
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
