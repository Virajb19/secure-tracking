'use client';

import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

interface CustomToastProps {
  message: string;
  type: 'success' | 'error';
  duration?: number;
  onClose: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
}

const CustomToast = ({ message, type, duration = 3000, onClose }: CustomToastProps) => {
  const isSuccess = type === 'success';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`relative overflow-hidden rounded-lg shadow-2xl ${
        isSuccess 
          ? 'bg-linear-to-r from-emerald-600 to-green-600' 
          : 'bg-linear-to-r from-red-600 to-rose-600'
      } min-w-[320px] max-w-105`}
    >
      <div className="flex items-center gap-3 p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-6 w-6 text-white" />
          ) : (
            <XCircle className="h-6 w-6 text-white" />
          )}
        </motion.div>
        
        <div className="flex-1">
          <p className="text-white font-medium text-sm">{message}</p>
        </div>
        
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Animated progress bar */}
      <div className="h-1 bg-white/20 w-full">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`h-full ${isSuccess ? 'bg-white' : 'bg-white/80'}`}
        />
      </div>
    </motion.div>
  );
};

// Custom toast functions
export const showSuccessToast = (message: string, duration: number = 7000, position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center' = 'bottom-right') => {
  toast.custom(
    (t) => (
      <CustomToast
        message={message}
        type="success"
        duration={duration}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration, position }
  );
};

export const showErrorToast = (message: string, duration: number = 10000, position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center' = 'bottom-right') => {
  toast.custom(
    (t) => (
      <CustomToast
        message={message}
        type="error"
        duration={duration}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration, position }
  );
};

export default CustomToast;
