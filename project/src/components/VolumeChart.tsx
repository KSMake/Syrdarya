import { useEffect, useRef } from 'react';
import { ChartDataPoint } from '../types';
import { formatDate, formatNumber } from '../utils/dataProcessing';

interface VolumeChartProps {
  data: ChartDataPoint[];
  comparisonData?: ChartDataPoint[];
  title: string;
  yAxisLabel: string;
  height?: number;
}

export const VolumeChart = ({ data, comparisonData, title, yAxisLabel, height = 400 }: VolumeChartProps) => {
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

    const allData = comparisonData ? [...data, ...comparisonData] : data;
    const maxValue = Math.max(...allData.map(d => d.value));
    const minValue = Math.min(...allData.map(d => d.value));
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

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    const step = Math.ceil(data.length / 8);
    for (let i = 0; i < data.length; i += step) {
      const x = padding.left + (chartWidth / (data.length - 1)) * i;
      ctx.save();
      ctx.translate(x, padding.top + chartHeight + 20);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(formatDate(data[i].date), 0, 0);
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

    drawLine(data, '#06b6d4', 3);
    if (comparisonData) {
      drawLine(comparisonData, '#f59e0b', 2);
    }

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

      const dataIndex = Math.round(((x - padding.left) / chartWidth) * (data.length - 1));
      if (dataIndex >= 0 && dataIndex < data.length) {
        const point = data[dataIndex];
        const compPoint = comparisonData?.[dataIndex];

        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.left = `${e.clientX + 10}px`;
          tooltipRef.current.style.top = `${e.clientY - 10}px`;

          let tooltipHTML = `
            <div class="text-xs">
              <div class="font-semibold text-cyan-300">${formatDate(point.date)}</div>
              <div class="text-white">${formatNumber(point.value)} ${yAxisLabel}</div>
          `;

          if (compPoint) {
            tooltipHTML += `<div class="text-orange-400 mt-1">${formatNumber(compPoint.value)} ${yAxisLabel}</div>`;
          }

          tooltipHTML += '</div>';
          tooltipRef.current.innerHTML = tooltipHTML;
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [data, comparisonData, title, yAxisLabel]);

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
