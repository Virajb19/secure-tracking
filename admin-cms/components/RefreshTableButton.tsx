'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { QueryKey } from '@tanstack/react-query';

interface RefreshTableButtonProps {
  queryKey: QueryKey;
  isFetching?: boolean;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
  className?: string;
}

export function RefreshTableButton({ 
  queryKey, 
  isFetching = false,
  size = 'sm',
  variant = 'outline',
  className = ''
}: RefreshTableButtonProps) {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={`text-blue-600 border-2 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 ${className} disabled:cursor-not-allowed`}
      onClick={handleRefresh}
      disabled={isFetching}
    >
      <motion.div
        animate={isFetching ? { rotate: 360 } : { rotate: 0 }}
        transition={isFetching ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
      >
        <RefreshCw className="h-4 w-4" />
      </motion.div>
      <span className="ml-2">{isFetching ? 'Refreshing...' : 'Refresh'}</span>
    </Button>
  );
}
