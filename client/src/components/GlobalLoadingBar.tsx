import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export const GlobalLoadingBar: React.FC = () => {
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    const unsubscribe = api.subscribeToLoading((count) => {
      setActiveRequests(count);
    });
    return unsubscribe;
  }, []);

  if (activeRequests === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 animate-progress origin-left w-full shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
    </div>
  );
};
