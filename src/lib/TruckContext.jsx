import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TruckContext = createContext(null);

export function TruckProvider({ children }) {
  const [truck, setTruckState] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedTruck');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showTruckSelector, setShowTruckSelector] = useState(false);

  const setTruck = useCallback((t) => {
    setTruckState(t);
    if (t) {
      localStorage.setItem('selectedTruck', JSON.stringify(t));
    } else {
      localStorage.removeItem('selectedTruck');
    }
  }, []);

  return (
    <TruckContext.Provider value={{ truck, setTruck, showTruckSelector, setShowTruckSelector }}>
      {children}
    </TruckContext.Provider>
  );
}

export function useTruck() {
  const ctx = useContext(TruckContext);
  if (!ctx) throw new Error('useTruck must be used within TruckProvider');
  return ctx;
}
