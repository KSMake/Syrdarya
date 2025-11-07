import { useEffect, useRef } from 'react';
import { formatNumber } from '../utils/dataProcessing';

interface SeasonalityChartProps {
  data: { month: string; value: number }[];
  title: string;
  yAxisLabel: string;
  height?: number;
}

export const SeasonalityChart = ({ data, title, yAxisLabel, height = 400 }: SeasonalityChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const valueRange = maxValue - minValue || 1;

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

    const barWidth = chartWidth / data.length * 0.7;
    const barGap = chartWidth / data.length * 0.3;

    data.forEach((item, i) => {
      const x = padding.left + (chartWidth / data.length) * i + barGap / 2;
      const barHeight = ((item.value - minValue) / valueRange) * chartHeight;
      const y = padding.top + chartHeight - barHeight;

      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, '#06b6d4');
      gradient.addColorStop(1, '#0891b2');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, barWidth, barHeight);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.month, x + barWidth / 2, padding.top + chartHeight + 20);
    });

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, rect.width / 2, 20);

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

      const dataIndex = Math.floor((x - padding.left) / (chartWidth / data.length));
      if (dataIndex >= 0 && dataIndex < data.length) {
        const item = data[dataIndex];

        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.left = `${e.clientX + 10}px`;
          tooltipRef.current.style.top = `${e.clientY - 10}px`;

          tooltipRef.current.innerHTML = `
            <div class="text-xs">
              <div class="font-semibold text-cyan-300">${item.month}</div>
              <div class="text-white">${formatNumber(item.value)} ${yAxisLabel}</div>
            </div>
          `;
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [data, title, yAxisLabel]);

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
