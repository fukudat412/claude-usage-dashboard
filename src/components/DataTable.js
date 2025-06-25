import React from 'react';

const DataTable = ({ data, columns, onRowClick, formatDate, formatBytes, formatNumber }) => {
  if (!data || data.length === 0) {
    return <div className="no-data">表示するデータがありません</div>;
  }

  const formatCellValue = (value, column) => {
    if (value === null || value === undefined) {
      return '-';
    }

    switch (column.type) {
      case 'date':
        return formatDate(value);
      case 'bytes':
        return formatBytes(value);
      case 'number':
        return formatNumber(value);
      case 'currency':
        return `$${value}`;
      default:
        return value;
    }
  };

  return (
    <div className="table-container">
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
              key={row.id || index}
              onClick={() => onRowClick && onRowClick(row)}
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