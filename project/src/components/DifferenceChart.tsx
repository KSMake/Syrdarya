import { ChartDataPoint } from '../types';

interface DifferenceChartProps {
  currentData: ChartDataPoint[];
  previousData: ChartDataPoint[];
  title: string;
  unit: string;
}

export const DifferenceChart = ({
  currentData,
  previousData,
  title,
  unit
}: DifferenceChartProps) => {
  if (currentData.length === 0 || previousData.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        Нужны данные обоих периодов для сравнения
      </div>
    );
  }

  const minLength = Math.min(currentData.length, previousData.length);
  const differences = [];

  for (let i = 0; i < minLength; i++) {
    const diff = currentData[i].value - previousData[i].value;
    const percentDiff = previousData[i].value !== 0
      ? (diff / previousData[i].value) * 100
      : 0;

    differences.push({
      date: currentData[i].date,
      diff,
      percentDiff,
      isPositive: diff >= 0
    });
  }

  const maxAbsDiff = Math.max(...differences.map(d => Math.abs(d.diff)));
  const avgDiff = differences.reduce((sum, d) => sum + d.diff, 0) / differences.length;
  const avgPercentDiff = differences.reduce((sum, d) => sum + d.percentDiff, 0) / differences.length;

  const getYPosition = (value: number) => {
    if (maxAbsDiff === 0) return 50;
    return 50 - (value / maxAbsDiff) * 40;
  };

  const getMonthDay = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getDate()}.${date.getMonth() + 1}`;
  };

  const tickInterval = Math.max(1, Math.floor(differences.length / 8));
  const xTicks = [];
  for (let i = 0; i < differences.length; i += tickInterval) {
    xTicks.push({
      x: (i / (differences.length - 1)) * 100,
      label: getMonthDay(differences[i].date)
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <div className="text-xs">
          <span className="text-gray-400">Средняя разница: </span>
          <span className={avgDiff >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
            {avgDiff >= 0 && '+'}{avgDiff.toFixed(2)} {unit}
          </span>
          <span className="text-gray-500 ml-2">
            ({avgPercentDiff >= 0 && '+'}{avgPercentDiff.toFixed(1)}%)
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-48 bg-slate-800/50 rounded-lg"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="#475569"
            strokeWidth="0.3"
            vectorEffect="non-scaling-stroke"
          />

          {differences.map((d, i) => {
            const x = (i / (differences.length - 1)) * 100;
            const y = getYPosition(d.diff);
            const barHeight = Math.abs(y - 50);
            const barY = d.isPositive ? y : 50;

            return (
              <g key={i}>
                <rect
                  x={x - 0.5}
                  y={barY}
                  width="1"
                  height={barHeight}
                  fill={d.isPositive ? '#10b981' : '#ef4444'}
                  opacity="0.7"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="0.5"
                  fill={d.isPositive ? '#10b981' : '#ef4444'}
                />
              </g>
            );
          })}
        </svg>

        <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
          {xTicks.map((tick, i) => (
            <span key={i}>{tick.label}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-700/30 rounded p-2">
          <div className="text-gray-400 mb-1">Увеличение</div>
          <div className="text-emerald-400 font-medium">
            {differences.filter(d => d.isPositive).length} дней
          </div>
        </div>
        <div className="bg-slate-700/30 rounded p-2">
          <div className="text-gray-400 mb-1">Уменьшение</div>
          <div className="text-red-400 font-medium">
            {differences.filter(d => !d.isPositive).length} дней
          </div>
        </div>
        <div className="bg-slate-700/30 rounded p-2">
          <div className="text-gray-400 mb-1">Макс. разница</div>
          <div className="text-white font-medium">
            {maxAbsDiff.toFixed(2)} {unit}
          </div>
        </div>
      </div>

      <div className="bg-slate-700/20 rounded-lg p-3 text-xs text-gray-300">
        <div className="font-medium text-cyan-400 mb-1">Интерпретация:</div>
        {avgDiff > 0 ? (
          <span>В выбранном периоде значения в среднем <span className="text-emerald-400 font-medium">выше на {avgDiff.toFixed(2)} {unit}</span> ({avgPercentDiff.toFixed(1)}%) по сравнению с предыдущим годом.</span>
        ) : (
          <span>В выбранном периоде значения в среднем <span className="text-red-400 font-medium">ниже на {Math.abs(avgDiff).toFixed(2)} {unit}</span> ({Math.abs(avgPercentDiff).toFixed(1)}%) по сравнению с предыдущим годом.</span>
        )}
      </div>
    </div>
  );
};
