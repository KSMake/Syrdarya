import { useEffect, useRef } from 'react';
import { ChartDataPoint } from '../types';
import { formatDate, formatNumber } from '../utils/dataProcessing';

interface BalanceChartProps {
  inflowData: ChartDataPoint[];
  outflowData: ChartDataPoint[];
  title: string;
  yAxisLabel: string;
  height?: number;
}

export const BalanceChart = ({ inflowData, outflowData, title, yAxisLabel, height = 400 }: BalanceChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || inflowData.length === 0 || outflowData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 60, right: 40, bottom: 60, left: 80 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    const balanceData = inflowData.map((point, i) => ({
      date: point.date,
      value: point.value - (outflowData[i]?.value || 0)
    }));

    const allValues = [...inflowData, ...outflowData, ...balanceData].map(d => d.value);
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
    const valueRange = maxValue - minValue;

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      const value = maxValue - (valueRange / 5) * i;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatNumber(value, 0), padding.left - 10, y + 4);
    }

    const zeroY = padding.top + chartHeight - ((0 - minValue) / valueRange) * chartHeight;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(padding.left + chartWidth, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    const step = Math.ceil(inflowData.length / 8);
    for (let i = 0; i < inflowData.length; i += step) {
      const x = padding.left + (chartWidth / (inflowData.length - 1)) * i;
      ctx.save();
      ctx.translate(x, padding.top + chartHeight + 20);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(formatDate(inflowData[i].date), 0, 0);
      ctx.restore();
    }

    const drawLine = (dataset: ChartDataPoint[], color: string, lineWidth: number = 2) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      dataset.forEach((point, i) => {
        const x = padding.left + (chartWidth / (dataset.length - 1)) * i;
        const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      ctx.fillStyle = color;
      dataset.forEach((point, i) => {
        const x = padding.left + (chartWidth / (dataset.length - 1)) * i;
        const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    drawLine(inflowData, '#10b981', 3);
    drawLine(outflowData, '#ef4444', 3);
    drawLine(balanceData, '#a855f7', 2);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, rect.width / 2, 25);

    const legendY = 45;
    const legendItems = [
      { color: '#10b981', label: 'Приток' },
      { color: '#ef4444', label: 'Попуск' },
      { color: '#a855f7', label: 'Баланс' }
    ];

    let legendX = rect.width / 2 - 120;
    legendItems.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, legendY - 8, 15, 3);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 20, legendY);
      legendX += 80;
    });

    ctx.save();
    ctx.translate(20, rect.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x < padding.left || x > padding.left + chartWidth || y < padding.top || y > padding.top + chartHeight) {
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
        return;
      }

      const dataIndex = Math.round(((x - padding.left) / chartWidth) * (inflowData.length - 1));
      if (dataIndex >= 0 && dataIndex < inflowData.length) {
        const inflow = inflowData[dataIndex];
        const outflow = outflowData[dataIndex];
        const balance = balanceData[dataIndex];

        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.left = `${e.clientX + 10}px`;
          tooltipRef.current.style.top = `${e.clientY - 10}px`;

          tooltipRef.current.innerHTML = `
            <div class="text-xs">
              <div class="font-semibold text-cyan-300 mb-1">${formatDate(inflow.date)}</div>
              <div class="text-green-400">Приток: ${formatNumber(inflow.value)} ${yAxisLabel}</div>
              <div class="text-red-400">Попуск: ${formatNumber(outflow.value)} ${yAxisLabel}</div>
              <div class="text-purple-400">Баланс: ${formatNumber(balance.value)} ${yAxisLabel}</div>
            </div>
          `;
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [inflowData, outflowData, title, yAxisLabel]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="cursor-crosshair"
      />
      <div
        ref={tooltipRef}
        className="fixed hidden bg-slate-900 border border-cyan-500/50 rounded-lg px-3 py-2 shadow-xl z-50 pointer-events-none"
      />
    </div>
  );
};
