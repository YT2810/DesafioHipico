'use client';

import { useState, useEffect } from 'react';

export interface BcvStatus {
  rateVes?: number;
  updatedAt?: string;
  ageHours?: number;
  stale: boolean;
  message?: string;
}

export interface DayStats { date: string; registrations: number; logins: number; }

export interface Tokenomics {
  txVolume30d: { spent: number; income: number; count: number };
  txByType: { type: string; count: number; volume: number }[];
  topups: {
    pending: number;
    approved: { count: number; usd: number; gold: number };
    rejected: { count: number; usd: number; gold: number };
  };
  meetings: number;
  forecasts: number;
}

export interface AdminStats {
  totalUsers: number;
  roles: { customer: number; handicapper: number; staff: number; admin: number };
  gold: { total: number; usersWithGold: number; usersNoGold: number; avg: number };
  dailyStats: DayStats[];
  recentUsers: { _id: string; email?: string; alias?: string; roles: string[]; balance: { golds: number }; createdAt: string; lastLoginDate?: string }[];
  tokenomics: Tokenomics;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

export function useBcvStatus() {
  const [bcv, setBcv] = useState<BcvStatus | null>(null);

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then(r => r.json())
      .then(d => setBcv(d))
      .catch(() => setBcv({ stale: true, message: 'No se pudo verificar la tasa BCV' }));
  }, []);

  return bcv;
}

export function bcvAlertNeeded(status: BcvStatus | null): boolean {
  if (!status) return false;
  if (!status.stale) return false;
  const day = new Date().getDay();
  if ([0, 1, 6].includes(day)) return false;
  return true;
}

export function fmtDay(iso: string) {
  const [, , dd] = iso.split('-');
  const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${names[new Date(iso + 'T12:00:00').getDay()]} ${dd}`;
}
