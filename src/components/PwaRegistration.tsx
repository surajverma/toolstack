'use client';
import { useEffect } from 'react';
export default function PwaRegistration() { useEffect(() => { if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return; navigator.serviceWorker.register('/sw.js').catch(() => undefined); }, []); return null; }
