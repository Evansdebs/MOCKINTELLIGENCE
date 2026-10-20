import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div
          className={`${sizeMap[size]} border-blue-600/20 border-t-blue-600 rounded-full animate-spin`}
        />
        <div
          className={`absolute inset-0 rounded-full animate-ping opacity-20 bg-blue-500 pointer-events-none`}
        />
      </div>
      {label && (
        <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
};

interface SectionSkeletonProps {
  rows?: number;
  height?: string;
  title?: string;
  type?: 'card' | 'table' | 'chart' | 'grid';
}

export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  rows = 4,
  height = 'h-64',
  title,
  type = 'card',
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4 animate-pulse">
      {/* Skeleton Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="space-y-1.5">
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded-full" />
          {title ? (
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              {title}
            </p>
          ) : (
            <div className="h-3 w-56 bg-slate-100 dark:bg-slate-800 rounded-full" />
          )}
        </div>
        <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>

      {/* Skeleton Content depending on type */}
      {type === 'chart' && (
        <div className={`${height} w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col justify-end p-6 gap-3`}>
          <div className="flex items-end justify-between gap-3 h-full pt-8">
            {[40, 65, 30, 85, 55, 90, 70, 45, 60].map((h, i) => (
              <div key={i} className="flex-1 bg-slate-200 dark:bg-slate-700/60 rounded-t-lg transition-all" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
      )}

      {type === 'table' && (
        <div className="space-y-3 pt-2">
          <div className="h-8 w-full bg-slate-100 dark:bg-slate-800 rounded-lg" />
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-10 w-full bg-slate-50 dark:bg-slate-800/40 rounded-lg flex items-center px-4 gap-4">
              <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {type === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {type === 'card' && (
        <div className={`${height} w-full bg-slate-50/70 dark:bg-slate-800/40 rounded-xl flex flex-col items-center justify-center gap-3 border border-dashed border-slate-200 dark:border-slate-800`}>
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-400">Loading module details...</span>
        </div>
      )}
    </div>
  );
};
