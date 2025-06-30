import React from 'react';

export interface TableColumn {
  key: string;
  title: string;
  type?: 'text' | 'date' | 'bytes' | 'number' | 'currency';
  className?: string;
}

export interface DataTableProps {
  data: Record<string, any>[];
  columns: TableColumn[];
  onRowClick?: (row: Record<string, any>) => void;
  formatDate: (date: string | Date) => string;
  formatBytes: (bytes: number) => string;
  formatNumber: (value: number) => string;
  loading?: boolean;
  className?: string;
}

const DataTable: React.FC<DataTableProps> = ({ 
  data, 
  columns, 
  onRowClick, 
  formatDate, 
  formatBytes, 
  formatNumber, 
  loading = false,
  className = ''
}) => {
  const formatCellValue = (value: any, column: TableColumn): string => {
    if (value === null || value === undefined) {
      return '-';
    }

    switch (column.type) {
      case 'date':
        return formatDate(value);
      case 'bytes':
        return formatBytes(typeof value === 'number' ? value : 0);
      case 'number':
        return formatNumber(typeof value === 'number' ? value : 0);
      case 'currency':
        const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
        return `$${numValue.toFixed(2)}`;
      default:
        return String(value);
    }
  };

  if (loading) {
    return (
      <div className="table-container loading">
        <p>データを読み込んでいます...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-container no-data">
        <p>表示するデータがありません</p>
      </div>
    );
  }

  return (
    <div className={`table-container ${className}`}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key} className={column.className || ''}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr 
              key={row.id || `row-${index}`}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map(column => (
                <td key={column.key} className={column.className || ''}>
                  {formatCellValue(row[column.key], column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;