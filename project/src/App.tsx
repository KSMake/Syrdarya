import { useState, useEffect } from 'react';
import {
  Droplets,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  FileText,
  Download,
  BarChart2,
  Activity
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { Measurement, FilterState, ChartDataPoint } from './types';
import {
  parseValue,
  filterByPeriod,
  aggregateData,
  calculateCrossCorrelation,
  convertM3sToMillionM3,
  formatNumber
} from './utils/dataProcessing';
import { OBJECT_TYPES, detectObjectType, getMeasuresForType } from './utils/objectTypes';
import { exportToCSV, generatePDFReport } from './utils/exportUtils';
import { KPICard } from './components/KPICard';
import { VolumeChart } from './components/VolumeChart';
import { BalanceChart } from './components/BalanceChart';
import { SeasonalityChart } from './components/SeasonalityChart';
import { LagAnalysis } from './components/LagAnalysis';
import { DistributionChart } from './components/DistributionChart';
import { MonthlyDistributionChart } from './components/MonthlyDistributionChart';
import { StatisticsPanel } from './components/StatisticsPanel';
import { ComparisonChart } from './components/ComparisonChart';
import { WaterBalanceIndicator } from './components/WaterBalanceIndicator';
import { CumulativeVolumeChart } from './components/CumulativeVolumeChart';
import { DifferenceChart } from './components/DifferenceChart';
import { AdvancedMultiObjectComparison } from './components/AdvancedMultiObjectComparison';

function App() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    objectType: 'reservoir',
    objectName: '',
    measureType: '',
    waterYear: '2023/2024',
    period: 'full-year',
    aggregation: 'day',
    unitType: 'm3/s',
    comparisonYears: [],
    compareWithPrevious: false,
    customStartDate: '',
    customEndDate: ''
  });

  const [objects, setObjects] = useState<string[]>([]);
  const [waterYears, setWaterYears] = useState<string[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (filters.objectName) {
      const detectedType = detectObjectType(filters.objectName);
      if (detectedType !== filters.objectType) {
        setFilters(prev => ({
          ...prev,
          objectType: detectedType,
          measureType: getMeasuresForType(detectedType)[0] || ''
        }));
      }
    }
  }, [filters.objectName]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: metaData } = await supabase
        .from('water_data')
        .select('Date')
        .order('Date', { ascending: true })
        .limit(1);

      const { data: latestData } = await supabase
        .from('water_data')
        .select('Date')
        .order('Date', { ascending: false })
        .limit(1);

      const { data, error } = await supabase
        .from('water_data')
        .select('*')
        .order('Date', { ascending: true });

      if (error) throw error;

      setMeasurements(data || []);

      const customOrder = [
        'Токтогульское вдхр.',
        'Сброс с Учкурганская ГЭС',
        'Андижанское вдхр.',
        'г/п Учтепа',
        'г/п Каль',
        'Бахри Точик вдхр.',
        'г/п Кызылкишлак',
        'Рейка 01 выше Фархад. Пл',
        'Чарвакское вдхр.',
        'река Угам',
        'сброс Газалкентской ГЭС',
        'г/п Кокбулак',
        'г/п Келес',
        'Шардаринское вдхр.'
      ];

      const uniqueObjects = [...new Set(data?.map(m => m.Reservoir) || [])].filter(Boolean);

      const sortedObjects = uniqueObjects.sort((a, b) => {
        const indexA = customOrder.indexOf(a);
        const indexB = customOrder.indexOf(b);

        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b, 'ru');
      });

      setObjects(sortedObjects);

      if (uniqueObjects.length > 0) {
        const firstObject = uniqueObjects[0];
        const objectType = detectObjectType(firstObject);
        const measures = getMeasuresForType(objectType);

        setFilters(prev => ({
          ...prev,
          objectName: firstObject,
          objectType: objectType,
          measureType: measures[0] || ''
        }));
      }

      if (metaData && latestData && metaData[0] && latestData[0]) {
        const startYear = new Date(metaData[0].Date).getFullYear();
        const endYear = new Date(latestData[0].Date).getFullYear();
        const years: string[] = [];

        for (let year = startYear; year <= endYear; year++) {
          years.push(`${year}/${year + 1}`);
        }

        setWaterYears(years);
        if (years.length > 0) {
          setFilters(prev => ({ ...prev, waterYear: years[years.length - 1] }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = (yearOffset: number = 0): Measurement[] => {
    let filtered = measurements;

    if (filters.objectName) {
      filtered = filtered.filter(m => m.Reservoir === filters.objectName);
    }

    if (filters.measureType) {
      filtered = filtered.filter(m =>
        m.Measure.toLowerCase().includes(filters.measureType.toLowerCase())
      );
    }

    if (filters.waterYear) {
      const [startYear, endYear] = filters.waterYear.split('/').map(Number);
      filtered = filtered.filter(m => {
        const date = new Date(m.Date);
        const year = date.getFullYear();
        const month = date.getMonth();

        const targetStartYear = startYear + yearOffset;
        const targetEndYear = endYear + yearOffset;

        return (
          (year === targetStartYear && month >= 9) ||
          (year === targetEndYear && month <= 8)
        );
      });
    }

    filtered = filterByPeriod(filtered, filters.period, filters.customStartDate, filters.customEndDate);

    return filtered;
  };

  const getCurrentData = (): ChartDataPoint[] => {
    const filtered = getFilteredData();
    const aggregated = aggregateData(filtered, filters.aggregation);

    const isVolume = filters.measureType.toLowerCase().includes('объем');
    const shouldConvert = filters.unitType === 'million-m3' || isVolume;

    return aggregated.map(point => {
      const value = shouldConvert
        ? convertM3sToMillionM3(point.value, filters.aggregation === 'day' ? 1 : filters.aggregation === 'week' ? 7 : 30)
        : point.value;

      return { date: point.date, value };
    });
  };

  const getPreviousYearData = (): ChartDataPoint[] => {
    if (!filters.compareWithPrevious) return [];

    const filtered = getFilteredData(-1);
    const aggregated = aggregateData(filtered, filters.aggregation);

    const isVolume = filters.measureType.toLowerCase().includes('объем');
    const shouldConvert = filters.unitType === 'million-m3' || isVolume;

    return aggregated.map(point => {
      const value = shouldConvert
        ? convertM3sToMillionM3(point.value, filters.aggregation === 'day' ? 1 : filters.aggregation === 'week' ? 7 : 30)
        : point.value;

      return { date: point.date, value, isPrevious: true };
    });
  };

  const getSeasonalityData = (): { month: string; value: number }[] => {
    const filtered = getFilteredData();

    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const monthData = new Map<number, number[]>();

    filtered.forEach(m => {
      const value = parseValue(m.Value);
      if (value !== null) {
        const month = new Date(m.Date).getMonth();
        if (!monthData.has(month)) {
          monthData.set(month, []);
        }
        monthData.get(month)!.push(value);
      }
    });

    return Array.from(monthData.entries())
      .map(([month, values]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const value = filters.unitType === 'million-m3'
          ? convertM3sToMillionM3(avg, 30)
          : avg;

        return {
          month: monthNames[month],
          value
        };
      })
      .sort((a, b) => monthNames.indexOf(a.month) - monthNames.indexOf(b.month));
  };

  const getKPIData = () => {
    const data = getCurrentData();

    const avgValue = data.length > 0
      ? data.reduce((sum, d) => sum + d.value, 0) / data.length
      : 0;

    const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;
    const minValue = data.length > 0 ? Math.min(...data.map(d => d.value)) : 0;

    return {
      avgValue,
      maxValue,
      minValue,
      dataPoints: data.length
    };
  };

  const handleExportCSV = () => {
    const filtered = getFilteredData();
    exportToCSV(filtered, `water_data_${filters.objectName}_${filters.waterYear}.csv`);
    setShowExportMenu(false);
  };

  const handleExportPDF = async () => {
    const filtered = getFilteredData();
    const kpiData = getKPIData();

    await generatePDFReport({
      title: 'Дашборд водного баланса бассейна реки Сырдарья',
      filters: {
        objectType: OBJECT_TYPES.find(t => t.type === filters.objectType)?.label || filters.objectType,
        objectName: filters.objectName,
        measureType: filters.measureType,
        waterYear: filters.waterYear,
        period: filters.period === 'full-year' ? 'Весь год' :
                filters.period === 'vegetation' ? 'Вегетация' : 'Межвегетация',
        aggregation: filters.aggregation === 'day' ? 'День' :
                     filters.aggregation === 'week' ? 'Неделя' : 'Месяц'
      },
      kpiData,
      measurements: filtered
    });
    setShowExportMenu(false);
  };

  const currentData = getCurrentData();
  const previousData = getPreviousYearData();
  const seasonalityData = getSeasonalityData();
  const kpiData = getKPIData();

  const isVolume = filters.measureType.toLowerCase().includes('объем');
  const unitLabel = (filters.unitType === 'million-m3' || isVolume) ? 'млн. м³' : 'м³/с';
  const availableMeasures = getMeasuresForType(filters.objectType);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Droplets className="w-16 h-16 text-cyan-400 animate-pulse mx-auto mb-4" />
          <p className="text-white text-xl">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-3 sm:p-6">
      <div className="max-w-[1800px] mx-auto space-y-4 sm:space-y-6">
        <header className="text-center mb-4 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Droplets className="w-8 h-8 sm:w-12 sm:h-12 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              Дашборд водного баланса
            </h1>
          </div>
          <p className="text-cyan-300 text-sm sm:text-base lg:text-lg">
            Бассейн реки Сырдарья - Анализ и прогнозирование
          </p>
        </header>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">Фильтры</h2>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Экспорт</span>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-cyan-500/30 rounded-lg shadow-xl z-10">
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-2 text-white hover:bg-slate-700 rounded-t-lg flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Экспорт в PDF
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2 text-white hover:bg-slate-700 rounded-b-lg flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Экспорт в CSV
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Тип объекта
              </label>
              <select
                value={filters.objectType}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  const measures = getMeasuresForType(newType);
                  setFilters({
                    ...filters,
                    objectType: newType,
                    measureType: measures[0] || ''
                  });
                }}
                className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              >
                {OBJECT_TYPES.map(type => (
                  <option key={type.type} value={type.type}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Объект
              </label>
              <select
                value={filters.objectName}
                onChange={(e) => setFilters({ ...filters, objectName: e.target.value })}
                className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              >
                {objects.map(obj => (
                  <option key={obj} value={obj}>{obj}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Показатель
              </label>
              <select
                value={filters.measureType}
                onChange={(e) => setFilters({ ...filters, measureType: e.target.value })}
                className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              >
                {availableMeasures.map(measure => (
                  <option key={measure} value={measure}>{measure.charAt(0).toUpperCase() + measure.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Водохозяйственный год
              </label>
              <select
                value={filters.waterYear}
                onChange={(e) => setFilters({ ...filters, waterYear: e.target.value })}
                className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              >
                {waterYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Период
              </label>
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value as any })}
                className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              >
                <option value="full-year">Весь год</option>
                <option value="vegetation">Вегетация (Апр-Сен)</option>
                <option value="inter-vegetation">Межвегетация (Окт-Мар)</option>
                <option value="custom">Выбрать даты вручную</option>
              </select>
            </div>

            {filters.period === 'custom' && (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                    Начало периода
                  </label>
                  <input
                    type="date"
                    value={filters.customStartDate}
                    onChange={(e) => setFilters({ ...filters, customStartDate: e.target.value })}
                    className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                    Конец периода
                  </label>
                  <input
                    type="date"
                    value={filters.customEndDate}
                    onChange={(e) => setFilters({ ...filters, customEndDate: e.target.value })}
                    className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Агрегация
              </label>
              <select
                value={filters.aggregation}
                onChange={(e) => setFilters({ ...filters, aggregation: e.target.value as any })}
                className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              >
                <option value="day">День</option>
                <option value="decade">Декада (10 дней)</option>
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={filters.compareWithPrevious}
                onChange={(e) => setFilters({ ...filters, compareWithPrevious: e.target.checked })}
                className="w-4 h-4 text-cyan-600 bg-slate-700 border-cyan-500/30 rounded focus:ring-cyan-500"
              />
              Сравнить с предыдущим годом
            </label>

            {filters.compareWithPrevious && (
              <div className="bg-slate-700/30 rounded-lg p-4 border border-cyan-500/20">
                <div className="text-sm font-medium text-gray-300 mb-3">Настройки сравнения</div>
                <div className="text-xs text-gray-400 mb-3">
                  Выберите период или укажите даты вручную. Эти же даты будут использованы для предыдущего года.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            title="Среднее значение"
            value={formatNumber(kpiData.avgValue)}
            unit={unitLabel}
            icon={<Activity className="w-6 h-6" />}
          />
          <KPICard
            title="Максимум"
            value={formatNumber(kpiData.maxValue)}
            unit={unitLabel}
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <KPICard
            title="Минимум"
            value={formatNumber(kpiData.minValue)}
            unit={unitLabel}
            icon={<BarChart3 className="w-6 h-6" />}
          />
          <KPICard
            title="Точек данных"
            value={kpiData.dataPoints.toString()}
            unit="шт"
            icon={<BarChart2 className="w-6 h-6" />}
          />
        </div>

        {filters.compareWithPrevious && (
          <>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">
                Сравнение с предыдущим годом
              </h3>
              {currentData.length > 0 ? (
                <ComparisonChart
                  currentData={currentData}
                  previousData={previousData}
                  title=""
                  unit={unitLabel}
                />
              ) : (
                <p className="text-gray-400 text-center py-8">Нет данных для отображения</p>
              )}
            </div>

            {currentData.length > 0 && previousData.length > 0 && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
                <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">
                  Анализ разницы между периодами
                </h3>
                <DifferenceChart
                  currentData={currentData}
                  previousData={previousData}
                  title=""
                  unit={unitLabel}
                />
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">
              Динамика {filters.measureType}
            </h3>
            {currentData.length > 0 ? (
              <VolumeChart
                data={currentData}
                title=""
                yAxisLabel={unitLabel}
                height={350}
              />
            ) : (
              <p className="text-gray-400 text-center py-20">Нет данных</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Распределение по месяцам</h3>
            {currentData.length > 0 ? (
              <MonthlyDistributionChart
                data={currentData}
                title=""
                unit={unitLabel}
              />
            ) : (
              <p className="text-gray-400 text-center py-20">Нет данных</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Статистический анализ</h3>
          {currentData.length > 0 ? (
            <StatisticsPanel
              data={currentData.map(d => d.value)}
              unit={unitLabel}
            />
          ) : (
            <p className="text-gray-400 text-center py-8">Нет данных</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">
              Сезонность (средние значения по месяцам)
            </h3>
            {seasonalityData.length > 0 ? (
              <SeasonalityChart
                data={seasonalityData}
                title=""
                yAxisLabel={unitLabel}
                height={350}
              />
            ) : (
              <p className="text-gray-400 text-center py-20">Нет данных</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
            {currentData.length > 0 ? (
              <CumulativeVolumeChart
                data={currentData}
                title={
                  filters.objectName.includes('вдхр')
                    ? 'Накопленный объём'
                    : 'Объём воды за период'
                }
                unit={unitLabel}
              />
            ) : (
              <p className="text-gray-400 text-center py-20">Нет данных</p>
            )}
          </div>
        </div>

        <AdvancedMultiObjectComparison
          measurements={measurements}
          objects={objects}
          filters={filters}
          waterYears={waterYears}
        />

        <div className="space-y-4">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-amber-600 mt-0.5">⚠️</div>
              <div>
                <h4 className="text-amber-800 font-semibold mb-1">Внимание</h4>
                <p className="text-amber-700 text-sm">
                  Данные могут содержать неточности. Процесс очистки и верификации данных продолжается.
                  При обнаружении несоответствий, пожалуйста, свяжитесь с администратором системы.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 mt-0.5">ℹ️</div>
              <div>
                <h4 className="text-blue-800 font-semibold mb-1">Информация</h4>
                <p className="text-blue-700 text-sm">
                  Данные по водоподаче на каналах в настоящее время проходят очистку и верификацию.
                  В ближайшее время они будут полностью отражены в системе.
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="text-center text-gray-400 text-xs sm:text-sm mt-6 sm:mt-8 pb-4">
          <p>Дашборд водного баланса бассейна реки Сырдарья © 2025</p>
          <p className="mt-1 text-xs">Разработано для анализа и мониторинга водных ресурсов</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
