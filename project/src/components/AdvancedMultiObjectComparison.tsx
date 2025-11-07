import { useState } from 'react';
import { Measurement, FilterState } from '../types';
import { aggregateData, parseValue, convertM3sToMillionM3, filterByPeriod, getWaterYearDates } from '../utils/dataProcessing';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface AdvancedMultiObjectComparisonProps {
  measurements: Measurement[];
  objects: string[];
  filters: FilterState;
  waterYears: string[];
}

interface ObjectConfig {
  name: string;
  measureType: string;
  color: string;
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  value: number;
  objectName: string;
  measureType: string;
  color: string;
}

const COLORS = [
  '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#f97316', '#3b82f6', '#14b8a6'
];

const MEASURE_TYPES = [
  { value: 'приток', label: 'Приток' },
  { value: 'попуск', label: 'Попуск' },
  { value: 'расход', label: 'Расход' },
  { value: 'сброс', label: 'Сброс' },
  { value: 'объем', label: 'Объём' }
];

export const AdvancedMultiObjectComparison = ({
  measurements,
  objects,
  filters,
  waterYears
}: AdvancedMultiObjectComparisonProps) => {
  const [selectedObjects, setSelectedObjects] = useState<ObjectConfig[]>([]);
  const [compareWithYear, setCompareWithYear] = useState<string>('');
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');

  const addObject = (objectName: string) => {
    if (selectedObjects.length >= 5) {
      alert('Можно сравнить максимум 5 объектов');
      return;
    }

    setSelectedObjects([
      ...selectedObjects,
      {
        name: objectName,
        measureType: 'приток',
        color: COLORS[selectedObjects.length % COLORS.length]
      }
    ]);
  };

  const removeObject = (index: number) => {
    setSelectedObjects(selectedObjects.filter((_, i) => i !== index));
  };

  const updateMeasureType = (index: number, measureType: string) => {
    const updated = [...selectedObjects];
    updated[index].measureType = measureType;
    setSelectedObjects(updated);
  };

  const getObjectData = (objectName: string, measureType: string, waterYear?: string) => {
    const yearToUse = waterYear || filters.waterYear;
    const { start, end } = getWaterYearDates(yearToUse);

    let filtered = measurements.filter(m => {
      const date = new Date(m.Date);
      return m.Reservoir === objectName &&
        m.Measure.toLowerCase().includes(measureType.toLowerCase()) &&
        date >= start && date <= end;
    });

    filtered = filterByPeriod(filtered, filters.period, filters.customStartDate, filters.customEndDate);

    const aggregated = aggregateData(filtered, filters.aggregation);
    const isVolume = measureType.toLowerCase().includes('объем');
    const shouldConvert = filters.unitType === 'million-m3' || isVolume;

    const daysMultiplier = filters.aggregation === 'day' ? 1 :
                          filters.aggregation === 'week' ? 7 :
                          filters.aggregation === 'decade' ? 10 : 30;

    return aggregated.map(point => ({
      date: point.date,
      value: shouldConvert
        ? convertM3sToMillionM3(point.value, daysMultiplier)
        : point.value
    }));
  };

  const generateAnalysis = () => {
    if (selectedObjects.length === 0) return null;

    const analyses: string[] = [];

    selectedObjects.forEach((obj, idx) => {
      const currentData = getObjectData(obj.name, obj.measureType);
      if (currentData.length === 0) return;

      const avg = currentData.reduce((sum, d) => sum + d.value, 0) / currentData.length;
      const max = Math.max(...currentData.map(d => d.value));
      const min = Math.min(...currentData.map(d => d.value));

      const firstHalf = currentData.slice(0, Math.floor(currentData.length / 2));
      const secondHalf = currentData.slice(Math.floor(currentData.length / 2));

      const avgFirst = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

      const change = ((avgSecond - avgFirst) / avgFirst) * 100;

      let trend = '';
      if (Math.abs(change) < 5) {
        trend = 'оставался стабильным';
      } else if (change > 0) {
        trend = `увеличился на ${change.toFixed(1)}%`;
      } else {
        trend = `снизился на ${Math.abs(change).toFixed(1)}%`;
      }

      analyses.push(
        `${obj.name} (${obj.measureType}): среднее значение ${avg.toFixed(2)}, ${trend} во второй половине периода.`
      );

      if (compareWithYear) {
        const prevData = getObjectData(obj.name, obj.measureType, compareWithYear);
        if (prevData.length > 0) {
          const prevAvg = prevData.reduce((sum, d) => sum + d.value, 0) / prevData.length;
          const yearChange = ((avg - prevAvg) / prevAvg) * 100;

          if (Math.abs(yearChange) < 5) {
            analyses.push(`  По сравнению с ${compareWithYear}: изменения незначительные.`);
          } else if (yearChange > 0) {
            analyses.push(`  По сравнению с ${compareWithYear}: рост на ${yearChange.toFixed(1)}%.`);
          } else {
            analyses.push(`  По сравнению с ${compareWithYear}: снижение на ${Math.abs(yearChange).toFixed(1)}%.`);
          }
        }
      }
    });

    return analyses;
  };

  const allDataSets = selectedObjects.map(obj => ({
    config: obj,
    currentData: getObjectData(obj.name, obj.measureType),
    previousData: compareWithYear ? getObjectData(obj.name, obj.measureType, compareWithYear) : []
  }));

  const maxLength = Math.max(
    ...allDataSets.map(ds => Math.max(ds.currentData.length, ds.previousData.length))
  );

  const allValues = allDataSets.flatMap(ds => [
    ...ds.currentData.map(d => d.value),
    ...ds.previousData.map(d => d.value)
  ]);

  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0;
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
  const range = maxValue - minValue;

  const getYPosition = (value: number) => {
    if (range === 0) return 50;
    return 90 - ((value - minValue) / range) * 80;
  };

  const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getDate()}.${date.getMonth() + 1}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const analysis = generateAnalysis();

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-cyan-500/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Сравнение объектов</h3>
        <div className="text-sm text-gray-400">
          Выбрано: {selectedObjects.length}/5
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-300 bg-slate-700/30 rounded p-3">
        Период: {filters.period === 'custom' && filters.customStartDate && filters.customEndDate
          ? `${filters.customStartDate} — ${filters.customEndDate}`
          : filters.period === 'vegetation' ? 'Вегетация (Апр-Сен)'
          : filters.period === 'inter-vegetation' ? 'Межвегетация (Окт-Мар)'
          : 'Весь год'
        } | Агрегация: {
          filters.aggregation === 'day' ? 'День' :
          filters.aggregation === 'decade' ? 'Декада (10 дней)' :
          filters.aggregation === 'week' ? 'Неделя' : 'Месяц'
        }
      </div>

      {selectedObjects.length === 0 && (
        <div className="text-center text-gray-400 py-8 mb-4">
          Выберите объекты для сравнения
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
        {objects.map((obj, i) => {
          const isSelected = selectedObjects.some(s => s.name === obj);
          return (
            <button
              key={i}
              onClick={() => isSelected ? null : addObject(obj)}
              disabled={isSelected}
              className={`text-left px-3 py-2 rounded text-sm transition-all ${
                isSelected
                  ? 'bg-slate-600 text-gray-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              {obj}
            </button>
          );
        })}
      </div>

      {selectedObjects.length > 0 && (
        <>
          <div className="space-y-3 mb-6">
            {selectedObjects.map((obj, idx) => (
              <div
                key={idx}
                className="bg-slate-700/40 rounded-lg p-3 border-l-4"
                style={{ borderColor: obj.color }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm mb-2">{obj.name}</div>
                    <select
                      value={obj.measureType}
                      onChange={(e) => updateMeasureType(idx, e.target.value)}
                      className="w-full bg-slate-600 text-white border border-cyan-500/30 rounded px-2 py-1 text-sm"
                    >
                      {MEASURE_TYPES.map(mt => (
                        <option key={mt.value} value={mt.value}>{mt.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => removeObject(idx)}
                    className="text-red-400 hover:text-red-300 text-sm px-2"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                <Calendar size={16} />
                Сравнить с другим годом
              </label>
              <select
                value={compareWithYear}
                onChange={(e) => setCompareWithYear(e.target.value)}
                className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Не сравнивать</option>
                {waterYears.filter(y => y !== filters.waterYear).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Вид отображения
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'chart'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  График
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  Таблица
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'chart' && (
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">
                Тип графика
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('line')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    chartType === 'line'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  Линейный
                </button>
                <button
                  onClick={() => setChartType('area')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    chartType === 'area'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  С заливкой
                </button>
              </div>
            </div>
          )}

          {viewMode === 'chart' ? (
            <div className="relative mb-6">
              {filters.aggregation === 'day' && maxLength > 30 && (
                <div className="mb-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
                  💡 Совет: При большом количестве дней используйте таблицу для точного сравнения данных
                </div>
              )}
              <svg
              viewBox="0 0 100 100"
              className={`w-full bg-slate-800/50 rounded-lg ${
                filters.aggregation === 'day' ? 'h-96' : 'h-80'
              }`}
              preserveAspectRatio="none"
              onMouseLeave={() => setTooltip(null)}
            >
              <line
                x1="0" y1="90" x2="100" y2="90"
                stroke="#475569" strokeWidth="0.2"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2,2"
              />

              {allDataSets.map((ds, dsIndex) => {
                const color = ds.config.color;
                const showPoints = ds.currentData.length <= 50;
                const lineWidth = filters.aggregation === 'day' ? 0.6 : 1.2;
                const lineOpacity = filters.aggregation === 'day' ? 0.85 : 0.9;

                return (
                  <g key={dsIndex}>
                    {ds.currentData.length > 0 && (
                      <>
                        {chartType === 'area' && (
                          <polygon
                            points={
                              ds.currentData.map((d, i) => {
                                const x = (i / Math.max(1, ds.currentData.length - 1)) * 100;
                                const y = getYPosition(d.value);
                                return `${x},${y}`;
                              }).join(' ') + ' 100,90 0,90'
                            }
                            fill={color}
                            fillOpacity="0.15"
                            stroke="none"
                          />
                        )}

                        <polyline
                          points={ds.currentData.map((d, i) => {
                            const x = (i / Math.max(1, ds.currentData.length - 1)) * 100;
                            const y = getYPosition(d.value);
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke={color}
                          strokeWidth={lineWidth}
                          vectorEffect="non-scaling-stroke"
                          opacity={lineOpacity}
                        />

                        {ds.currentData.map((d, i) => {
                          const x = (i / Math.max(1, ds.currentData.length - 1)) * 100;
                          const y = getYPosition(d.value);
                          return (
                            <g key={`curr-${i}`}>
                              {showPoints && (
                                <circle
                                  cx={x} cy={y} r="1.5"
                                  fill={color}
                                  opacity="0.9"
                                  style={{ cursor: 'pointer' }}
                                />
                              )}
                              <circle
                                cx={x} cy={y} r={showPoints ? "3" : "2"}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                  if (rect) {
                                    setTooltip({
                                      x: rect.left + (x / 100) * rect.width,
                                      y: rect.top + (y / 100) * rect.height,
                                      date: formatDate(d.date),
                                      value: d.value,
                                      objectName: ds.config.name,
                                      measureType: ds.config.measureType,
                                      color: color
                                    });
                                  }
                                }}
                              />
                            </g>
                          );
                        })}
                      </>
                    )}

                    {ds.previousData.length > 0 && (
                      <polyline
                        points={ds.previousData.map((d, i) => {
                          const x = (i / Math.max(1, ds.previousData.length - 1)) * 100;
                          const y = getYPosition(d.value);
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke={color}
                        strokeWidth={lineWidth * 0.8}
                        vectorEffect="non-scaling-stroke"
                        opacity="0.3"
                        strokeDasharray="3,3"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {tooltip && (
              <div
                className="fixed z-50 bg-slate-900 border-2 text-white text-xs rounded-lg p-2 shadow-xl pointer-events-none"
                style={{
                  left: `${tooltip.x}px`,
                  top: `${tooltip.y - 80}px`,
                  borderColor: tooltip.color,
                  transform: 'translateX(-50%)',
                  minWidth: '160px'
                }}
              >
                <div className="font-semibold mb-1" style={{ color: tooltip.color }}>
                  {tooltip.objectName}
                </div>
                <div className="text-gray-400 text-xs mb-1">
                  {tooltip.measureType}
                </div>
                <div className="text-gray-300">
                  Дата: {tooltip.date}
                </div>
                <div className="text-white font-medium">
                  Значение: {tooltip.value.toFixed(2)} {
                    tooltip.measureType.toLowerCase().includes('объем') ||
                    filters.unitType === 'million-m3'
                      ? 'млн. м³'
                      : 'м³/с'
                  }
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-3">
              {allDataSets.map((ds, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-6 h-1 rounded"
                      style={{ backgroundColor: ds.config.color }}
                    />
                    <span className="text-gray-300">{ds.config.name}</span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    ({ds.config.measureType})
                  </span>
                </div>
              ))}
            </div>
            </div>
          ) : (
            <div className="mb-6 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-700/50">
                    <th className="border border-slate-600 px-3 py-2 text-left text-gray-300 sticky left-0 bg-slate-700 z-10">
                      Дата
                    </th>
                    {allDataSets.map((ds, i) => (
                      <th
                        key={i}
                        className="border border-slate-600 px-3 py-2 text-center text-white whitespace-nowrap"
                        style={{ backgroundColor: `${ds.config.color}20` }}
                      >
                        <div className="font-medium">{ds.config.name}</div>
                        <div className="text-xs text-gray-400 font-normal">
                          {ds.config.measureType}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const maxLength = Math.max(...allDataSets.map(ds => ds.currentData.length));
                    const rows = [];

                    for (let i = 0; i < maxLength; i++) {
                      rows.push(
                        <tr key={i} className="hover:bg-slate-700/30">
                          <td className="border border-slate-600 px-3 py-2 text-gray-300 font-medium sticky left-0 bg-slate-800 z-10">
                            {allDataSets[0]?.currentData[i] ? formatDate(allDataSets[0].currentData[i].date) : '—'}
                          </td>
                          {allDataSets.map((ds, dsIndex) => {
                            const dataPoint = ds.currentData[i];
                            const isVolume = ds.config.measureType.toLowerCase().includes('объем');
                            const unit = (filters.unitType === 'million-m3' || isVolume) ? 'млн. м³' : 'м³/с';

                            return (
                              <td
                                key={dsIndex}
                                className="border border-slate-600 px-3 py-2 text-center text-white"
                              >
                                {dataPoint ? (
                                  <span className="font-mono">
                                    {dataPoint.value.toFixed(2)} <span className="text-xs text-gray-400">{unit}</span>
                                  </span>
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }

                    return rows;
                  })()}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-700/50 font-medium">
                    <td className="border border-slate-600 px-3 py-2 text-gray-300 sticky left-0 bg-slate-700 z-10">
                      Среднее
                    </td>
                    {allDataSets.map((ds, i) => {
                      if (ds.currentData.length === 0) {
                        return (
                          <td key={i} className="border border-slate-600 px-3 py-2 text-center text-gray-500">
                            —
                          </td>
                        );
                      }

                      const avg = ds.currentData.reduce((sum, d) => sum + d.value, 0) / ds.currentData.length;
                      const isVolume = ds.config.measureType.toLowerCase().includes('объем');
                      const unit = (filters.unitType === 'million-m3' || isVolume) ? 'млн. м³' : 'м³/с';

                      return (
                        <td
                          key={i}
                          className="border border-slate-600 px-3 py-2 text-center text-cyan-400"
                        >
                          <span className="font-mono">
                            {avg.toFixed(2)} <span className="text-xs">{unit}</span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {analysis && analysis.length > 0 && (
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-cyan-400 font-medium mb-3">
                <TrendingUp size={18} />
                Аналитика
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                {analysis.map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">•</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
            {allDataSets.map((ds, i) => {
              const data = ds.currentData;
              if (data.length === 0) return null;

              const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length;
              const max = Math.max(...data.map(d => d.value));
              const min = Math.min(...data.map(d => d.value));

              const isVolume = ds.config.measureType.toLowerCase().includes('объем');
              const unitLabel = (filters.unitType === 'million-m3' || isVolume) ? 'млн. м³' : 'м³/с';

              return (
                <div
                  key={i}
                  className="bg-slate-700/30 rounded-lg p-3 border-l-4"
                  style={{ borderColor: ds.config.color }}
                >
                  <div className="text-white font-medium text-sm mb-2 truncate">
                    {ds.config.name}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    {ds.config.measureType}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Среднее:</span>
                      <span className="text-white font-medium">{avg.toFixed(2)} {unitLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Макс:</span>
                      <span className="text-white">{max.toFixed(2)} {unitLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Мин:</span>
                      <span className="text-white">{min.toFixed(2)} {unitLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
