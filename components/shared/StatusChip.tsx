import React from 'react';
import { RunStatus } from '../../types';

interface StatusChipProps {
  status: RunStatus;
}

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const baseClasses = "inline-block px-3 py-1 text-xs font-bold rounded-full text-white capitalize";
  
  const statusStyles: Record<RunStatus, string> = {
    scheduled: 'bg-blue-500',
    running: 'bg-[var(--color-secondary)] animate-pulse',
    success: 'bg-green-600',
    error: 'bg-red-600',
    skipped: 'bg-gray-500',
  };

  return <span className={`${baseClasses} ${statusStyles[status]}`}>{status}</span>;
};

export default StatusChip;
