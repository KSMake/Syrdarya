import { ChartDataPoint } from '../types';

interface CumulativeVolumeChartProps {
  data: ChartDataPoint[];
  title: string;
  unit: string;
}

export const CumulativeVolumeChart = ({ data, title, unit }: CumulativeVolumeChartProps) => {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        Нет данных для отображения
      </div>
    );
  }

  let cumulative = 0;
  const cumulativeData = data.map((point, i) => {
    cumulative += point.value;
    return {
      date: point.date,
      value: cumulative,
      original: point.value
    };
  });

  const maxValue = Math.max(...cumulativeData.map(d => d.value));
  const minValue = Math.min(...cumulativeData.map(d => d.value));
  const range = maxValue - minValue;

  const getYPosition = (value: number) => {
    if (range === 0) return 50;
    return 90 - ((value - minValue) / range) * 80;
  };

  const points = cumulativeData.map((d, i) => {
    const x = (i / (cumulativeData.length - 1)) * 100;
    const y = getYPosition(d.value);
    return `${x},${y}`;
  }).join(' ');

  const getMonthLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    return `${months[date.getMonth()]}`;
  };

  const tickInterval = Math.max(1, Math.floor(cumulativeData.length / 8));
  const xTicks = [];
  for (let i = 0; i < cumulativeData.length; i += tickInterval) {
    xTicks.push({
      x: (i / (cumulativeData.length - 1)) * 100,
      label: getMonthLabel(cumulativeData[i].date)
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <div className="text-xs text-gray-400">
          Накопленный объём: <span className="text-cyan-400 font-bold">{cumulative.toFixed(2)} млн. м³</span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-48 bg-slate-800/50 rounded-lg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cumulativeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <polyline
            points={`0,100 ${points} 100,100`}
            fill="url(#cumulativeGradient)"
          />

          <polyline
            points={points}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          {cumulativeData.map((d, i) => {
            const x = (i / (cumulativeData.length - 1)) * 100;
            const y = getYPosition(d.value);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="0.5"
                fill="#06b6d4"
                opacity="0.6"
              />
            );
          })}

          <line
            x1="0"
            y1="90"
            x2="100"
            y2="90"
            stroke="#475569"
            strokeWidth="0.2"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="2,2"
          />
        </svg>

        <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
          {xTicks.map((tick, i) => (
            <span key={i}>{tick.label}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-700/30 rounded p-2">
          <div className="text-gray-400">Начальный</div>
          <div className="text-white font-medium">{cumulativeData[0].value.toFixed(2)}</div>
        </div>
        <div className="bg-slate-700/30 rounded p-2">
          <div className="text-gray-400">Максимум</div>
          <div className="text-white font-medium">{maxValue.toFixed(2)}</div>
        </div>
        <div className="bg-slate-700/30 rounded p-2">
          <div className="text-gray-400">Текущий</div>
          <div className="text-white font-medium">{cumulativeData[cumulativeData.length - 1].value.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};
