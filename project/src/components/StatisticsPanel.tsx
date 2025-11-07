interface StatisticsPanelProps {
  data: number[];
  unit: string;
}

export const StatisticsPanel = ({ data, unit }: StatisticsPanelProps) => {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-400 py-4">
        Нет данных
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => a - b);
  const sum = data.reduce((acc, val) => acc + val, 0);
  const mean = sum / data.length;
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  const median = sortedData[Math.floor(sortedData.length / 2)];

  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  const q1 = sortedData[Math.floor(sortedData.length * 0.25)];
  const q3 = sortedData[Math.floor(sortedData.length * 0.75)];

  const stats = [
    {
      label: 'Среднее',
      value: mean.toFixed(2),
      tooltip: 'Среднее арифметическое всех значений. Сумма всех измерений деленная на их количество.'
    },
    {
      label: 'Медиана',
      value: median.toFixed(2),
      tooltip: 'Центральное значение в отсортированном ряду данных. Половина значений больше медианы, половина меньше.'
    },
    {
      label: 'Минимум',
      value: min.toFixed(2),
      tooltip: 'Наименьшее зафиксированное значение за выбранный период.'
    },
    {
      label: 'Максимум',
      value: max.toFixed(2),
      tooltip: 'Наибольшее зафиксированное значение за выбранный период.'
    },
    {
      label: 'Ст. отклонение',
      value: stdDev.toFixed(2),
      tooltip: 'Мера разброса значений. Показывает насколько значения отклоняются от среднего. Вычисляется как квадратный корень из дисперсии.'
    },
    {
      label: 'Q1 (25%)',
      value: q1.toFixed(2),
      tooltip: 'Первый квартиль. 25% всех значений находятся ниже этого уровня. Граница между минимальными и средними значениями.'
    },
    {
      label: 'Q3 (75%)',
      value: q3.toFixed(2),
      tooltip: 'Третий квартиль. 75% всех значений находятся ниже этого уровня. Граница между средними и максимальными значениями.'
    },
    {
      label: 'Всего значений',
      value: data.length.toString(),
      tooltip: 'Общее количество измерений за выбранный период.'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-slate-700/50 rounded-lg p-3 border border-cyan-500/20 relative group cursor-help"
          title={stat.tooltip}
        >
          <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            {stat.label}
            <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">ⓘ</span>
          </div>
          <div className="text-lg font-bold text-white">
            {stat.value}
            {stat.label !== 'Всего значений' && (
              <span className="text-xs text-gray-400 ml-1">{unit}</span>
            )}
          </div>

          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 border border-cyan-500/50 rounded-lg text-xs text-gray-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
            <div className="font-semibold text-cyan-400 mb-1">{stat.label}</div>
            {stat.tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-cyan-500/50"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
