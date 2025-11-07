interface MonthlyDistributionChartProps {
  data: { date: string; value: number }[];
  title: string;
  unit: string;
}

export const MonthlyDistributionChart = ({ data, title, unit }: MonthlyDistributionChartProps) => {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        Нет данных для отображения
      </div>
    );
  }

  const monthlyData = new Map<string, number[]>();
  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  data.forEach(item => {
    const date = new Date(item.date);
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, []);
    }
    monthlyData.get(monthKey)!.push(item.value);
  });

  const distribution = Array.from(monthlyData.entries()).map(([month, values]) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return { month, avg, max, min, count: values.length };
  });

  const maxAvg = Math.max(...distribution.map(d => d.avg));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-300">{title}</h4>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-cyan-500"></div>
            <span className="text-gray-400">Среднее</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-emerald-500"></div>
            <span className="text-gray-400">Макс</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-amber-500"></div>
            <span className="text-gray-400">Мин</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {distribution.map((item, i) => {
          const avgPercent = maxAvg > 0 ? (item.avg / maxAvg) * 100 : 0;
          const maxPercent = maxAvg > 0 ? (item.max / maxAvg) * 100 : 0;
          const minPercent = maxAvg > 0 ? (item.min / maxAvg) * 100 : 0;

          return (
            <div key={i} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white">{item.month}</span>
                <span className="text-xs text-gray-400">({item.count} значений)</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">Сред:</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full rounded-full transition-all duration-500 flex items-center justify-end px-2"
                      style={{ width: `${avgPercent}%` }}
                    >
                      {avgPercent > 15 && (
                        <span className="text-xs text-white font-medium">
                          {item.avg.toFixed(1)} {unit}
                        </span>
                      )}
                    </div>
                  </div>
                  {avgPercent <= 15 && (
                    <span className="text-xs text-gray-400 w-24">
                      {item.avg.toFixed(1)} {unit}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-gray-500 w-12">Макс:</span>
                  <div className="flex-1 bg-slate-700/50 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${maxPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-400 w-24">
                    {item.max.toFixed(1)} {unit}
                  </span>
                </div>

                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-gray-500 w-12">Мин:</span>
                  <div className="flex-1 bg-slate-700/50 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${minPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-400 w-24">
                    {item.min.toFixed(1)} {unit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
