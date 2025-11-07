import { useEffect, useRef } from 'react';
import { ChartDataPoint } from '../types';
import { formatDate, formatNumber } from '../utils/dataProcessing';

interface LagAnalysisProps {
  sourceData: ChartDataPoint[];
  targetData: ChartDataPoint[];
  lag: number;
  correlation: number;
  sourceLabel: string;
  targetLabel: string;
  height?: number;
}

export const LagAnalysis = ({
  sourceData,
  targetData,
  lag,
  correlation,
  sourceLabel,
  targetLabel,
  height = 400
}: LagAnalysisProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || sourceData.length === 0 || targetData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 80, right: 40, bottom: 60, left: 80 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    const shiftedSource = sourceData.map((point, i) => ({
      ...point,
      date: targetData[Math.min(i + lag, targetData.length - 1)]?.date || point.date
    }));

    const allValues = [...sourceData, ...targetData, ...shiftedSource].map(d => d.value);
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
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

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    const step = Math.ceil(targetData.length / 8);
    for (let i = 0; i < targetData.length; i += step) {
      const x = padding.left + (chartWidth / (targetData.length - 1)) * i;
      ctx.save();
      ctx.translate(x, padding.top + chartHeight + 20);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(formatDate(targetData[i].date), 0, 0);
      ctx.restore();
    }

    const drawLine = (dataset: ChartDataPoint[], color: string, lineWidth: number = 2, dashPattern?: number[]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      if (dashPattern) {
        ctx.setLineDash(dashPattern);
      }

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
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      dataset.forEach((point, i) => {
        const x = padding.left + (chartWidth / (dataset.length - 1)) * i;
        const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    drawLine(sourceData, '#94a3b8', 2, [5, 5]);
    drawLine(targetData, '#06b6d4', 3);
    drawLine(shiftedSource, '#f59e0b', 2);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Анализ времени добегания (лаг-анализ)', rect.width / 2, 25);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText(`Лаг: ${lag} дней | Корреляция: ${correlation.toFixed(3)}`, rect.width / 2, 45);

    const legendY = 65;
    const legendItems = [
      { color: '#94a3b8', label: sourceLabel, dash: true },
      { color: '#06b6d4', label: targetLabel, dash: false },
      { color: '#f59e0b', label: `${sourceLabel} (сдвиг на ${lag}д)`, dash: false }
    ];

    let legendX = rect.width / 2 - 200;
    legendItems.forEach(item => {
      ctx.strokeStyle = item.color;
      ctx.fillStyle = item.color;
      ctx.lineWidth = 2;

      if (item.dash) {
        ctx.setLineDash([5, 5]);
      }

      ctx.beginPath();
      ctx.moveTo(legendX, legendY - 4);
      ctx.lineTo(legendX + 15, legendY - 4);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 20, legendY);
      legendX += 130;
    });

    ctx.save();
    ctx.translate(20, rect.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Расход / Объем', 0, 0);
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

      const dataIndex = Math.round(((x - padding.left) / chartWidth) * (targetData.length - 1));
      if (dataIndex >= 0 && dataIndex < targetData.length) {
        const target = targetData[dataIndex];
        const source = sourceData[dataIndex];
        const shifted = shiftedSource[dataIndex];

        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.left = `${e.clientX + 10}px`;
          tooltipRef.current.style.top = `${e.clientY - 10}px`;

          tooltipRef.current.innerHTML = `
            <div class="text-xs">
              <div class="font-semibold text-cyan-300 mb-1">${formatDate(target.date)}</div>
              <div class="text-cyan-400">${targetLabel}: ${formatNumber(target.value)}</div>
              ${source ? `<div class="text-gray-400">${sourceLabel}: ${formatNumber(source.value)}</div>` : ''}
              ${shifted ? `<div class="text-orange-400">${sourceLabel} (сдвиг): ${formatNumber(shifted.value)}</div>` : ''}
            </div>
          `;
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [sourceData, targetData, lag, correlation, sourceLabel, targetLabel]);

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
