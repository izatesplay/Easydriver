import React from 'react';
import { RequestStatus } from '../types';

interface StatusBadgeProps {
  status: RequestStatus;
  id?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, id }) => {
  let text = '';
  let colorClasses = '';

  switch (status) {
    case 'pending':
      text = 'در انتظار تایید';
      colorClasses = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
      break;
    case 'approved':
      text = 'تایید شده';
      colorClasses = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';
      break;
    case 'assigned':
      text = 'ارجاع شده به تکنسین';
      colorClasses = 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50';
      break;
    case 'in_progress':
      text = 'در حال انجام';
      colorClasses = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
      break;
    case 'completed':
      text = 'کامل شده';
      colorClasses = 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      break;
    case 'cancelled':
      text = 'لغو شده';
      colorClasses = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50';
      break;
    default:
      text = status;
      colorClasses = 'bg-gray-100 text-gray-800 border-gray-200';
  }

  return (
    <span
      id={id || `status-${status}`}
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full border ${colorClasses} shadow-xxs transition-colors duration-200`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse shrink-0" />
      <span>{text}</span>
    </span>
  );
};
