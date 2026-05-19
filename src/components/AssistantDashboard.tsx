import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, ReceiptText, Wrench, Search, IndianRupee,
  MapPin, Truck, UserCircle, Layers, CheckCircle2, Save, X, Settings, Lock, Trash2, Clock
} from 'lucide-react';
import { AppState, CustomerEntry, MaintenanceEntry, CustomerType, RateUnit } from '../types';
import { formatDate, cn, normalizeVehicleNumber, EXCLUDED_VEHICLES, resolveCanonicalText } from '../lib/utils';
import { AnimatePresence } from 'motion/react';
import Modal from './Modal';

interface AssistantDashboardProps {
  state: AppState;
  activeTab: string;
  setIsDayStarted: (status: boolean) => Promise<void>;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerEntry[]>>;
  setMaintenance: React.Dispatch<React.SetStateAction<MaintenanceEntry[]>>;
  deleteRecord: (collection: string, id: string) => Promise<void>;
  syncProfile: (userData: { id: string, name: string, phone: string, role: string }) => Promise<void>;
}

export default function AssistantDashboard({ 
  state, 
  activeTab, 
  setIsDayStarted,
  setCustomers, 
  setMaintenance,
  deleteRecord,
  syncProfile
}: AssistantDashboardProps) {
  const [showEntryForm, setShowEntryForm] = useState<'NONE' | 'CUSTOMER' | 'MAINTENANCE'>('NONE');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | CustomerType>('ALL');
  const todayKey = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  useEffect(() => {
    setSearchTerm('');
    setCustomerTypeFilter('ALL');
  }, [activeTab]);

  useEffect(() => {
    setVisibleCustomerCount(25);
  }, [searchTerm, customerTypeFilter, activeTab]);

  const filteredCustomers = useMemo(() => {
    let result = state.customers.filter(c => (c.date || '').slice(0, 10) === todayKey);

    if (customerTypeFilter !== 'ALL') {
      result = result.filter(c => c.customerType === customerTypeFilter);
    }

    if (!searchTerm) return result;
    const term = searchTerm.toLowerCase();
    return result.filter(c => 
      c.vehicleNumber.toLowerCase().includes(term) ||
      c.customerName.toLowerCase().includes(term) ||
      (c.site || '').toLowerCase().includes(term) ||
      c.material.toLowerCase().includes(term) ||
      c.date.includes(term) ||
      c.brass.toString().includes(term) ||
      c.rate.toString().includes(term) ||
      c.addedBy.toLowerCase().includes(term)
    );
  }, [state.customers, searchTerm, customerTypeFilter, todayKey]);

  // Form States
  const [custName, setCustName] = useState('');
  const [custType, setCustType] = useState<CustomerType>('OTHER');
  const [vehicle, setVehicle] = useState('');
  const [site, setSite] = useState('');
  const [material, setMaterial] = useState('');
  const [trips, setTrips] = useState('1');
  const [brass, setBrass] = useState('');
  const [weight, setWeight] = useState('');
  const [rateUnit, setRateUnit] = useState<RateUnit>('PER_BRASS');
  const [asstRate, setAsstRate] = useState('');
  const [visibleCustomerCount, setVisibleCustomerCount] = useState(25);

  const filteredMaintenance = useMemo(() => {
    // Only show maintenance records added by this assistant
    const currentUserId = state.currentUser?.id;
    let result = state.maintenance.filter(
      m => m.addedById === currentUserId && (m.date || '').slice(0, 10) === todayKey
    );

    if (!searchTerm) return result;
    const term = searchTerm.toLowerCase();
    return result.filter(m => 
      m.type.toLowerCase().includes(term) ||
      m.date.includes(term)
    );
  }, [state.maintenance, searchTerm, state.currentUser?.id, todayKey]);

  const visibleCustomers = useMemo(
    () => filteredCustomers.slice(0, visibleCustomerCount),
    [filteredCustomers, visibleCustomerCount]
  );

  const uniqueKhataCustomers = useMemo(() => 
    Array.from(new Set(state.khataClients.map(client => client.name))),
    [state.khataClients]
  );

  const knownCustomerNames = useMemo(
    () => Array.from(new Set([
      ...state.customers.map(customer => customer.customerName),
      ...state.khataClients.map(client => client.name),
      ...state.customerRates.map(rate => rate.customerName),
    ].filter((value): value is string => Boolean(value && value.trim())))),
    [state.customers, state.khataClients, state.customerRates]
  );

  const knownMaterials = useMemo(
    () => Array.from(new Set([
      ...state.customers.map(customer => customer.material),
      ...state.customerRates.map(rate => rate.material),
    ].filter((value): value is string => Boolean(value && value.trim())))),
    [state.customers, state.customerRates]
  );

  const knownSites = useMemo(
    () => Array.from(new Set(state.customers.map(customer => customer.site).filter((value): value is string => Boolean(value && value.trim())))),
    [state.customers]
  );

  const availableKhataMaterials = useMemo(() => 
    state.customerRates
      .filter(r => (r.customerName || '').trim().toUpperCase() === (custName || '').trim().toUpperCase())
      .map(r => r.material),
    [custName, state.customerRates]
  );

  // Auto-detect Regular Customer
  useEffect(() => {
    const isRegular = state.customerRates.some(
      r => (r.customerName || '').trim().toUpperCase() === (custName || '').trim().toUpperCase()
    );
    
    if (isRegular) {
      setCustType('REGULAR');
    } else if (custName.trim().length > 0) {
      setCustType('OTHER');
    }
  }, [custName, state.customerRates]);

  useEffect(() => {
    const normalizedVehicle = normalizeVehicleNumber(vehicle);
    if (!normalizedVehicle) return;

    if (EXCLUDED_VEHICLES.some(v => normalizeVehicleNumber(v) === normalizedVehicle)) {
      return;
    }

    const matchedCustomer = state.customers.find(
      customer =>
        normalizeVehicleNumber(customer.vehicleNumber) === normalizedVehicle &&
        customer.customerName?.trim()
    );

    if (matchedCustomer && matchedCustomer.customerName !== custName) {
      setCustName(matchedCustomer.customerName);
    }
  }, [vehicle, custName, state.customers]);
  
  const [mType, setMType] = useState('');
  const [mAmount, setMAmount] = useState('');

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedCustomerName = resolveCanonicalText(custName, knownCustomerNames);
    const resolvedMaterial = resolveCanonicalText(material, knownMaterials);
    const resolvedSite = resolveCanonicalText(site, knownSites);
    
    if (!resolvedCustomerName) {
      alert('Customer name is required');
      return;
    }

    let finalRate = 0;
    if (custType === 'REGULAR') {
      // Check Khata for automatic rate assignment in background
      if (resolvedCustomerName && resolvedMaterial) {
        const match = state.customerRates.find(
          r => r.customerName.trim().toUpperCase() === resolvedCustomerName.toUpperCase() &&
               r.material.trim().toUpperCase() === resolvedMaterial.toUpperCase()
        );
        if (match) {
          finalRate = match.rate;
          setRateUnit(match.rateUnit || 'PER_BRASS');
        }
      }
    } else {
      // Use the rate entered by assistant for one-time clients
      finalRate = parseFloat(asstRate) || 0;
    }

    const tripsNum = isNaN(parseInt(trips)) ? 1 : parseInt(trips);
    const brassNum = isNaN(parseFloat(brass)) ? 0 : parseFloat(brass);
    const weightNum = isNaN(parseFloat(weight)) ? 0 : parseFloat(weight);

    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      vehicleNumber: vehicle,
      customerName: resolvedCustomerName,
      site: resolvedSite,
      customerType: custType,
      material: resolvedMaterial,
      trips: tripsNum,
      brass: brassNum,
      weight: weightNum,
      rateUnit,
      rate: finalRate,
      amount: (() => {
        const quantity = rateUnit === 'PER_WEIGHT' ? weightNum : (brassNum * tripsNum);
        const baseAmount = quantity * finalRate;
        const clientConfig = state.khataClients.find(
          client => client.name.trim().toUpperCase() === resolvedCustomerName.toUpperCase()
        );
        return clientConfig?.applyGst ? baseAmount * 1.05 : baseAmount;
      })(),
      paidAmount: 0,
      status: 'PENDING',
      addedBy: state.currentUser?.name || 'Unknown',
      addedById: state.currentUser?.id || '',
    };
    // Sync to backend
    (setCustomers as any)(newEntry);
    setShowEntryForm('NONE');
    setCustName('');
    setVehicle('');
    setSite('');
    setMaterial('');
    setTrips('1');
    setBrass('');
    setWeight('');
    setRateUnit('PER_BRASS');
    setAsstRate('');
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      type: mType,
      amount: parseFloat(mAmount),
      description: '',
      addedBy: state.currentUser?.name || 'Unknown',
      addedById: state.currentUser?.id || '',
    };
    // Sync to backend
    (setMaintenance as any)(newEntry);
    setShowEntryForm('NONE');
    setMType('');
    setMAmount('');
  };

  const renderCustomersSection = (compact = false) => (
    <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-8 text-center">
      <ReceiptText className="h-10 w-10 text-text-muted mx-auto mb-4" />
      <h3 className="text-base font-bold text-text-main uppercase tracking-widest">Client Records</h3>
      <p className="text-text-muted text-xs max-w-xs mx-auto mt-2 mb-6">Assistant view for billing history. Full financial records are restricted.</p>
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-6">Showing today's records only</p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-8 max-w-lg mx-auto">
        <select
          value={customerTypeFilter}
          onChange={(e) => setCustomerTypeFilter(e.target.value as any)}
          className="px-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none cursor-pointer uppercase tracking-widest"
        >
          <option value="ALL">All Clients</option>
          <option value="REGULAR">Regular</option>
          <option value="OTHER">Others</option>
        </select>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input 
            type="text" 
            placeholder="Filter records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none w-full"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-surface border-b border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Site</th>
                <th className="px-6 py-4">Material</th>
                <th className="px-6 py-4">Trips</th>
                <th className="px-6 py-4">Brass</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {(compact ? filteredCustomers.slice(0, 15) : visibleCustomers).map(c => (
                <tr key={c.id}>
                  <td className="px-6 py-4 text-xs font-bold text-text-muted">{formatDate(c.date)}</td>
                  <td className="px-6 py-4 text-xs font-bold text-text-main">{c.vehicleNumber}</td>
                  <td className="px-6 py-4 text-xs font-medium text-text-main uppercase">{c.site || '-'}</td>
                  <td className="px-6 py-4 text-xs font-medium text-text-muted uppercase">{c.material}</td>
                  <td className="px-6 py-4 text-xs font-bold text-text-main">{c.trips || 1}</td>
                  <td className="px-6 py-4 text-xs font-bold text-text-main">{c.brass} <span className="text-text-muted font-normal">BRS</span></td>
                  <td className="px-6 py-4 text-center">
                    <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden space-y-3 p-4">
          {(compact ? filteredCustomers.slice(0, 15) : visibleCustomers).map(c => (
            <div key={c.id} className="bg-bg-surface rounded-xl border border-border-subtle p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-text-main">{c.vehicleNumber}</span>
                  <span className="text-[10px] text-text-muted uppercase ml-2">{c.material}</span>
                </div>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-text-muted">Date: <span className="text-text-main font-bold">{formatDate(c.date)}</span></div>
                <div className="text-text-muted">Site: <span className="text-text-main font-medium uppercase">{c.site || '-'}</span></div>
                <div className="text-text-muted">Trips: <span className="text-text-main font-bold">{c.trips || 1}</span></div>
                <div className="text-text-muted">Brass: <span className="text-text-main font-bold">{c.brass}</span></div>
              </div>
            </div>
          ))}
        </div>
        {!compact && filteredCustomers.length > visibleCustomerCount && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setVisibleCustomerCount(prev => prev + 25)}
              className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-text-main transition hover:bg-white"
            >
              Load More Records
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderMaintenanceSection = () => (
    <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-8 text-center">
      <Wrench className="h-10 w-10 text-text-muted mx-auto mb-4" />
      <h3 className="text-base font-bold text-text-main uppercase tracking-widest">Maintenance Logs</h3>
      <p className="text-text-muted text-xs max-w-xs mx-auto mt-2 mb-6">View local service logs. Financial expenditure is hidden.</p>
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-6">Showing today's logs only</p>
      
      <div className="relative max-w-sm mx-auto mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
        <input 
          type="text" 
          placeholder="Filter logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none w-full"
        />
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {filteredMaintenance.map(m => (
          <div key={m.id} className="p-4 bg-bg-surface border border-border-subtle rounded-lg text-left flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-text-main uppercase">{m.type}</p>
              <p className="text-[10px] text-text-muted font-bold uppercase">{formatDate(m.date)}</p>
            </div>
            <div className="flex items-center space-x-3">
              {state.isDayStarted && (
                <button 
                  onClick={() => deleteRecord('maintenance', m.id)}
                  className="text-danger hover:text-danger/80 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {!state.isDayStarted && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-center space-x-3 mb-6"
        >
          <div className="bg-warning p-2 rounded-lg">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-main uppercase tracking-tight">System Status: Locked</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-tighter mt-0.5">Day access is paused. You can reopen operations here when the site is ready.</p>
          </div>
        </motion.div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-sm font-bold text-text-main uppercase tracking-widest flex items-center mb-1">
            <Clock className="h-4 w-4 mr-2 text-primary" /> Day Control
          </h3>
          <p className="text-xs text-text-muted">Assistant access can now start or end the working day.</p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          {!state.isDayStarted ? (
            <button
              onClick={() => setIsDayStarted(true)}
              className="flex items-center px-6 py-3 bg-success text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-success/90 transition-all shadow-lg shadow-success/20"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Start Day
            </button>
          ) : (
            <button
              onClick={() => setIsDayStarted(false)}
              className="flex items-center px-6 py-3 bg-danger text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-danger/90 transition-all shadow-lg shadow-danger/20"
            >
              <X className="h-4 w-4 mr-2" /> End Day
            </button>
          )}
        </div>

        <div className={cn(
          "absolute right-0 top-0 h-full w-1/3 opacity-[0.03] pointer-events-none transition-colors duration-500",
          state.isDayStarted ? "bg-success" : "bg-danger"
        )} />
      </div>
      {renderCustomersSection(true)}
      {renderMaintenanceSection()}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 px-2">
        <div className={cn(
          "w-2 h-2 rounded-full animate-pulse",
          state.isDayStarted ? "bg-success" : "bg-danger"
        )} />
        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
          Operational Status: {state.isDayStarted ? 'Online • Main Facility' : 'Strictly Locked • Review Mode Only'}
        </span>
      </div>
      
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {!state.isDayStarted && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-danger/5 border-2 border-dashed border-danger/20 p-8 rounded-2xl flex flex-col items-center text-center space-y-4 mb-8"
                  >
                    <div className="bg-danger p-4 rounded-full shadow-lg shadow-danger/20">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-text-main uppercase tracking-tight">Administrative Lockdown</h2>
                      <p className="text-xs text-text-muted font-bold uppercase tracking-tighter mt-1 max-w-md mx-auto leading-relaxed">
                        The business day has not been started. All data entry and modification privileges are currently revoked. Please contact administration to resume logging.
                      </p>
                    </div>
                  </motion.div>
                )}
                {renderDashboard()}
              </div>
            )}
            
            {activeTab === 'customers' && renderCustomersSection(false)}

            {activeTab === 'maintenance' && renderMaintenanceSection()}

              
            </motion.div>
        </AnimatePresence>
      </div>

      {/* Entry Modals */}
      <Modal 
        isOpen={showEntryForm === 'CUSTOMER'} 
        onClose={() => {
          setShowEntryForm('NONE');
          setCustName('');
          setVehicle('');
          setSite('');
          setMaterial('');
          setBrass('');
          setAsstRate('');
        }}
        title="New Billing Entry"
      >
        <form className="space-y-4" onSubmit={handleAddCustomer}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Customer Type</label>
              <select 
                value={custType} onChange={e => setCustType(e.target.value as CustomerType)}
                className="w-full px-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              >
                <option value="REGULAR">Khata Client</option>
                <option value="OTHER">One-Time Client</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Vehicle Number</label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input 
                  type="text" required value={vehicle} onChange={e => setVehicle(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-2 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold uppercase"
                  placeholder="ABC-123-XYZ"
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Customer Name</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input 
                  type="text" required value={custName} onChange={e => setCustName(resolveCanonicalText(e.target.value, knownCustomerNames))}
                list="asst-khata-customers"
                className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold uppercase"
                placeholder="Enter Client Name"
              />
              <datalist id="asst-khata-customers">
                {uniqueKhataCustomers.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Site</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input 
                type="text"
                value={site}
                onChange={e => setSite(resolveCanonicalText(e.target.value, knownSites))}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold uppercase"
                placeholder="Delivery Site / Location"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Material</label>
            <input 
              type="text" required value={material} onChange={e => setMaterial(resolveCanonicalText(e.target.value, knownMaterials))}
              list="asst-khata-materials"
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold uppercase"
              placeholder="e.g. 20mm aggregate"
            />
            <datalist id="asst-khata-materials">
              {availableKhataMaterials.map(m => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Trips</label>
              <input 
                type="number" required value={trips} onChange={e => setTrips(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold"
                placeholder="1"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Quantity (BRS)</label>
              <input 
                type="number" step="0.01" value={brass} onChange={e => setBrass(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Weight</label>
              <input 
                type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold"
                placeholder="0.00"
              />
            </div>
            {custType === 'OTHER' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Rate Unit</label>
                <select
                  value={rateUnit}
                  onChange={e => setRateUnit(e.target.value as RateUnit)}
                  className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold uppercase"
                >
                  <option value="PER_BRASS">Per Brass</option>
                  <option value="PER_WEIGHT">Per Weight</option>
                </select>
              </div>
            )}
          </div>

          {custType === 'OTHER' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Manual Rate (₹ per BRS)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input 
                  type="number" required value={asstRate} onChange={e => setAsstRate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold"
                  placeholder="Enter Agreed Rate"
                />
              </div>
            </motion.div>
          )}

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg font-bold uppercase tracking-widest flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              <Save className="h-4 w-4 mr-2" /> Save Transaction
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={showEntryForm === 'MAINTENANCE'} 
        onClose={() => setShowEntryForm('NONE')}
        title="Operations Log Entry"
      >
        <form className="space-y-4" onSubmit={handleAddMaintenance}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Entry Type</label>
            <input 
              type="text" required value={mType} onChange={e => setMType(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-[#0F172A] outline-none transition-all font-bold uppercase"
              placeholder="e.g. Fuel Refill"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Amount (₹)</label>
            <p className="text-[9px] text-text-muted font-bold uppercase tracking-tighter opacity-70 mb-1">Confidential: Only visible to administration.</p>
            <input 
              type="number" required value={mAmount} onChange={e => setMAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-[#0F172A] outline-none transition-all font-bold"
              placeholder="0.00"
            />
          </div>
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-[#0F172A] text-white py-3 rounded-lg font-bold uppercase tracking-widest flex items-center justify-center shadow-lg transition-all"
            >
              <Save className="h-4 w-4 mr-2" /> Log Maintenance
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
