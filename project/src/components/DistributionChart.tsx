import { useMemo } from 'react';

interface DistributionChartProps {
  data: number[];
  title: string;
  unit: string;
}

export const DistributionChart = ({ data, title, unit }: DistributionChartProps) => {
  const distribution = useMemo(() => {
    if (data.length === 0) return [];

    const min = Math.min(...data);
    const max = Math.max(...data);
    const binCount = 10;
    const binSize = (max - min) / binCount;

    const bins = Array(binCount).fill(0);
    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
      bins[binIndex]++;
    });

    const maxBinValue = Math.max(...bins);

    return bins.map((count, i) => ({
      range: `${(min + i * binSize).toFixed(0)}-${(min + (i + 1) * binSize).toFixed(0)}`,
      count,
      percentage: maxBinValue > 0 ? (count / maxBinValue) * 100 : 0
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-300">{title}</h4>
      <div className="space-y-2">
        {distribution.map((bin, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="text-xs text-gray-400 w-24 text-right">
              {bin.range} {unit}
            </div>
            <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 flex items-center justify-end px-2"
                style={{ width: `${bin.percentage}%` }}
              >
                {bin.percentage > 20 && (
                  <span className="text-xs text-white font-medium">{bin.count}</span>
                )}
              </div>
            </div>
            {bin.percentage <= 20 && bin.count > 0 && (
              <span className="text-xs text-gray-400 w-8">{bin.count}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
