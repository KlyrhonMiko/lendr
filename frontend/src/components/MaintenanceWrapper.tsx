'use client';

import React, { useState, useEffect } from 'react';
import { MaintenanceOverlay } from '@/components/MaintenanceOverlay';

export function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);

  useEffect(() => {
    const active = window.sessionStorage.getItem('powergold:maintenance:active') === 'true';
    const storedMessage = window.sessionStorage.getItem('powergold:maintenance:message');
    if (active) {
      setIsMaintenance(true);
      setMaintenanceMessage(storedMessage);
    }
  }, []);

  useEffect(() => {
    const handleMaintenance = (event: Event) => {
      const message = (event as CustomEvent<string | undefined>).detail || null;
      setIsMaintenance(true);
      setMaintenanceMessage(message);
    };

    const handleMaintenanceEnded = () => {
      setIsMaintenance(false);
      setMaintenanceMessage(null);
    };

    window.addEventListener('powergold:maintenance-started', handleMaintenance as EventListener);
    window.addEventListener('powergold:maintenance-ended', handleMaintenanceEnded);

    return () => {
      window.removeEventListener('powergold:maintenance-started', handleMaintenance as EventListener);
      window.removeEventListener('powergold:maintenance-ended', handleMaintenanceEnded);
    };
  }, []);

  return (
    <>
      {isMaintenance ? <MaintenanceOverlay message={maintenanceMessage} /> : children}
    </>
  );
}
