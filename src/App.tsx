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
  const [customers, setCustomers] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [customerRates, setCustomerRates] = useState<any[]>([]);
  const [khataClients, setKhataClients] = useState<KhataClient[]>([]);
  const [khataPayments, setKhataPayments] = useState<any[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [isDayStarted, setIsDayStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState('');
  const [isBackgroundSyncing, startBackgroundSyncTransition] = useTransition();
  const refreshPromiseRef = useRef<Promise<any> | null>(null);
  const queuedRefreshLabelRef = useRef<string | null>(null);

  const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const parseJsonResponse = async (res: Response, label: string) => {
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
      setCustomers(data.customers || []);
      setMaintenance(data.maintenance || []);
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
    const res = await fetchWithTimeout('/api/data', { cache: 'no-store' }, 12000);
    const data = await parseJsonResponse(res, label);
    applyServerData(data);
    return data;
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
      .then(() => setLoading(false))
      .catch(err => {
        if (!(err instanceof Error && err.name === 'AbortError')) {
          console.error('Failed to fetch data', err);
        }
        setOwnerProfile(DEFAULT_OWNER);
        setSetupError(
          err instanceof Error && err.name === 'AbortError'
            ? 'Startup timed out. Database is responding too slowly or is unreachable. Check DATABASE_URL and CockroachDB status, then refresh.'
            : err instanceof Error && err.message.includes('DATABASE_URL')
              ? 'Database is not connected. Add DATABASE_URL in Vercel or .env.local, then redeploy.'
              : 'Database connection failed. Check your CockroachDB connection string and redeploy.'
        );
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
    try {
      const res = await fetch('/api/system-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'isDayStarted', value: status })
      });
      if (res.ok) {
        setIsDayStarted(status);
        queueRefresh('Day status refresh');
      }
    } catch (e) {
      console.error('Failed to sync day status', e);
    }
  };

  const deleteRecord = async (collection: string, id: string) => {
    console.log('Deleting:', collection, id);
    try {
      const res = await fetch(`/api/${collection}/${id}`, { method: 'DELETE' });
      console.log('Delete response:', res.status);
      if (res.ok) {
        console.log('Updating state for:', collection);
        if (collection === 'customers') setCustomers(prev => prev.filter(c => c.id !== id));
        if (collection === 'maintenance') setMaintenance(prev => prev.filter(m => m.id !== id));
        if (collection === 'salaries') setSalaries(prev => prev.filter(s => s.id !== id));
        if (collection === 'khata-payments') setKhataPayments(prev => prev.filter(p => p.id !== id));
        if (collection === 'khataPayments') setKhataPayments(prev => prev.filter(p => p.id !== id));
        if (collection === 'assistants') setAssistants(prev => prev.filter(a => a.id !== id));
        if (collection === 'customer-rates') setCustomerRates(prev => prev.filter(r => r.id !== id));
        if (collection === 'customerRates') setCustomerRates(prev => prev.filter(r => r.id !== id));
        if (collection === 'khata-clients') setKhataClients(prev => prev.filter(c => c.id !== id));
        queueRefresh(`Refresh after deleting ${collection}`);
      }
    } catch (e) {
      console.error('Failed to delete record', e);
    }
  };

  const syncProfile = async (userData: { id: string, name: string, phone: string, role: string }) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        setCurrentUser(prev => prev ? { ...prev, name: userData.name, phone: userData.phone } : null);
        if (userData.role === 'OWNER') {
          setOwnerProfile(prev => ({ ...prev, name: userData.name, phone: userData.phone }));
        } else {
          setAssistants(prev => prev.map(a => a.id === userData.id ? { ...a, name: userData.name, phone: userData.phone } : a));
        }
        queueRefresh('Profile refresh');
      }
    } catch (e) {
      console.error('Failed to sync profile', e);
    }
  };

  const syncNotificationSettings = async (settings: any) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser?.id, ...settings })
      });
      if (!res.ok) return;
      setNotificationSettings(settings);
      queueRefresh('Notification settings refresh');
    } catch (e) {
      console.error('Failed to sync settings', e);
    }
  };

const syncCustomer = async (data: any) => {
    const customer = typeof data === 'function' ? data([])[0] : data;
    if (!customer || !customer.id) {
      return;
    }
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Sync error:', err.error);
        return;
      }
      const stored = await res.json();
      // If updateFlag was true, replace existing; otherwise add new
      if (customer.updateFlag) {
        setCustomers((prev: any) => prev.map((c: any) => c.id === stored.id ? stored : c));
      } else {
        setCustomers((prev: any) => {
          if (prev.some((c: any) => c.id === stored.id)) return prev;
          return [stored, ...prev];
        });
      }
      queueRefresh('Customer refresh');
    } catch (e) {
      console.error('Failed to sync customer', e);
    }
  };

  const syncMaintenance = async (data: any) => {
    const newMaint = typeof data === 'function' ? data([])[0] : data;
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaint)
      });
      if (!res.ok) return;
      const stored = await res.json();
      setMaintenance(prev => {
        if (prev.some(m => m.id === stored.id)) return prev;
        return [stored, ...prev];
      });
      queueRefresh('Maintenance refresh');
    } catch (e) {
      console.error('Failed to sync maintenance', e);
    }
  };

  const syncSalary = async (data: any) => {
    const newSalary = typeof data === 'function' ? data([])[0] : data;
    try {
      const res = await fetch('/api/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSalary)
      });
      if (!res.ok) return;
      const stored = await res.json();
      setSalaries(prev => {
        if (prev.some(s => s.id === stored.id)) return prev;
        return [stored, ...prev];
      });
      queueRefresh('Salary refresh');
    } catch (e) {
      console.error('Failed to sync salary', e);
    }
  };

const syncKhataPayment = async (data: any) => {
    const newPayment = typeof data === 'function' ? data([])[0] : data;
    // Skip if already in local state
    if (newPayment.id && khataPayments.some((p: any) => p.id === newPayment.id)) {
      return;
    }
    try {
      const res = await fetch('/api/khata-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment)
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Sync error:', err.error);
        return;
      }
      const stored = await res.json();
      // Add to local state only if not already there
      setKhataPayments((prev: any) => {
        if (prev.some((p: any) => p.id === stored.id)) return prev;
        return [stored, ...prev];
      });
      queueRefresh('Khata payment refresh');
    } catch (e) {
      console.error('Failed to sync khata payment', e);
    }
  };

  const syncCustomerRate = async (data: any) => {
    const newRate = typeof data === 'function' ? data([])[0] : data;
    if (!newRate || !newRate.customerName || !newRate.material) return;
    try {
      const res = await fetch('/api/customer-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRate)
      });
      if (!res.ok) return;
      const stored = await res.json();
      // Update or add in local state
      setCustomerRates((prev: any) => {
        const idx = prev.findIndex((r: any) => r.id === stored.id);
        if (idx >= 0) {
          return prev.map((r: any) => r.id === stored.id ? stored : r);
        }
        return [stored, ...prev];
      });
      queueRefresh('Customer rate refresh');
    } catch (e) {
      console.error('Failed to sync customer rate', e);
    }
  };

  const syncAssistant = async (data: any) => {
    const newAssistant = typeof data === 'function' ? data([])[0] : data;
    try {
      const res = await fetch('/api/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssistant)
      });
      if (!res.ok) return;
      const stored = await res.json();
      setAssistants(prev => {
        if (prev.some(a => a.id === stored.id)) return prev;
        return [...prev, stored];
      });
      queueRefresh('Assistant refresh');
    } catch (e) {
      console.error('Failed to sync assistant', e);
    }
  };

  const syncKhataClient = async (clientData: string | Partial<KhataClient>) => {
    const payload =
      typeof clientData === 'string'
        ? { name: clientData.trim(), applyGst: false }
        : {
            id: clientData.id,
            name: clientData.name?.trim() || '',
            applyGst: Boolean(clientData.applyGst),
          };

    if (!payload.name) return;
    try {
      const res = await fetch('/api/khata-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return;
      const stored = await res.json();
      // Update or add
      setKhataClients(prev => {
        const idx = prev.findIndex(client => client.id === stored.id || client.name === stored.name);
        if (idx >= 0) {
          return prev.map((client, index) => (index === idx ? stored : client));
        }
        return [...prev, stored];
      });
      queueRefresh('Khata client refresh');
    } catch (e) {
      console.error('Failed to sync khata client', e);
    }
  };
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
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
      {isBackgroundSyncing && (
        <div className="fixed right-4 top-4 z-[70] rounded-full border border-border-subtle bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-text-muted shadow-lg backdrop-blur">
          Syncing Data
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
