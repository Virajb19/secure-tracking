import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 7 }: TableSkeletonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="text-left py-3 px-4">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-800">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="py-4 px-4">
                  <Skeleton className="h-4 w-full max-w-[150px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Skeleton for table rows only (keeps headers visible)
interface TableRowsSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableRowsSkeleton({ rows = 8, columns = 7 }: TableRowsSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-200 dark:border-slate-800">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="py-4 px-5">
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
