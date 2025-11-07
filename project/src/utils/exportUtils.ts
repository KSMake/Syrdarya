import { Measurement, ChartDataPoint } from '../types';

export const exportToCSV = (
  data: Measurement[],
  filename: string = 'water_data.csv'
): void => {
  if (data.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  const headers = ['Дата', 'Объект', 'Станция', 'Показатель', 'Время', 'Значение', 'Единица', 'Сезон'];
  const csvRows = [headers.join(',')];

  data.forEach(row => {
    const values = [
      row.Date,
      `"${row.Reservoir}"`,
      row.Station ? `"${row.Station}"` : '',
      `"${row.Measure}"`,
      row.TimeOfDay,
      row.Value,
      row.Unit,
      row.Season
    ];
    csvRows.push(values.join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportChartToCSV = (
  data: ChartDataPoint[],
  title: string,
  filename: string = 'chart_data.csv'
): void => {
  if (data.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  const headers = ['Дата', 'Значение', 'Метка'];
  const csvRows = [headers.join(',')];

  data.forEach(row => {
    const values = [
      row.date,
      row.value,
      row.label || ''
    ];
    csvRows.push(values.join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generatePDFReport = async (
  data: {
    title: string;
    filters: any;
    kpiData: any;
    measurements: Measurement[];
  }
): Promise<void> => {
  const { title, filters, kpiData, measurements } = data;

  const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #0891b2;
      border-bottom: 3px solid #0891b2;
      padding-bottom: 10px;
    }
    h2 {
      color: #0e7490;
      margin-top: 30px;
    }
    .filters {
      background: #f1f5f9;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .filter-item {
      margin: 8px 0;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .kpi-card {
      background: #e0f2fe;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #0891b2;
    }
    .kpi-value {
      font-size: 24px;
      font-weight: bold;
      color: #0e7490;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #0891b2;
      color: white;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #cbd5e1;
      color: #64748b;
      font-size: 12px;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Дата формирования: ${new Date().toLocaleString('ru-RU')}</p>

  <div class="filters">
    <h2>Параметры отчёта</h2>
    <div class="filter-item"><strong>Тип объекта:</strong> ${filters.objectType}</div>
    <div class="filter-item"><strong>Объект:</strong> ${filters.objectName}</div>
    <div class="filter-item"><strong>Показатель:</strong> ${filters.measureType}</div>
    <div class="filter-item"><strong>Водохозяйственный год:</strong> ${filters.waterYear}</div>
    <div class="filter-item"><strong>Период:</strong> ${filters.period}</div>
    <div class="filter-item"><strong>Агрегация:</strong> ${filters.aggregation}</div>
  </div>

  ${kpiData ? `
  <h2>Ключевые показатели</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div>Средний приток</div>
      <div class="kpi-value">${kpiData.avgInflow.toFixed(2)} м³/с</div>
    </div>
    <div class="kpi-card">
      <div>Средний попуск</div>
      <div class="kpi-value">${kpiData.avgOutflow.toFixed(2)} м³/с</div>
    </div>
    <div class="kpi-card">
      <div>Средний объём</div>
      <div class="kpi-value">${kpiData.avgVolume.toFixed(2)} млн м³</div>
    </div>
  </div>
  ` : ''}

  <h2>Данные</h2>
  <table>
    <thead>
      <tr>
        <th>Дата</th>
        <th>Объект</th>
        <th>Показатель</th>
        <th>Значение</th>
        <th>Единица</th>
      </tr>
    </thead>
    <tbody>
      ${measurements.slice(0, 100).map(m => `
        <tr>
          <td>${new Date(m.Date).toLocaleDateString('ru-RU')}</td>
          <td>${m.Reservoir}</td>
          <td>${m.Measure}</td>
          <td>${m.Value}</td>
          <td>${m.Unit}</td>
        </tr>
      `).join('')}
      ${measurements.length > 100 ? `<tr><td colspan="5"><em>Показано первых 100 записей из ${measurements.length}</em></td></tr>` : ''}
    </tbody>
  </table>

  <div class="warning">
    <strong>⚠️ Внимание:</strong> Данные могут содержать неточности. Процесс очистки и верификации данных продолжается.
  </div>

  <div class="footer">
    <p>Дашборд водного баланса бассейна реки Сырдарья © 2025</p>
    <p>Данный отчёт сформирован автоматически на основе имеющихся данных</p>
  </div>

  <div class="no-print" style="margin-top: 30px;">
    <button onclick="window.print()" style="background: #0891b2; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
      Печать / Сохранить как PDF
    </button>
  </div>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(reportHTML);
    printWindow.document.close();
  }
};
