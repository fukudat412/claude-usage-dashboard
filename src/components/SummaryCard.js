import React from 'react';

const SummaryCard = ({ title, value, subtitle, className = '' }) => {
  return (
    <div className={`summary-card ${className}`}>
      <h3>{title}</h3>
      <div className="summary-value">{value}</div>
      {subtitle && <div className="summary-subtitle">{subtitle}</div>}
    </div>
  );
};

export default SummaryCard;