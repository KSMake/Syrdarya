export interface Measurement {
  id: string;
  Reservoir: string;
  Station: string | null;
  Date: string;
  Measure: string;
  TimeOfDay: string;
  Value: number | string;
  Unit: string;
  Season: string;
}

export interface FilterState {
  objectType: 'reservoir' | 'canal' | 'hes' | 'hydropost';
  objectName: string;
  measureType: string;
  waterYear: string;
  period: 'vegetation' | 'inter-vegetation' | 'full-year' | 'custom';
  aggregation: 'day' | 'week' | 'decade' | 'month';
  unitType: 'm3/s' | 'million-m3';
  comparisonYears: string[];
  compareWithPrevious: boolean;
  customStartDate?: string;
  customEndDate?: string;
}

export interface KPIData {
  avgInflow: number;
  avgOutflow: number;
  avgVolume: number;
  avgLag: number;
  yearChange: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  isPrevious?: boolean;
}

export interface LagAnalysisResult {
  lag: number;
  correlation: number;
  sourceData: ChartDataPoint[];
  targetData: ChartDataPoint[];
  shiftedData: ChartDataPoint[];
}

export interface ObjectTypeConfig {
  type: 'reservoir' | 'canal' | 'hes' | 'hydropost';
  label: string;
  measures: string[];
}
