import React from 'react';
import Card from './Card';

interface MetricProps {
  label: string;
  value: string;
  delta?: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, delta }) => {
  const isPositive = delta?.startsWith('+');
  
  return (
    <Card className="text-center transform hover:-translate-y-1 transition-transform duration-300">
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{label}</h3>
      <p className="text-3xl font-bold text-[var(--color-text-primary)] my-2">{value}</p>
      {delta && (
        <p className={`text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>{delta}</p>
      )}
    </Card>
  );
};

export default Metric;
