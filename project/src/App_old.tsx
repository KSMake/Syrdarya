import { useState, useEffect } from 'react';
import {
  Droplets,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  FileText
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
import { KPICard } from './components/KPICard';
import { VolumeChart } from './components/VolumeChart';
import { BalanceChart } from './components/BalanceChart';
import { SeasonalityChart } from './components/SeasonalityChart';
import { LagAnalysis } from './components/LagAnalysis';

function App() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    reservoir: '',
    waterYear: '2023/2024',
    period: 'full-year',
    aggregation: 'day',
    unitType: 'm3/s',
    comparisonYears: []
  });

  const [reservoirs, setReservoirs] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [waterYears, setWaterYears] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

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

      const uniqueReservoirs = [...new Set(data?.map(m => m.Reservoir) || [])];
      const uniqueStations = [...new Set(data?.map(m => m.Station) || [])].filter(s => s !== null);
      setReservoirs(uniqueReservoirs.filter(Boolean));
      setStations(uniqueStations.filter(Boolean));

      if (uniqueReservoirs.length > 0) {
        setFilters(prev => ({ ...prev, reservoir: uniqueReservoirs[0] }));
      }

      if (metaData && latestData && metaData[0] && latestData[0]) {
        const startYear = new Date(metaData[0].Date).getFullYear();
        const endYear = new Date(latestData[0].Date).getFullYear();
        const years: string[] = [];

        for (let year = startYear; year <= endYear; year++) {
          years.push(`${year}/${year + 1}`);
        }

        setWaterYears(years);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = (): Measurement[] => {
    let filtered = measurements;

    if (filters.reservoir) {
      filtered = filtered.filter(m => m.Reservoir === filters.reservoir);
    }

    if (filters.waterYear) {
      const [startYear, endYear] = filters.waterYear.split('/').map(Number);
      filtered = filtered.filter(m => {
        const date = new Date(m.Date);
        const year = date.getFullYear();
        const month = date.getMonth();

        return (
          (year === startYear && month >= 9) ||
          (year === endYear && month <= 8)
        );
      });
    }

    filtered = filterByPeriod(filtered, filters.period);

    return filtered;
  };

  const getVolumeData = (): ChartDataPoint[] => {
    const filtered = getFilteredData().filter(m => m.Measure.toLowerCase().includes('объем'));
    const aggregated = aggregateData(filtered, filters.aggregation);

    return aggregated.map(point => {
      const value = filters.unitType === 'million-m3'
        ? convertM3sToMillionM3(point.value, 1)
        : point.value;

      return { date: point.date, value };
    });
  };

  const getInflowData = (): ChartDataPoint[] => {
    const filtered = getFilteredData().filter(m => m.Measure.toLowerCase().includes('приток'));
    const aggregated = aggregateData(filtered, filters.aggregation);

    return aggregated.map(point => {
      const value = filters.unitType === 'million-m3'
        ? convertM3sToMillionM3(point.value, filters.aggregation === 'day' ? 1 : filters.aggregation === 'week' ? 7 : 30)
        : point.value;

      return { date: point.date, value };
    });
  };

  const getOutflowData = (): ChartDataPoint[] => {
    const filtered = getFilteredData().filter(m => m.Measure.toLowerCase().includes('попуск'));
    const aggregated = aggregateData(filtered, filters.aggregation);

    return aggregated.map(point => {
      const value = filters.unitType === 'million-m3'
        ? convertM3sToMillionM3(point.value, filters.aggregation === 'day' ? 1 : filters.aggregation === 'week' ? 7 : 30)
        : point.value;

      return { date: point.date, value };
    });
  };

  const getSeasonalityData = (): { month: string; value: number }[] => {
    const filtered = getFilteredData().filter(m => m.Measure.toLowerCase().includes('приток'));

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

  const getLagAnalysisData = () => {
    const sourceData = getFilteredData()
      .filter(m => m.Reservoir.includes('Бахри Точик') && m.Measure.toLowerCase().includes('попуск'))
      .map(m => parseValue(m.Value) || 0);

    const targetData = getFilteredData()
      .filter(m => m.Reservoir.includes('Шардара') && m.Measure.toLowerCase().includes('приток'))
      .map(m => parseValue(m.Value) || 0);

    if (sourceData.length === 0 || targetData.length === 0) {
      return null;
    }

    const { lag, correlation } = calculateCrossCorrelation(sourceData, targetData);

    const sourceDates = getFilteredData()
      .filter(m => m.Reservoir.includes('Бахри Точик') && m.Measure.toLowerCase().includes('попуск'));

    const targetDates = getFilteredData()
      .filter(m => m.Reservoir.includes('Шардара') && m.Measure.toLowerCase().includes('приток'));

    return {
      lag,
      correlation,
      sourceData: sourceDates.map((m, i) => ({
        date: m.Date,
        value: sourceData[i]
      })),
      targetData: targetDates.map((m, i) => ({
        date: m.Date,
        value: targetData[i]
      }))
    };
  };

  const getKPIData = () => {
    const inflowData = getInflowData();
    const outflowData = getOutflowData();
    const volumeData = getVolumeData();

    const avgInflow = inflowData.length > 0
      ? inflowData.reduce((sum, d) => sum + d.value, 0) / inflowData.length
      : 0;

    const avgOutflow = outflowData.length > 0
      ? outflowData.reduce((sum, d) => sum + d.value, 0) / outflowData.length
      : 0;

    const avgVolume = volumeData.length > 0
      ? volumeData.reduce((sum, d) => sum + d.value, 0) / volumeData.length
      : 0;

    const lagData = getLagAnalysisData();
    const avgLag = lagData?.lag || 0;

    return {
      avgInflow,
      avgOutflow,
      avgVolume,
      avgLag,
      yearChange: 0
    };
  };

  const kpiData = getKPIData();
  const volumeData = getVolumeData();
  const inflowData = getInflowData();
  const outflowData = getOutflowData();
  const seasonalityData = getSeasonalityData();
  const lagAnalysisData = getLagAnalysisData();

  const unitLabel = filters.unitType === 'million-m3' ? 'млн. м³' : 'м³/с';

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
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">Фильтры</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Водохранилище
              </label>
              <select
                value={filters.reservoir}
                onChange={(e) => setFilters({ ...filters, reservoir: e.target.value })}
                className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              >
                {reservoirs.map(r => (
                  <option key={r} value={r}>{r}</option>
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
              </select>
            </div>

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
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Единицы
              </label>
              <select
                value={filters.unitType}
                onChange={(e) => setFilters({ ...filters, unitType: e.target.value as any })}
                className="w-full bg-slate-700 text-white border border-cyan-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              >
                <option value="m3/s">м³/с</option>
                <option value="million-m3">млн. м³</option>
              </select>
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-1">
              <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Отчёт</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            title="Средний приток"
            value={formatNumber(kpiData.avgInflow)}
            unit={unitLabel}
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <KPICard
            title="Средний попуск"
            value={formatNumber(kpiData.avgOutflow)}
            unit={unitLabel}
            icon={<BarChart3 className="w-6 h-6" />}
          />
          <KPICard
            title="Средний объём"
            value={formatNumber(kpiData.avgVolume)}
            unit={unitLabel}
            icon={<Droplets className="w-6 h-6" />}
          />
          <KPICard
            title="Время добегания"
            value={kpiData.avgLag.toString()}
            unit="дней"
            icon={<Calendar className="w-6 h-6" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Динамика объёма</h3>
            {volumeData.length > 0 ? (
              <VolumeChart
                data={volumeData}
                title=""
                yAxisLabel={unitLabel}
                height={350}
              />
            ) : (
              <p className="text-gray-400 text-center py-20">Нет данных</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Баланс приток/попуск</h3>
            {inflowData.length > 0 && outflowData.length > 0 ? (
              <BalanceChart
                inflowData={inflowData}
                outflowData={outflowData}
                title=""
                yAxisLabel={unitLabel}
                height={350}
              />
            ) : (
              <p className="text-gray-400 text-center py-20">Нет данных</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-xl border border-cyan-500/30">
          <h3 className="text-lg font-bold text-white mb-4">Сезонность (средние значения по месяцам)</h3>
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

        {lagAnalysisData && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-xl border border-cyan-500/30">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Трассировка потоков и лаг-анализ</h3>
            <LagAnalysis
              sourceData={lagAnalysisData.sourceData}
              targetData={lagAnalysisData.targetData}
              lag={lagAnalysisData.lag}
              correlation={lagAnalysisData.correlation}
              sourceLabel="Попуск Бахри Точик"
              targetLabel="Приток Шардара"
              height={400}
            />
          </div>
        )}

        <footer className="text-center text-gray-400 text-xs sm:text-sm mt-6 sm:mt-8 pb-4">
          <p>Дашборд водного баланса бассейна реки Сырдарья © 2025</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
