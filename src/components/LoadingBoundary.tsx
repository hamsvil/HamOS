import React, { Suspense } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LoadingBoundary: React.FC<Props> = ({ children, fallback }) => {
  return (
    <Suspense fallback={fallback || <div className="p-4 text-gray-500">Loading...</div>}>
      {children}
    </Suspense>
  );
};
