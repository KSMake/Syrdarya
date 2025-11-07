import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  unit: string;
  change?: number;
  icon: React.ReactNode;
}

export const KPICard = ({ title, value, unit, change, icon }: KPICardProps) => {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="text-cyan-400 scale-90 sm:scale-100">{icon}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change >= 0 ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <h3 className="text-gray-400 text-xs sm:text-sm font-medium mb-2">{title}</h3>
      <div className="flex items-baseline gap-1 sm:gap-2">
        <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-white break-all">{value}</span>
        <span className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );
};
