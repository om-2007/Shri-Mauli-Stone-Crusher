'use client';

import { useState, useMemo, useEffect, useRef, useTransition } from 'react';
import { User, AppState, UserRole, CustomerRate, KhataClient } from './types';
// Removed mock imports to lean purely on database
import LoginPage from './components/LoginPage';

const DEFAULT_OWNER: User = {
  id: 'owner-1',
  name: 'Nilesh Karande',
  role: 'OWNER',
  phone: '9370763003'
};
import Layout from './components/Layout';
import OwnerDashboard from './components/OwnerDashboard';
import AssistantDashboard from './components/AssistantDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse saved user', e);
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentUser?.role === 'ASSISTANT' && activeTab === 'salaries') {
      setActiveTab('customers');
    }
  }, [currentUser?.role, activeTab]);
  
  // App state
  const [customers, setCustomers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('customers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [maintenance, setMaintenance] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('maintenance');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [salaries, setSalaries] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('salaries');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [assistants, setAssistants] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('assistants');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [customerRates, setCustomerRates] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('customerRates');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [khataClients, setKhataClients] = useState<KhataClient[]>(() => {
    try {
      const saved = localStorage.getItem('khataClients');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [khataPayments, setKhataPayments] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('khataPayments');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [ownerProfile, setOwnerProfile] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('ownerProfile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  const [isDayStarted, setIsDayStarted] = useState(() => {
    return localStorage.getItem('isDayStarted') === 'true';
  });
  const [pendingSync, setPendingSync] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('pendingSync');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState('');
  const [isBackgroundSyncing, startBackgroundSyncTransition] = useTransition();
  const refreshPromiseRef = useRef<Promise<any> | null>(null);
  const queuedRefreshLabelRef = useRef<string | null>(null);

  // Persist state changes to localStorage
  useEffect(() => { localStorage.setItem('customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('maintenance', JSON.stringify(maintenance)); }, [maintenance]);
  useEffect(() => { localStorage.setItem('salaries', JSON.stringify(salaries)); }, [salaries]);
  useEffect(() => { localStorage.setItem('assistants', JSON.stringify(assistants)); }, [assistants]);
  useEffect(() => { localStorage.setItem('customerRates', JSON.stringify(customerRates)); }, [customerRates]);
  useEffect(() => { localStorage.setItem('khataClients', JSON.stringify(khataClients)); }, [khataClients]);
  useEffect(() => { localStorage.setItem('khataPayments', JSON.stringify(khataPayments)); }, [khataPayments]);
  useEffect(() => { localStorage.setItem('ownerProfile', JSON.stringify(ownerProfile)); }, [ownerProfile]);
  useEffect(() => { localStorage.setItem('isDayStarted', String(isDayStarted)); }, [isDayStarted]);
  useEffect(() => { localStorage.setItem('pendingSync', JSON.stringify(pendingSync)); }, [pendingSync]);
  useEffect(() => { if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser)); }, [currentUser]);

  const addToPendingSync = (action: string, collection: string, data: any) => {
    const id = data.id || Date.now().toString();
    setPendingSync(prev => [...prev, { id, action, collection, data, timestamp: Date.now() }]);
  };

  const processPendingSync = async () => {
    if (pendingSync.length === 0) return;
    
    const queue = [...pendingSync];
    const successes: string[] = [];

    for (const item of queue) {
      try {
        let res;
        if (item.action === 'DELETE') {
          res = await fetchWithTimeout(`/api/${item.collection}/${item.data.id}`, { method: 'DELETE' }, 8000);
        } else if (item.action === 'SAVE') {
          res = await fetchWithTimeout(`/api/${item.collection}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          }, 8000);
        }

        if (res?.ok) {
          successes.push(item.id);
        } else {
          break;
        }
      } catch (e) {
        break; // Stop processing queue on first error (likely still offline/timeout)
      }
    }

    if (successes.length > 0) {
      setPendingSync(prev => prev.filter(item => !successes.includes(item.id)));
    }
  };

  // Auto-sync pending records every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      processPendingSync();
    }, 30000);
    return () => clearInterval(interval);
  }, [pendingSync]);

  const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null; // Return null on timeout
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const parseJsonResponse = async (res: Response | null, label: string) => {
    if (!res) return null; // Handle timeout null response

    const contentType = res.headers.get('content-type') || '';
    const raw = await res.text();

    if (!res.ok) {
      throw new Error(`${label} failed with ${res.status}: ${raw.slice(0, 200)}`);
    }

    if (!contentType.includes('application/json')) {
      throw new Error(`${label} returned non-JSON response: ${raw.slice(0, 200)}`);
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`${label} returned invalid JSON: ${raw.slice(0, 200)}`);
    }
  };

  const applyServerData = (data: any) => {
    startBackgroundSyncTransition(() => {
      // Merge logic: Server data + Pending local SAVEs - Pending local DELETEs
      let mergedCustomers = data.customers || [];
      
      // Re-apply pending SAVEs that might not be on server yet
      pendingSync.filter(p => p.collection === 'customers' && p.action === 'SAVE').forEach(p => {
        const idx = mergedCustomers.findIndex((c: any) => c.id === p.data.id);
        if (idx >= 0) mergedCustomers[idx] = { ...mergedCustomers[idx], ...p.data };
        else mergedCustomers = [p.data, ...mergedCustomers];
      });

      // Remove pending DELETEs
      const pendingDeletes = new Set(pendingSync.filter(p => p.collection === 'customers' && p.action === 'DELETE').map(p => p.data.id));
      mergedCustomers = mergedCustomers.filter((c: any) => !pendingDeletes.has(c.id));

      setCustomers(mergedCustomers);
      
      // Similar merge for other collections
      let mergedMaintenance = data.maintenance || [];
      pendingSync.filter(p => p.collection === 'maintenance' && p.action === 'SAVE').forEach(p => {
        if (!mergedMaintenance.some((m: any) => m.id === p.data.id)) mergedMaintenance = [p.data, ...mergedMaintenance];
      });
      setMaintenance(mergedMaintenance);

      setSalaries(data.salaries || []);
      setKhataPayments(data.khataPayments || []);
      setAssistants(data.assistants || []);
      setCustomerRates(data.customerRates || []);
      setKhataClients(data.khataClients || []);
      setOwnerProfile(data.ownerProfile || DEFAULT_OWNER);
      setSetupError('');
      setNotificationSettings(data.notificationSettings || {
        enableKhataReminders: true,
        enableMaintenanceAlerts: true,
      });
      setIsDayStarted(data.isDayStarted || false);

      const saved = localStorage.getItem('currentUser');
      if (saved) {
        try {
          const user = JSON.parse(saved);
          if (user.role === 'OWNER' && data.ownerProfile) {
            setCurrentUser({ ...data.ownerProfile, role: 'OWNER' });
          }
        } catch (error) {
          console.error('Failed to refresh saved user', error);
        }
      }
    });
  };

  const runRefreshData = async (label: string) => {
    try {
      const res = await fetchWithTimeout('/api/data', { cache: 'no-store' }, 12000);
      if (!res) {
        throw new Error('Request timeout');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await parseJsonResponse(res, label);
      applyServerData(data);
      return data;
    } catch (err: any) {
      if (err.message !== 'Timeout') {
        console.error(`[REFRESH] ${label} failed:`, err);
      }
      return null;
    }
  };

  const refreshData = async (label: string) => {
    if (refreshPromiseRef.current) {
      queuedRefreshLabelRef.current = label;
      return refreshPromiseRef.current;
    }

    const request = runRefreshData(label)
      .finally(async () => {
        refreshPromiseRef.current = null;
        const queuedLabel = queuedRefreshLabelRef.current;
        queuedRefreshLabelRef.current = null;

        if (queuedLabel) {
          try {
            await refreshData(queuedLabel);
          } catch (error) {
            console.error('Queued refresh failed', error);
          }
        }
      });

    refreshPromiseRef.current = request;
    return request;
  };

  const queueRefresh = (label: string) => {
    void refreshData(label).catch(error => {
      console.error(`${label} failed`, error);
    });
  };

  // Persistence effect for session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  // Fetch data on mount
  useEffect(() => {
    refreshData('Initial data fetch')
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Poll day status every 60 seconds to sync with automatic start/end
  useEffect(() => {
    if (loading || setupError) {
      return;
    }

    const pollDayStatus = async () => {
      try {
        const res = await fetchWithTimeout('/api/system-state', undefined, 8000);
        const data = await parseJsonResponse(res, 'Day status poll');
        if (data.isDayStarted !== undefined && data.isDayStarted !== isDayStarted) {
          setIsDayStarted(data.isDayStarted);
        }
      } catch (e) {
        if (!(e instanceof Error && e.name === 'AbortError')) {
          console.error('Failed to poll day status', e);
        }
      }
    };
    const interval = setInterval(pollDayStatus, 60000);
    return () => clearInterval(interval);
  }, [isDayStarted, loading, setupError]);

  const syncDayStatus = async (status: boolean) => {
    // Optimistic Update
    setIsDayStarted(status);
    
    addToPendingSync('SAVE', 'system-state', { key: 'isDayStarted', value: status });
    processPendingSync();
  };

  const deleteRecord = async (collection: string, id: string) => {
    // Optimistic Update
    if (collection === 'customers') setCustomers(prev => prev.filter(c => c.id !== id));
    if (collection === 'maintenance') setMaintenance(prev => prev.filter(m => m.id !== id));
    if (collection === 'salaries') setSalaries(prev => prev.filter(s => s.id !== id));
    if (collection === 'khata-payments' || collection === 'khataPayments') setKhataPayments(prev => prev.filter(p => p.id !== id));
    if (collection === 'assistants') setAssistants(prev => prev.filter(a => a.id !== id));
    if (collection === 'customer-rates' || collection === 'customerRates') setCustomerRates(prev => prev.filter(r => r.id !== id));
    if (collection === 'khata-clients') setKhataClients(prev => prev.filter(c => c.id !== id));

    addToPendingSync('DELETE', collection, { id });
    processPendingSync();
  };

  const syncProfile = async (userData: { id: string, name: string, phone: string, role: string }) => {
    // Optimistic Update
    setCurrentUser(prev => prev ? { ...prev, name: userData.name, phone: userData.phone } : null);
    if (userData.role === 'OWNER') {
      setOwnerProfile(prev => ({ ...prev, name: userData.name, phone: userData.phone }));
    } else {
      setAssistants(prev => prev.map(a => a.id === userData.id ? { ...a, name: userData.name, phone: userData.phone } : a));
    }

    addToPendingSync('SAVE', 'settings', userData);
    processPendingSync();
  };

  const syncNotificationSettings = async (settings: any) => {
    // Optimistic Update
    setNotificationSettings(settings);

    addToPendingSync('SAVE', 'settings', { id: currentUser?.id, ...settings });
    processPendingSync();
  };

const syncCustomer = async (data: any) => {
    const customer = typeof data === 'function' ? data([])[0] : data;
    if (!customer || !customer.id) return;

    // Optimistic Update - immediate state change
    setCustomers(prev => {
      if (customer.updateFlag) {
        return prev.map(c => c.id === customer.id ? { ...c, ...customer } : c);
      }
      if (prev.some(c => c.id === customer.id)) return prev;
      return [customer, ...prev];
    });

    addToPendingSync('SAVE', 'customers', customer);
    processPendingSync();
  };

  const syncMaintenance = async (data: any) => {
    const newMaint = typeof data === 'function' ? data([])[0] : data;
    if (!newMaint || !newMaint.id) return;

    // Optimistic Update
    setMaintenance(prev => {
      if (prev.some(m => m.id === newMaint.id)) return prev;
      return [newMaint, ...prev];
    });

    addToPendingSync('SAVE', 'maintenance', newMaint);
    processPendingSync();
  };

  const syncSalary = async (data: any) => {
    const newSalary = typeof data === 'function' ? data([])[0] : data;
    if (!newSalary || !newSalary.id) return;
    setSalaries(prev => {
      if (prev.some(s => s.id === newSalary.id)) return prev;
      return [newSalary, ...prev];
    });
    addToPendingSync('SAVE', 'salaries', newSalary);
    processPendingSync();
  };

  const syncKhataPayment = async (data: any) => {
    const newPayment = typeof data === 'function' ? data([])[0] : data;
    if (!newPayment || !newPayment.id) return;
    setKhataPayments((prev: any) => {
      if (prev.some((p: any) => p.id === newPayment.id)) return prev;
      return [newPayment, ...prev];
    });
    addToPendingSync('SAVE', 'khata-payments', newPayment);
    processPendingSync();
  };

  const syncCustomerRate = async (data: any) => {
    const newRate = typeof data === 'function' ? data([])[0] : data;
    if (!newRate) return;
    
    // Generate a stable ID if missing (based on customer + material)
    if (!newRate.id) {
      newRate.id = `rate-${newRate.customerName}-${newRate.material}`.replace(/\s+/g, '-').toLowerCase();
    }

    setCustomerRates((prev: any) => {
      const idx = prev.findIndex((r: any) => 
        r.id === newRate.id || 
        ((r.customerName || '').trim().toUpperCase() === (newRate.customerName || '').trim().toUpperCase() && 
         (r.material || '').trim().toUpperCase() === (newRate.material || '').trim().toUpperCase())
      );
      if (idx >= 0) {
        // If we matched by name/material but IDs were different, keep the one we found
        const existing = prev[idx];
        newRate.id = existing.id;
        return prev.map((r: any) => r.id === existing.id ? { ...r, ...newRate } : r);
      }
      return [newRate, ...prev];
    });

    addToPendingSync('SAVE', 'customer-rates', newRate);
    processPendingSync();
  };

  const syncAssistant = async (data: any) => {
    const newAssistant = typeof data === 'function' ? data([])[0] : data;
    if (!newAssistant || !newAssistant.id) return;
    setAssistants(prev => {
      if (prev.some(a => a.id === newAssistant.id)) return prev;
      return [...prev, newAssistant];
    });
    addToPendingSync('SAVE', 'assistants', newAssistant);
    processPendingSync();
  };

  const syncKhataClient = async (clientData: string | Partial<KhataClient>) => {
    const payload: any =
      typeof clientData === 'string'
        ? { id: Date.now().toString(), name: clientData.trim(), applyGst: false }
        : {
            id: clientData.id || Date.now().toString(),
            name: clientData.name?.trim() || '',
            applyGst: Boolean(clientData.applyGst),
          };

    if (!payload.name) return;
    setKhataClients(prev => {
      const idx = prev.findIndex(client => 
        client.id === payload.id || 
        (client.name || '').trim().toUpperCase() === (payload.name || '').trim().toUpperCase()
      );
      if (idx >= 0) return prev.map((client, index) => (index === idx ? { ...client, ...payload } : client));
      return [...prev, payload];
    });
    addToPendingSync('SAVE', 'khata-clients', payload);
    processPendingSync();
  };  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [nativeNotifiedIds, setNativeNotifiedIds] = useState<string[]>([]);
  const [notificationSettings, setNotificationSettings] = useState({
    enableKhataReminders: true,
    enableMaintenanceAlerts: true,
  });

  // Auto-generate notifications based on data
  const notifications = useMemo(() => {
    const alerts: any[] = [];

    if (!notificationSettings.enableKhataReminders) return [];

    const today = new Date();
    
    // Check Khata Clients for 15-day rule
    khataClients.forEach(({ name: client }) => {
      const clientTx = customers.filter(c => c.customerName === client && c.customerType === 'REGULAR');
      if (clientTx.length === 0) return;

      // Find the oldest record that remains unpaid
      const clientPayments = khataPayments.filter(p => p.customerName === client).reduce((sum, p) => sum + p.amount, 0);
      const clientTotal = clientTx.reduce((sum, c) => sum + c.amount, 0);
      const balance = clientTotal - clientPayments;

      if (balance > 100) { // Significant balance
        const oldestTx = [...clientTx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        const txDate = new Date(oldestTx.date);
        const diffTime = Math.abs(today.getTime() - txDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 15) {
          alerts.push({
            id: `overdue-${client}`,
            title: 'Payment Overdue!',
            message: `${client}'s 15-day timeline exceeded. Collect ₹${balance.toLocaleString('en-IN')}.`,
            type: 'DANGER',
            date: new Date().toISOString(),
          });
        } else if (diffDays >= 12) {
          alerts.push({
            id: `reminder-${client}`,
            title: 'Upcoming Payment',
            message: `${client} has ${15 - diffDays} days remaining to settle ₹${balance.toLocaleString('en-IN')}.`,
            type: 'WARNING',
            date: new Date().toISOString(),
          });
        }
      }
    });

    // Maintenance Alerts
    if (notificationSettings.enableMaintenanceAlerts) {
      maintenance.forEach(m => {
        const mDate = new Date(m.date);
        const isRecent = Math.abs(today.getTime() - mDate.getTime()) < (1000 * 60 * 60 * 24 * 2); // Within 2 days
        if (isRecent) {
          alerts.push({
            id: `maint-${m.id}`,
            title: 'Maintenance Logged',
            message: `New ${m.type} service record detected. Check logs for details.`,
            type: 'INFO',
            date: m.date,
          });
        }
      });
    }

    return alerts.map(a => ({
      ...a,
      isRead: readNotifications.includes(a.id)
    }));
  }, [customers, khataClients, khataPayments, readNotifications, maintenance, notificationSettings]);

  const markNotificationAsRead = (id: string) => {
    setReadNotifications(prev => [...prev, id]);
  };

  // Native Push Notifications Logic
  useEffect(() => {
    if (currentUser?.role !== 'OWNER' || !("Notification" in window)) return;

    if (Notification.permission === 'granted') {
      const unreadAlerts = notifications.filter(n => !n.isRead && !nativeNotifiedIds.includes(n.id));
      if (unreadAlerts.length > 0) {
        unreadAlerts.forEach(alert => {
          try {
            const n = new Notification(alert.title, {
              body: alert.message,
              tag: alert.id,
            });
            n.onclick = () => {
              window.focus();
              setActiveTab('dashboard');
            };
          } catch (e) {
            console.error('Notification error:', e);
          }
        });
        setNativeNotifiedIds(prev => [...prev, ...unreadAlerts.map(a => a.id)]);
      }
    }
  }, [notifications, currentUser, nativeNotifiedIds]);

  const handleLogin = (name: string, role: UserRole, password?: string): boolean => {
    if (role === 'OWNER') {
      const profile = ownerProfile || DEFAULT_OWNER;
      const storedPassword = profile.password || '123456';
      // Owner login - checking against dynamic profile if available
      if (name.toLowerCase() === profile.name.toLowerCase() && password === storedPassword) {
        setCurrentUser({ ...profile, role: 'OWNER' });
        setActiveTab('dashboard');
        return true;
      }
    } else {
      const assistant = assistants.find(a => a.name.toLowerCase() === name.toLowerCase());
      if (assistant) {
        // Use stored password or fall back to default
        const storedPassword = assistant.password || '123456';
        if (password === storedPassword) {
          setCurrentUser({ 
            id: assistant.id,
            name: assistant.name,
            phone: assistant.phone || '0000000000',
            role: 'ASSISTANT' 
          });
          setActiveTab('dashboard');
          return true;
        }
      }
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const appState: AppState = {
    currentUser,
    ownerProfile: ownerProfile ? { ...ownerProfile, role: 'OWNER' } : DEFAULT_OWNER,
    customers,
    maintenance,
    salaries,
    assistants,
    customerRates,
    khataClients,
    khataPayments,
    notifications,
    notificationSettings,
    isDayStarted,
    pendingSyncCount: pendingSync.length,
    syncNow: processPendingSync,
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-bg-surface">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Initializing Encrypted Database...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
        assistants={assistants}
        ownerProfile={ownerProfile}
        setupError={setupError}
      />
    );
  }

  const shouldUseOwnerDashboard =
    currentUser.role === 'OWNER' ||
    (currentUser.role === 'ASSISTANT' && activeTab !== 'dashboard' && activeTab !== 'salaries');

  return (
    <>
      {(isBackgroundSyncing || pendingSync.length > 0) && (
        <div className="fixed right-4 bottom-20 z-[70] flex flex-col items-end space-y-2">
          {pendingSync.length > 0 && (
            <button 
              onClick={() => processPendingSync()}
              className="group flex items-center rounded-xl border border-warning/20 bg-warning/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-warning shadow-lg backdrop-blur hover:bg-warning/20 transition-all"
            >
              <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-warning" />
              {pendingSync.length} Pending Syncs • Sync Now
            </button>
          )}
          {isBackgroundSyncing && (
            <div className="rounded-full border border-border-subtle bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-text-muted shadow-lg backdrop-blur flex items-center">
              <div className="mr-2 h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Syncing Data
            </div>
          )}
        </div>
      )}
      <Layout 
        user={currentUser} 
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        markNotificationAsRead={markNotificationAsRead}
      >
        {shouldUseOwnerDashboard ? (
          <OwnerDashboard 
            state={appState} 
            setIsDayStarted={syncDayStatus}
            activeTab={activeTab}
            setCustomers={syncCustomer as any}
            setMaintenance={syncMaintenance as any}
            setSalaries={syncSalary as any}
            setAssistants={syncAssistant as any}
            setCustomerRates={syncCustomerRate as any}
            setKhataClients={syncKhataClient as any}
            setKhataPayments={syncKhataPayment as any}
            setNotificationSettings={setNotificationSettings}
            deleteRecord={deleteRecord}
            syncProfile={syncProfile}
          />
        ) : (
          <AssistantDashboard 
            state={appState}
            activeTab={activeTab}
            setIsDayStarted={syncDayStatus}
            setCustomers={syncCustomer as any} 
            setMaintenance={syncMaintenance as any}
            deleteRecord={deleteRecord}
            syncProfile={syncProfile}
          />
        )}
      </Layout>
    </>
  );
}
