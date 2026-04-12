import { cn } from '@/lib/utils';

interface Props {
  type: 'danger' | 'warning' | 'info';
  title: string;
  message?: string;
  className?: string;
}

const styles = {
  danger: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const icons = { danger: '🔴', warning: '⚠️', info: 'ℹ️' };

export function AlertBadge({ type, title, message, className }: Props) {
  return (
    <div className={cn('border rounded-lg p-3 flex gap-2', styles[type], className)}>
      <span className="shrink-0 text-lg">{icons[type]}</span>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        {message && <p className="text-xs mt-0.5 opacity-80">{message}</p>}
      </div>
    </div>
  );
}
