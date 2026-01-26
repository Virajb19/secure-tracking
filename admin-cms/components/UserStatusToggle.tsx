'use client';

import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useToggleUserStatus } from '@/services/user.service';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';

interface UserStatusToggleProps {
  userId: string;
  isActive: boolean;
}

export function UserStatusToggle({
  userId,
  isActive,
}: UserStatusToggleProps) {
  const toggleStatusMutation = useToggleUserStatus();

  const handleToggleStatus = async () => {
    const newStatus = !isActive;
    try {
      await toggleStatusMutation.mutateAsync({
        userId,
        isActive: newStatus,
      });
      showSuccessToast(
        newStatus 
          ? 'User activated successfully!' 
          : 'User deactivated successfully!',
        3000
      );
    } catch (err) {
      console.error('Failed to toggle user status', err);
      showErrorToast('Failed to update user status. Please try again.');
    }
  };

  return (
    <button
      onClick={handleToggleStatus}
      disabled={toggleStatusMutation.isPending}
      className="focus:outline-none"
    >
      <Badge
        variant={isActive ? 'success' : 'destructive'}
        className="cursor-pointer hover:opacity-80 transition-opacity min-w-18 flex justify-center"
      >
        {toggleStatusMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isActive ? (
          'Active'
        ) : (
          'Inactive'
        )}
      </Badge>
    </button>
  );
}
