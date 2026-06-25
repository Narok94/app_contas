
import React from 'react';

const StatCardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface dark:bg-dark-surface p-4 rounded-lg shadow-lg animate-skeleton-pulse">
      <div className="h-8 w-3/4 bg-gray-200 dark:bg-dark-surface-light rounded-md mb-2"></div>
      <div className="h-4 w-1/2 bg-gray-200 dark:bg-dark-surface-light rounded-md"></div>
    </div>
  );
};

export default StatCardSkeleton;