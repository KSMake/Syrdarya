import { useState } from 'react';
import { ChartDataPoint } from '../types';

interface ComparisonChartProps {
  currentData: ChartDataPoint[];
  previousData: ChartDataPoint[];
  title: string;
  unit: string;
  currentLabel?: string;
  previousLabel?: string;
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  value: number;
  label: string;
  color: string;
}

export const ComparisonChart = ({
  currentData,
  previousData,
  title,
  unit,
  currentLabel = 'Выбранный период',
  previousLabel = 'Предыдущий год'
}: ComparisonChartProps) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const currentPeriod = currentData.length > 0
    ? `${formatDate(currentData[0].date)} - ${formatDate(currentData[currentData.length - 1].date)}`
    : '';

  const previousPeriod = previousData.length > 0
    ? `${formatDate(previousData[0].date)} - ${formatDate(previousData[previousData.length - 1].date)}`
    : '';

  if (currentData.length === 0 && previousData.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        Нет данных для отображения
      </div>
    );
  }

  const getMonthDay = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}.${month < 10 ? '0' + month : month}`;
  };

  const allValues = [
    ...currentData.map(d => d.value),
    ...previousData.map(d => d.value)
  ];
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue;

  const getYPosition = (value: number) => {
    if (range === 0) return 50;
    return 85 - ((value - minValue) / range) * 70;
  };

  const maxDataLength = Math.max(currentData.length, previousData.length);
  const tickCount = Math.min(8, maxDataLength);
  const tickInterval = Math.floor(maxDataLength / tickCount);

  const xTicks = [];
  for (let i = 0; i < maxDataLength; i += tickInterval) {
    if (currentData[i]) {
      xTicks.push({
        x: (i / (maxDataLength - 1)) * 100,
        label: getMonthDay(currentData[i].date)
      });
    }
  }

  const currentPoints = currentData.map((d, i) => {
    const x = (i / Math.max(1, currentData.length - 1)) * 100;
    const y = getYPosition(d.value);
    return `${x},${y}`;
  }).join(' ');

  const previousPoints = previousData.map((d, i) => {
    const x = (i / Math.max(1, previousData.length - 1)) * 100;
    const y = getYPosition(d.value);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-cyan-500 rounded"></div>
            <span className="text-gray-300 font-medium">{currentLabel}</span>
          </div>
          {previousData.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-amber-500 rounded"></div>
              <span className="text-gray-300 font-medium">{previousLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-64 bg-slate-800/50 rounded-lg"
          preserveAspectRatio="none"
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="currentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="previousGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line
            x1="0" y1="85" x2="100" y2="85"
            stroke="#475569" strokeWidth="0.2"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="2,2"
          />

          {previousData.length > 0 && (
            <>
              <polyline
                points={`0,100 ${previousPoints} 100,100`}
                fill="url(#previousGradient)"
              />
              <polyline
                points={previousPoints}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="0.6"
                vectorEffect="non-scaling-stroke"
              />
              {previousData.map((d, i) => {
                const x = (i / Math.max(1, previousData.length - 1)) * 100;
                const y = getYPosition(d.value);
                return (
                  <circle
                    key={`prev-${i}`}
                    cx={x} cy={y} r="1.5"
                    fill="#f59e0b"
                    opacity="0.7"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (rect) {
                        setTooltip({
                          x: rect.left + (x / 100) * rect.width,
                          y: rect.top + (y / 100) * rect.height,
                          date: formatDate(d.date),
                          value: d.value,
                          label: previousLabel,
                          color: '#f59e0b'
                        });
                      }
                    }}
                  />
                );
              })}
            </>
          )}

          {currentData.length > 0 && (
            <>
              <polyline
                points={`0,100 ${currentPoints} 100,100`}
                fill="url(#currentGradient)"
              />
              <polyline
                points={currentPoints}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {currentData.map((d, i) => {
                const x = (i / Math.max(1, currentData.length - 1)) * 100;
                const y = getYPosition(d.value);
                return (
                  <circle
                    key={`curr-${i}`}
                    cx={x} cy={y} r="1.5"
                    fill="#06b6d4"
                    opacity="0.8"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (rect) {
                        setTooltip({
                          x: rect.left + (x / 100) * rect.width,
                          y: rect.top + (y / 100) * rect.height,
                          date: formatDate(d.date),
                          value: d.value,
                          label: currentLabel,
                          color: '#06b6d4'
                        });
                      }
                    }}
                  />
                );
              })}
            </>
          )}
        </svg>

        {tooltip && (
          <div
            className="fixed z-50 bg-slate-900 border-2 text-white text-xs rounded-lg p-2 shadow-xl pointer-events-none"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y - 60}px`,
              borderColor: tooltip.color,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-semibold mb-1" style={{ color: tooltip.color }}>
              {tooltip.label}
            </div>
            <div className="text-gray-300">
              Дата: {tooltip.date}
            </div>
            <div className="text-white font-medium">
              Значение: {tooltip.value.toFixed(2)} {unit}
            </div>
          </div>
        )}

        <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
          {xTicks.map((tick, i) => (
            <span key={i} className="text-center" style={{ width: '40px' }}>
              {tick.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
          <div className="text-cyan-400 font-medium mb-1">
            {currentLabel}
            {currentPeriod && <div className="text-xs text-cyan-300/70 font-normal mt-0.5">({currentPeriod})</div>}
          </div>
          <div className="text-white">
            <span className="text-xs text-gray-400">Среднее: </span>
            {currentData.length > 0
              ? (currentData.reduce((sum, d) => sum + d.value, 0) / currentData.length).toFixed(2)
              : '—'
            } {unit}
          </div>
          <div className="text-white text-xs mt-1">
            <span className="text-gray-400">Макс: </span>
            {currentData.length > 0 ? Math.max(...currentData.map(d => d.value)).toFixed(2) : '—'} {unit}
          </div>
        </div>

        {previousData.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="text-amber-400 font-medium mb-1">
              {previousLabel}
              {previousPeriod && <div className="text-xs text-amber-300/70 font-normal mt-0.5">({previousPeriod})</div>}
            </div>
            <div className="text-white">
              <span className="text-xs text-gray-400">Среднее: </span>
              {(previousData.reduce((sum, d) => sum + d.value, 0) / previousData.length).toFixed(2)} {unit}
            </div>
            <div className="text-white text-xs mt-1">
              <span className="text-gray-400">Макс: </span>
              {Math.max(...previousData.map(d => d.value)).toFixed(2)} {unit}
            </div>
          </div>
        )}
      </div>

      {previousData.length === 0 && (
        <div className="text-center text-amber-400 text-sm py-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          ⚠️ Данные за предыдущий период отсутствуют
        </div>
      )}
    </div>
  );
};
