import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md'}) => {
    const sizeClasses = {
        sm: 'h-5 w-5',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    }
  return (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 border-pink-500 ${sizeClasses[size]}`}></div>
  );
};