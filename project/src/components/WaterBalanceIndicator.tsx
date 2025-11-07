interface WaterBalanceIndicatorProps {
  inflow: number;
  outflow: number;
  unit: string;
}

export const WaterBalanceIndicator = ({ inflow, outflow, unit }: WaterBalanceIndicatorProps) => {
  const balance = inflow - outflow;
  const balancePercent = inflow > 0 ? (balance / inflow) * 100 : 0;
  const isPositive = balance >= 0;

  const getBalanceStatus = () => {
    if (Math.abs(balancePercent) < 5) return { label: 'Сбалансировано', color: 'emerald' };
    if (isPositive) return { label: 'Накопление', color: 'blue' };
    return { label: 'Сработка', color: 'amber' };
  };

  const status = getBalanceStatus();

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-cyan-500/30">
      <h4 className="text-sm font-medium text-gray-300 mb-4">Водный баланс</h4>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
            <span className="text-sm text-gray-400">Приток</span>
          </div>
          <span className="text-lg font-bold text-cyan-400">
            {inflow.toFixed(2)} <span className="text-xs">{unit}</span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="text-sm text-gray-400">Попуск</span>
          </div>
          <span className="text-lg font-bold text-amber-400">
            {outflow.toFixed(2)} <span className="text-xs">{unit}</span>
          </span>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 bg-${status.color}-500 rounded-full`}></div>
              <span className="text-sm text-gray-400">Баланс</span>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold text-${status.color}-400`}>
                {isPositive && '+'}{balance.toFixed(2)} <span className="text-xs">{unit}</span>
              </div>
              <div className="text-xs text-gray-500">{balancePercent.toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                status.color === 'emerald' ? 'bg-emerald-500' :
                status.color === 'blue' ? 'bg-blue-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(Math.abs(balancePercent), 100)}%` }}
            ></div>
          </div>

          <div className={`mt-2 text-center text-sm font-medium ${
            status.color === 'emerald' ? 'text-emerald-400' :
            status.color === 'blue' ? 'text-blue-400' : 'text-amber-400'
          }`}>
            {status.label}
          </div>
        </div>
      </div>
    </div>
  );
};
