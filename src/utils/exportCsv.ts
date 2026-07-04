import { TableColumn } from '../components/DataTable';

// CSVセルのエスケープ（カンマ・引用符・改行を含む場合はクォートする）
const escapeCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

// 表示用フォーマッタは使わず、機械可読な生の値を書き出す
// （数値は桁区切りなし、通貨は数値のみ、日付は元のISO表現）
const cellValue = (value: unknown, column: TableColumn): string => {
  if (value === null || value === undefined) return '';
  switch (column.type) {
    case 'number':
    case 'bytes':
      return String(typeof value === 'number' ? value : Number(value) || 0);
    case 'currency': {
      const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      return num.toFixed(4);
    }
    default:
      return String(value);
  }
};

/**
 * テーブルデータをCSVとしてダウンロードさせる。
 * Excelで文字化けしないようUTF-8 BOM付き。
 */
export const exportCsv = (
  columns: TableColumn[],
  rows: Record<string, any>[],
  filename: string
): void => {
  const header = columns.map((column) => escapeCell(column.title)).join(',');
  const lines = rows.map((row) =>
    columns.map((column) => escapeCell(cellValue(row[column.key], column))).join(',')
  );
  const csv = `﻿${[header, ...lines].join('\r\n')}\r\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
