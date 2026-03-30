'use client';

import React, { useState, useEffect } from 'react';
import { MaintenanceOverlay } from '@/components/MaintenanceOverlay';

export function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const handleMaintenance = () => {
      setIsMaintenance(true);
    };

    window.addEventListener('lendr:maintenance-started', handleMaintenance);

    return () => {
      window.removeEventListener('lendr:maintenance-started', handleMaintenance);
    };
  }, []);

  return (
    <>
      {isMaintenance ? <MaintenanceOverlay /> : children}
    </>
  );
}
