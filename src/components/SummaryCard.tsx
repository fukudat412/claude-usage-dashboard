import React from 'react';
import { SummaryCardProps } from '../types';

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtitle, className = '' }) => {
  return (
    <div className={`summary-card ${className}`}>
      <h3>{title}</h3>
      <div className="summary-value">{value}</div>
      {subtitle && <div className="summary-subtitle">{subtitle}</div>}
    </div>
  );
};

export default SummaryCard;