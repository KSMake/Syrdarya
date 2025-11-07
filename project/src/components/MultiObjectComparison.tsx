import { useState } from 'react';
import { Measurement } from '../types';
import { aggregateData, parseValue, convertM3sToMillionM3 } from '../utils/dataProcessing';

interface MultiObjectComparisonProps {
  measurements: Measurement[];
  objects: string[];
  measureType: string;
  aggregation: 'day' | 'week' | 'month';
  unitType: 'm3/s' | 'million-m3';
}

const COLORS = [
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#06b6d4', // cyan (repeat)
  '#3b82f6'  // blue
];

export const MultiObjectComparison = ({
  measurements,
  objects,
  measureType,
  aggregation,
  unitType
}: MultiObjectComparisonProps) => {
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);

  const toggleObject = (obj: string) => {
    if (selectedObjects.includes(obj)) {
      setSelectedObjects(selectedObjects.filter(o => o !== obj));
    } else {
      if (selectedObjects.length < 5) {
        setSelectedObjects([...selectedObjects, obj]);
      } else {
        alert('Можно сравнить максимум 5 объектов одновременно');
      }
    }
  };

  const getObjectData = (objectName: string) => {
    const filtered = measurements.filter(m =>
      m.Reservoir === objectName &&
      m.Measure.toLowerCase().includes(measureType.toLowerCase())
    );

    const aggregated = aggregateData(filtered, aggregation);
    const isVolume = measureType.toLowerCase().includes('объем');
    const shouldConvert = unitType === 'million-m3' || isVolume;

    return aggregated.map(point => ({
      date: point.date,
      value: shouldConvert
        ? convertM3sToMillionM3(point.value, aggregation === 'day' ? 1 : aggregation === 'week' ? 7 : 30)
        : point.value
    }));
  };

  const allDataSets = selectedObjects.map(obj => ({
    name: obj,
    data: getObjectData(obj)
  }));

  if (allDataSets.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-cyan-500/30">
        <h3 className="text-lg font-bold text-white mb-4">Сравнение объектов</h3>
        <div className="text-center text-gray-400 py-8">
          Выберите объекты для сравнения (максимум 5)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
          {objects.map((obj, i) => (
            <button
              key={i}
              onClick={() => toggleObject(obj)}
              className="text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
            >
              {obj}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const maxLength = Math.max(...allDataSets.map(ds => ds.data.length));
  const allValues = allDataSets.flatMap(ds => ds.data.map(d => d.value));
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue;

  const getYPosition = (value: number) => {
    if (range === 0) return 50;
    return 90 - ((value - minValue) / range) * 80;
  };

  const getMonthDay = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getDate()}.${date.getMonth() + 1}`;
  };

  const tickInterval = Math.max(1, Math.floor(maxLength / 8));
  const xTicks = [];
  if (allDataSets[0]?.data.length > 0) {
    for (let i = 0; i < allDataSets[0].data.length; i += tickInterval) {
      xTicks.push({
        x: (i / (allDataSets[0].data.length - 1)) * 100,
        label: getMonthDay(allDataSets[0].data[i].date)
      });
    }
  }

  const isVolume = measureType.toLowerCase().includes('объем');
  const unitLabel = (unitType === 'million-m3' || isVolume) ? 'млн. м³' : 'м³/с';

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-cyan-500/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Сравнение объектов</h3>
        <div className="text-sm text-gray-400">
          Выбрано: {selectedObjects.length}/5
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
        {objects.map((obj, i) => (
          <button
            key={i}
            onClick={() => toggleObject(obj)}
            className={`text-left px-3 py-2 rounded text-sm transition-all ${
              selectedObjects.includes(obj)
                ? 'bg-cyan-600 text-white font-medium'
                : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
            }`}
          >
            {obj}
          </button>
        ))}
      </div>

      {allDataSets.length > 0 && (
        <>
          <div className="flex flex-wrap gap-4 mb-4">
            {allDataSets.map((ds, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-4 h-1 rounded"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                ></div>
                <span className="text-sm text-gray-300">{ds.name}</span>
                <span className="text-xs text-gray-500">
                  ({ds.data.length} точек)
                </span>
              </div>
            ))}
          </div>

          <div className="relative">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-64 bg-slate-800/50 rounded-lg"
              preserveAspectRatio="none"
            >
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

              {allDataSets.map((ds, dsIndex) => {
                const points = ds.data.map((d, i) => {
                  const x = (i / (ds.data.length - 1)) * 100;
                  const y = getYPosition(d.value);
                  return `${x},${y}`;
                }).join(' ');

                const color = COLORS[dsIndex % COLORS.length];

                return (
                  <g key={dsIndex}>
                    <polyline
                      points={points}
                      fill="none"
                      stroke={color}
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      opacity="0.8"
                    />
                    {ds.data.map((d, i) => {
                      const x = (i / (ds.data.length - 1)) * 100;
                      const y = getYPosition(d.value);
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="0.4"
                          fill={color}
                          opacity="0.6"
                        />
                      );
                    })}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
            {allDataSets.map((ds, i) => {
              const avg = ds.data.reduce((sum, d) => sum + d.value, 0) / ds.data.length;
              const max = Math.max(...ds.data.map(d => d.value));
              const min = Math.min(...ds.data.map(d => d.value));

              return (
                <div
                  key={i}
                  className="bg-slate-700/30 rounded-lg p-3 border-l-4"
                  style={{ borderColor: COLORS[i % COLORS.length] }}
                >
                  <div className="text-white font-medium text-sm mb-2 truncate">
                    {ds.name}
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
