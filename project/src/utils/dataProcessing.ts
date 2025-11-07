import { Measurement } from '../types';

export const convertM3sToMillionM3 = (valueM3s: number, days: number = 1): number => {
  const secondsInDay = 86400;
  const m3PerDay = valueM3s * secondsInDay * days;
  return m3PerDay / 1_000_000;
};

export const isValidValue = (value: number | string): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized === '' || normalized === 'нет данных' || normalized === 'no data' || normalized === 'null' || normalized === 'nan') {
      return false;
    }
    const num = Number(value);
    return !isNaN(num) && isFinite(num);
  }
  return !isNaN(value) && isFinite(value);
};

export const parseValue = (value: number | string): number | null => {
  if (!isValidValue(value)) return null;
  return typeof value === 'string' ? parseFloat(value) : value;
};

export const getWaterYearDates = (waterYear: string): { start: Date; end: Date } => {
  const [startYear, endYear] = waterYear.split('/').map(Number);
  return {
    start: new Date(startYear, 9, 1),
    end: new Date(endYear, 8, 30)
  };
};

export const filterByPeriod = (
  data: Measurement[],
  period: 'vegetation' | 'inter-vegetation' | 'full-year' | 'custom',
  customStartDate?: string,
  customEndDate?: string
): Measurement[] => {
  if (period === 'full-year') return data;

  if (period === 'custom' && customStartDate && customEndDate) {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);

    return data.filter(item => {
      const date = new Date(item.Date);
      return date >= start && date <= end;
    });
  }

  return data.filter(item => {
    const date = new Date(item.Date);
    const month = date.getMonth();

    if (period === 'vegetation') {
      return month >= 3 && month <= 8;
    } else {
      return month >= 9 || month <= 2;
    }
  });
};

export const aggregateData = (
  data: Measurement[],
  aggregation: 'day' | 'week' | 'decade' | 'month'
): { date: string; value: number }[] => {
  if (aggregation === 'day') {
    return data
      .map(item => ({
        date: item.Date,
        value: parseValue(item.Value)
      }))
      .filter(item => item.value !== null)
      .map(item => ({
        date: item.date,
        value: item.value as number
      }));
  }

  const grouped = new Map<string, number[]>();

  data.forEach(item => {
    const date = new Date(item.Date);
    let key: string;

    if (aggregation === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (aggregation === 'decade') {
      const day = date.getDate();
      let decadeNum: number;
      if (day <= 10) {
        decadeNum = 1;
      } else if (day <= 20) {
        decadeNum = 11;
      } else {
        decadeNum = 21;
      }
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(decadeNum).padStart(2, '0')}`;
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    }

    const value = parseValue(item.Value);
    if (value !== null) {
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(value);
    }
  });

  return Array.from(grouped.entries())
    .map(([date, values]) => ({
      date,
      value: values.reduce((a, b) => a + b, 0) / values.length
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const calculateCrossCorrelation = (
  series1: number[],
  series2: number[],
  maxLag: number = 30
): { lag: number; correlation: number } => {
  let bestLag = 0;
  let bestCorr = -1;

  const mean1 = series1.reduce((a, b) => a + b, 0) / series1.length;
  const mean2 = series2.reduce((a, b) => a + b, 0) / series2.length;

  for (let lag = 0; lag <= maxLag; lag++) {
    if (lag >= series1.length || lag >= series2.length) break;

    let num = 0;
    let den1 = 0;
    let den2 = 0;
    const n = Math.min(series1.length - lag, series2.length);

    for (let i = 0; i < n; i++) {
      const x = series1[i + lag] - mean1;
      const y = series2[i] - mean2;
      num += x * y;
      den1 += x * x;
      den2 += y * y;
    }

    const corr = num / Math.sqrt(den1 * den2);

    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  return { lag: bestLag, correlation: bestCorr };
};

export const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};
