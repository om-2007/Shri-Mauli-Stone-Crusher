import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Wallet, Clock, CheckCircle2, 
  Plus, Search, Filter, ArrowUpRight, ArrowDownRight,
  IndianRupee, Calendar, Briefcase, UserPlus, Settings, Wrench,
  Trash2, BookOpen, UserCircle, FolderPlus, ChevronRight, User as UserIcon, X, Printer, MapPin
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';
import { AppState, CustomerEntry, MaintenanceEntry, SalaryEntry, User, CustomerType, CustomerRate, KhataPayment, NotificationSettings, KhataClient, RateUnit } from '../types';
import { formatCurrency, formatDate, cn, normalizeVehicleNumber, EXCLUDED_VEHICLES } from '../lib/utils';
import { AnimatePresence } from 'motion/react';
import SettingsContent from './SettingsContent';
import Modal from './Modal';
import { Save } from 'lucide-react';

interface OwnerDashboardProps {
  state: AppState;
  activeTab: string;
  setIsDayStarted: (status: boolean) => Promise<void>;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerEntry[]>>;
  setMaintenance: React.Dispatch<React.SetStateAction<MaintenanceEntry[]>>;
  setSalaries: React.Dispatch<React.SetStateAction<SalaryEntry[]>>;
  setAssistants: React.Dispatch<React.SetStateAction<User[]>>;
  setCustomerRates: React.Dispatch<React.SetStateAction<CustomerRate[]>>;
  setKhataClients: React.Dispatch<React.SetStateAction<KhataClient[]>>;
  setKhataPayments: React.Dispatch<React.SetStateAction<KhataPayment[]>>;
  setNotificationSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  deleteRecord: (collection: string, id: string) => Promise<void>;
  syncProfile: (userData: { id: string, name: string, phone: string, role: string }) => Promise<void>;
}

export default function OwnerDashboard({ 
  state, 
  activeTab, 
  setIsDayStarted,
  setCustomers, 
  setMaintenance, 
  setSalaries, 
  setAssistants,
  setCustomerRates,
  setKhataClients,
  setKhataPayments,
  setNotificationSettings,
  deleteRecord,
  syncProfile
}: OwnerDashboardProps) {
  const isOwner = state.currentUser?.role === 'OWNER';
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | CustomerType>('ALL');
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);
  const [isKhataModalOpen, setIsKhataModalOpen] = useState(false);
  const [isKhataClientModalOpen, setIsKhataClientModalOpen] = useState(false);
  const [isKhataPaymentModalOpen, setIsKhataPaymentModalOpen] = useState(false);
  const [selectedKhataClient, setSelectedKhataClient] = useState<string | null>(null);
  const [mType, setMType] = useState('');
  const [mAmount, setMAmount] = useState('');
  const [mDesc, setMDesc] = useState('');

  // Customer Form States
  const [custName, setCustName] = useState('');
  const [custDate, setCustDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicle, setVehicle] = useState('');
  const [site, setSite] = useState('');
  const [material, setMaterial] = useState('');
  const [trips, setTrips] = useState('1');
  const [brass, setBrass] = useState('');
  const [weight, setWeight] = useState('');
  const [rateUnit, setRateUnit] = useState<RateUnit>('PER_BRASS');
  const [rate, setRate] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [custType, setCustType] = useState<CustomerType>('OTHER');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingKhataId, setEditingKhataId] = useState<string | null>(null);

  // Salary Form States
  const [workerName, setWorkerName] = useState('');
  const [workerRole, setWorkerRole] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryMonth, setSalaryMonth] = useState('');

  // Assistant Form States
  const [assistantName, setAssistantName] = useState('');
  const [assistantPhone, setAssistantPhone] = useState('');
  const [assistantPassword, setAssistantPassword] = useState('');

  // Khata Form States
  const [khataCustName, setKhataCustName] = useState('');
  const [khataMaterial, setKhataMaterial] = useState('');
  const [khataRate, setKhataRate] = useState('');
  const [khataRateUnit, setKhataRateUnit] = useState<RateUnit>('PER_BRASS');
  const [newKhataClientName, setNewKhataClientName] = useState('');
  const [newKhataClientApplyGst, setNewKhataClientApplyGst] = useState(false);
  const [editingKhataClientId, setEditingKhataClientId] = useState<string | null>(null);
  const [khataDetailTab, setKhataDetailTab] = useState<'RATES' | 'PAYMENTS'>('RATES');
  
  // Khata Payment Form States
  const [kpAmount, setKpAmount] = useState('');
  const [kpMethod, setKpMethod] = useState('');
  const [kpDescription, setKpDescription] = useState('');

  const handleAddAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    const newAssistant = {
      id: `asst-${Date.now()}`,
      name: assistantName,
      phone: assistantPhone,
      role: 'ASSISTANT',
      password: assistantPassword || '123456',
    };
    // Sync to backend
    (setAssistants as any)(newAssistant);
    setIsAssistantModalOpen(false);
    setAssistantName('');
    setAssistantPhone('');
    setAssistantPassword('');
  };

  const handleAddKhata = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingKhataId) {
      const updated = {
        id: editingKhataId,
        customerName: khataCustName,
        material: khataMaterial,
        rate: parseFloat(khataRate) || 0,
        rateUnit: khataRateUnit,
      };
      (setCustomerRates as any)(updated);
    } else {
      const newRate = {
        id: Math.random().toString(36).substr(2, 9),
        customerName: khataCustName,
        material: khataMaterial,
        rate: parseFloat(khataRate) || 0,
        rateUnit: khataRateUnit,
      };
      (setCustomerRates as any)(newRate);
    }
    setIsKhataModalOpen(false);
    setEditingKhataId(null);
    setKhataCustName('');
    setKhataMaterial('');
    setKhataRate('');
    setKhataRateUnit('PER_BRASS');
  };

  const handleEditKhata = (rate: CustomerRate) => {
    setEditingKhataId(rate.id);
    setKhataCustName(rate.customerName);
    setKhataMaterial(rate.material);
    setKhataRate(rate.rate.toString());
    setKhataRateUnit(rate.rateUnit || 'PER_BRASS');
    setIsKhataModalOpen(true);
  };

  const selectedKhataClientData = useMemo(
    () => state.khataClients.find(client => 
      selectedKhataClient && 
      (client.name || '').trim().toUpperCase() === selectedKhataClient.trim().toUpperCase()
    ) || null,
    [state.khataClients, selectedKhataClient]
  );

  const shouldApplyGst = (customerName: string) =>
    state.khataClients.some(
      client =>
        client.name.trim().toUpperCase() === customerName.trim().toUpperCase() &&
        client.applyGst
    );

  const calculateAmountByUnit = (unit: RateUnit, rateValue: number, brassValue: number, weightValue: number, tripsValue: number) => {
    const quantity = unit === 'PER_WEIGHT' ? weightValue : (brassValue * tripsValue);
    return quantity * rateValue;
  };

  const formatRateUnit = (unit: RateUnit) => (unit === 'PER_WEIGHT' ? 'per weight' : 'per brass');

  const getQuantityByUnit = (unit: RateUnit, brassValue: number, weightValue: number, tripsValue: number) =>
    unit === 'PER_WEIGHT' ? weightValue : (brassValue * tripsValue);

  const getRegularRateConfig = (
    customerName: string,
    materialName: string,
    fallbackRate = 0,
    fallbackRateUnit: RateUnit = 'PER_BRASS'
  ) => {
    const rateRec = state.customerRates.find(
      r =>
        r.customerName.trim().toUpperCase() === customerName.trim().toUpperCase() &&
        r.material.trim().toUpperCase() === materialName.trim().toUpperCase()
    );

    return {
      rate: rateRec?.rate || fallbackRate || 0,
      rateUnit: rateRec?.rateUnit || fallbackRateUnit,
    };
  };

  const calculateRegularAmount = (
    customerName: string,
    materialName: string,
    brassValue: number,
    weightValue = 0,
    tripsValue = 1,
    fallbackRate = 0,
    fallbackRateUnit: RateUnit = 'PER_BRASS'
  ) => {
    const rateConfig = getRegularRateConfig(customerName, materialName, fallbackRate, fallbackRateUnit);
    const baseAmount = calculateAmountByUnit(rateConfig.rateUnit, rateConfig.rate, brassValue, weightValue, tripsValue);
    return shouldApplyGst(customerName) ? baseAmount * 1.05 : baseAmount;
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const handlePrintKhataBill = () => {
    if (!selectedKhataClient || !selectedKhataClientData) return;

    const clientTransactions = state.customers.filter(
      customer =>
        customer.customerName.trim().toUpperCase() === selectedKhataClient.trim().toUpperCase()
    );

    if (clientTransactions.length === 0) {
      window.alert('No billing records found for this khata client.');
      return;
    }

    const groupedItems = clientTransactions.reduce((acc, customer) => {
      const key = customer.material.trim().toUpperCase();
      const rateConfig = getRegularRateConfig(
        customer.customerName,
        customer.material,
        customer.rate,
        customer.rateUnit || 'PER_BRASS'
      );
      const existing = acc.get(key);
      const quantity = getQuantityByUnit(rateConfig.rateUnit, customer.brass, customer.weight || 0, customer.trips || 1);
      const amount = calculateAmountByUnit(rateConfig.rateUnit, rateConfig.rate, customer.brass, customer.weight || 0, customer.trips || 1);

      if (existing) {
        existing.totalQuantity += quantity;
        existing.amount += amount;
      } else {
        acc.set(key, {
          material: customer.material,
          totalQuantity: quantity,
          rate: rateConfig.rate,
          rateUnit: rateConfig.rateUnit,
          amount,
        });
      }

      return acc;
    }, new Map<string, { material: string; totalQuantity: number; rate: number; rateUnit: RateUnit; amount: number }>());

    const items = Array.from(groupedItems.values()).sort((a, b) => a.material.localeCompare(b.material));
    const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const gstAmount = selectedKhataClientData.applyGst ? subTotal * 0.05 : 0;
    const grandTotal = subTotal + gstAmount;
    const generatedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const totalBrass = clientTransactions.reduce((sum, item) => sum + item.brass, 0);
    const ownerName = state.ownerProfile?.name || 'Nilesh Karande';
    const ownerPhone = state.ownerProfile?.phone || '9370763003';
    const logoUrl = `${window.location.origin}/shri-mauli-logo.png`;

    const printWindow = window.open('', '_blank', 'width=980,height=720');
    if (!printWindow) {
      window.alert('Please allow pop-ups to print the khata bill.');
      return;
    }

    const rowsHtml = items
      .map(
        item => `
          <tr>
            <td>${escapeHtml(item.material)}</td>
            <td class="num">${item.totalQuantity.toFixed(2)}</td>
            <td class="num">${item.rate.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / ${item.rateUnit === 'PER_WEIGHT' ? 'weight' : 'brass'}</td>
            <td class="num">${item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          </tr>
        `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Khata Bill - ${escapeHtml(selectedKhataClient)}</title>
          <style>
            @page { size: A4; margin: 16mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #fff7ed;
            }
            .sheet {
              background: white;
              border: 1px solid #fed7aa;
              border-radius: 20px;
              padding: 28px;
              position: relative;
              overflow: hidden;
            }
            .sheet::before {
              content: "";
              position: absolute;
              inset: 0;
              background: linear-gradient(135deg, rgba(249,115,22,0.10), transparent 35%, rgba(251,191,36,0.10));
              pointer-events: none;
            }
            .content { position: relative; z-index: 1; }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
              padding-bottom: 22px;
              border-bottom: 2px solid #fdba74;
            }
            .brand {
              display: flex;
              gap: 16px;
              align-items: center;
            }
            .logo {
              width: 84px;
              height: 84px;
              border-radius: 18px;
              object-fit: cover;
              border: 3px solid #fdba74;
              background: white;
            }
            .title {
              font-size: 28px;
              font-weight: 800;
              color: #9a3412;
              margin: 0 0 4px;
              letter-spacing: 0.02em;
              text-transform: uppercase;
            }
            .subtitle, .meta, .client-meta {
              margin: 0;
              font-size: 13px;
              color: #7c2d12;
            }
            .bill-tag {
              background: #fff7ed;
              border: 1px solid #fdba74;
              border-radius: 16px;
              padding: 14px 16px;
              min-width: 220px;
            }
            .bill-tag h2 {
              margin: 0 0 8px;
              font-size: 12px;
              letter-spacing: 0.18em;
              color: #9a3412;
              text-transform: uppercase;
            }
            .section {
              margin-top: 22px;
            }
            .client-card {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              padding: 16px;
              background: #fffaf5;
              border: 1px solid #fed7aa;
              border-radius: 16px;
            }
            .label {
              display: block;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.12em;
              color: #9a3412;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            .value {
              font-size: 15px;
              font-weight: 700;
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
              overflow: hidden;
              border-radius: 14px;
            }
            thead th {
              background: #9a3412;
              color: white;
              text-align: left;
              padding: 12px 14px;
              font-size: 11px;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }
            tbody td {
              padding: 12px 14px;
              font-size: 13px;
              border-bottom: 1px solid #fed7aa;
              background: white;
            }
            tbody tr:nth-child(even) td {
              background: #fffaf5;
            }
            .num {
              text-align: right;
              font-variant-numeric: tabular-nums;
            }
            .footer {
              display: grid;
              grid-template-columns: 1.1fr 0.9fr;
              gap: 28px;
              align-items: end;
              margin-top: 28px;
            }
            .totals {
              border: 1px solid #fdba74;
              border-radius: 16px;
              background: #fffaf5;
              padding: 18px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 0;
              font-size: 14px;
              border-bottom: 1px dashed #fdba74;
            }
            .total-row:last-child {
              border-bottom: none;
              padding-bottom: 0;
            }
            .grand {
              font-size: 18px;
              font-weight: 800;
              color: #9a3412;
              padding-top: 12px;
            }
            .signature {
              padding: 18px;
              text-align: right;
            }
            .signature-line {
              margin-top: 72px;
              border-top: 2px solid #7c2d12;
              padding-top: 8px;
              display: inline-block;
              min-width: 240px;
              text-align: center;
              font-size: 14px;
              font-weight: 700;
              color: #7c2d12;
            }
            .note {
              margin-top: 18px;
              font-size: 11px;
              color: #7c2d12;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="content">
              <div class="header">
                <div class="brand">
                  <img class="logo" src="${logoUrl}" alt="Shri Mauli Stone Crusher Logo" />
                  <div>
                    <h1 class="title">Shri Mauli Stone Crusher</h1>
                    <p class="subtitle">Owner: ${escapeHtml(ownerName)}</p>
                    <p class="subtitle">Contact: ${escapeHtml(ownerPhone)}</p>
                  </div>
                </div>
                <div class="bill-tag">
                  <h2>Khata Bill</h2>
                  <p class="meta">Date: ${escapeHtml(generatedDate)}</p>
                  <p class="meta">Client: ${escapeHtml(selectedKhataClient)}</p>
                  <p class="meta">GST: ${selectedKhataClientData.applyGst ? 'Applied @ 5%' : 'Not Applied'}</p>
                </div>
              </div>

              <div class="section client-card">
                <div>
                  <span class="label">Client Name</span>
                  <span class="value">${escapeHtml(selectedKhataClient)}</span>
                </div>
                <div>
                  <span class="label">Material Entries</span>
                  <span class="value">${items.length}</span>
                </div>
                <div>
                  <span class="label">Total Brass</span>
                  <span class="value">${totalBrass.toFixed(2)} BRS</span>
                </div>
              </div>

              <div class="section">
                <table>
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th class="num">Total Brass</th>
                      <th class="num">Rate</th>
                      <th class="num">Rate x Brass</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>

              <div class="footer">
                <div class="totals">
                  <div class="total-row">
                    <span>Subtotal</span>
                    <strong>${subTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div class="total-row">
                    <span>GST ${selectedKhataClientData.applyGst ? '(5%)' : '(Not Applied)'}</span>
                    <strong>${gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div class="total-row grand">
                    <span>Grand Total</span>
                    <strong>${grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                  </div>
                  <p class="note">This khata bill is generated from the client material ledger maintained in Shri Mauli Stone Crusher.</p>
                </div>

                <div class="signature">
                  <div class="signature-line">
                    Nilesh Surakant Karande
                  </div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.addEventListener('load', () => {
              window.print();
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

   const handleAddKhataClient = async (e: React.FormEvent) => {
     e.preventDefault();
     const trimmed = newKhataClientName.trim();
     const duplicate = (state.khataClients || []).some(
       client =>
         client.name.trim().toUpperCase() === trimmed.toUpperCase() &&
         client.id !== editingKhataClientId
     );
     if (!trimmed || duplicate) return;

     await (setKhataClients as any)({
       id: editingKhataClientId || undefined,
       name: trimmed,
       applyGst: newKhataClientApplyGst,
     });
     setNewKhataClientName('');
     setNewKhataClientApplyGst(false);
     setEditingKhataClientId(null);
     setIsKhataClientModalOpen(false);
   };

  const handleAddKhataPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKhataClient) return;
    
    const newPayment = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      customerName: selectedKhataClient,
      amount: parseFloat(kpAmount),
      paymentMethod: kpMethod,
      description: kpDescription,
    };
    
    // Sync to backend only - App.tsx will add to state after DB save
    (setKhataPayments as any)(newPayment);
    setIsKhataPaymentModalOpen(false);
    setKpAmount('');
    setKpMethod('');
    setKpDescription('');
  };

  const handleRemoveKhataPayment = (id: string) => {
    deleteRecord('khataPayments', id);
  };

  const handleEditKhataClient = (client: KhataClient) => {
    setEditingKhataClientId(client.id);
    setNewKhataClientName(client.name);
    setNewKhataClientApplyGst(client.applyGst);
    setIsKhataClientModalOpen(true);
  };

  const handleRemoveKhataClient = (client: KhataClient) => {
    deleteRecord('khata-clients', client.id);
    // Locally also filter child rates for UI responsiveness if not handled by overall state fetch
    setCustomerRates(prev => prev.filter(r => r.customerName !== client.name));
    if (selectedKhataClient === client.name) setSelectedKhataClient(null);
  };

  const handleRemoveKhata = (id: string) => {
    deleteRecord('customerRates', id);
  };

  const handleRemoveAssistant = (id: string) => {
    deleteRecord('assistants', id);
  };

  const handleAddSalary = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      workerName,
      role: workerRole,
      amount: parseFloat(salaryAmount),
      month: salaryMonth,
      addedBy: state.currentUser?.name || 'Unknown',
      addedById: state.currentUser?.id || '',
    };
    // Sync to backend
    (setSalaries as any)(newEntry);
    setIsSalaryModalOpen(false);
    setWorkerName('');
    setWorkerRole('');
    setSalaryAmount('');
    setSalaryMonth('');
  };

  const uniqueKhataCustomers = useMemo(() => 
    Array.from(new Set(state.khataClients.map(client => client.name))),
    [state.khataClients]
  );

  const availableKhataMaterials = useMemo(() => 
    state.customerRates
      .filter(r => (r.customerName || '').trim().toUpperCase() === (custName || '').trim().toUpperCase())
      .map(r => r.material),
    [custName, state.customerRates]
  );

  // Auto-detect when customer name changes
  const detectKhataClient = () => {
    const name = (custName || '').trim().toUpperCase();
    if (!name) return;
    
    // Check if in khata clients
    const isKhata = state.khataClients.some(k => (k.name || '').trim().toUpperCase() === name);
    setCustType(isKhata ? 'REGULAR' : 'OTHER');
  };

  // Auto-fill rate when material changes
  const detectRate = () => {
    const name = (custName || '').trim().toUpperCase();
    const mat = (material || '').trim().toUpperCase();
    if (!name || !mat) return;
    
    const match = state.customerRates.find(
      r => (r.customerName || '').trim().toUpperCase() === name && 
           (r.material || '').trim().toUpperCase() === mat
    );
    if (match && match.rate > 0) {
      setRate(match.rate.toString());
      setRateUnit(match.rateUnit || 'PER_BRASS');
    }
  };

  useEffect(() => {
    const normalizedVehicle = normalizeVehicleNumber(vehicle);
    if (!normalizedVehicle) return;

    if (EXCLUDED_VEHICLES.some(v => normalizeVehicleNumber(v) === normalizedVehicle)) {
      return;
    }

    const matchedCustomer = state.customers.find(
      customer =>
        normalizeVehicleNumber(customer.vehicleNumber) === normalizedVehicle &&
        customer.customerName?.trim() &&
        customer.id !== editingId
    );

    if (matchedCustomer && !custName.trim()) {
      setCustName(matchedCustomer.customerName);
    }
  }, [vehicle, custName, state.customers, editingId]);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedVehicle = normalizeVehicleNumber(vehicle);
    const matchedCustomer = state.customers.find(
      customer =>
        normalizeVehicleNumber(customer.vehicleNumber) === normalizedVehicle &&
        customer.customerName?.trim() &&
        customer.id !== editingId
    );
    // CRITICAL: Always prioritize the manually entered name (custName) over any matched customer.
    // Auto-fill should only be a suggestion in the UI, not a forced override during save.
    const resolvedCustomerName = custName.trim();
    
    if (!resolvedCustomerName) {
      alert('Customer name is required');
      return;
    }

    const rateNum = isNaN(parseFloat(rate)) ? 0 : parseFloat(rate);
    const tripsNum = isNaN(parseInt(trips)) ? 1 : parseInt(trips);
    const brassNum = isNaN(parseFloat(brass)) ? 0 : parseFloat(brass);
    const weightNum = isNaN(parseFloat(weight)) ? 0 : parseFloat(weight);
    const regularRateConfig = getRegularRateConfig(resolvedCustomerName, material, rateNum, rateUnit);
    const totalAmount = custType === 'REGULAR'
      ? calculateRegularAmount(resolvedCustomerName, material, brassNum, weightNum, tripsNum, rateNum, rateUnit)
      : calculateAmountByUnit(rateUnit, rateNum, brassNum, weightNum, tripsNum);
    const paid = custType === 'REGULAR' ? 0 : (parseFloat(paidAmount) || 0);

    if (editingId) {
      // For edit - sync to backend with updateFlag
      (setCustomers as any)({ id: editingId, updateFlag: true, date: custDate, vehicleNumber: vehicle, customerName: resolvedCustomerName, site: site.trim(), customerType: custType, material: material, trips: tripsNum, brass: brassNum, weight: weightNum, rateUnit: custType === 'REGULAR' ? regularRateConfig.rateUnit : rateUnit, rate: custType === 'REGULAR' ? regularRateConfig.rate : rateNum, amount: totalAmount, paidAmount: paid, status: (parseFloat(paidAmount) || 0) >= totalAmount ? 'PAID' : 'PENDING', addedBy: state.currentUser?.name || 'Unknown', addedById: state.currentUser?.id || '' });
    } else {
      const newEntry = {
        id: Math.random().toString(36).substr(2, 9),
        date: custDate,
        vehicleNumber: vehicle,
        customerName: resolvedCustomerName,
        site: site.trim(),
        customerType: custType,
        material: material,
        trips: tripsNum,
        brass: brassNum,
        weight: weightNum,
        rateUnit: custType === 'REGULAR' ? regularRateConfig.rateUnit : rateUnit,
        rate: custType === 'REGULAR' ? regularRateConfig.rate : rateNum,
        amount: totalAmount,
        paidAmount: paid,
        status: paid >= totalAmount ? 'PAID' : 'PENDING',
        addedBy: state.currentUser?.name || 'Unknown',
        addedById: state.currentUser?.id || '',
      };
      // Sync to backend only - App.tsx will add to state after DB save
      (setCustomers as any)(newEntry);
    }

    // If Khata Client (REGULAR), ensure they are in the Khata registry
    if (custType === 'REGULAR' && resolvedCustomerName) {
      // Only add if not already in khata clients
      const isAlreadyKhata = state.khataClients.some(
        k => k.name.trim().toUpperCase() === resolvedCustomerName.toUpperCase()
      );
      if (!isAlreadyKhata) {
        (setKhataClients as any)({ name: resolvedCustomerName, applyGst: false });
      }
      // Always create/update rate entry for the material (rate can be 0)
      if ((material || '').trim()) {
        (setCustomerRates as any)({ customerName: resolvedCustomerName, material: material, rate: rateNum, rateUnit });
      }
    }

    setIsCustomerModalOpen(false);
    setEditingId(null);
    setCustName('');
    setVehicle('');
    setSite('');
    setMaterial('');
    setBrass('');
    setWeight('');
    setRateUnit('PER_BRASS');
    setRate('');
    setPaidAmount('');
  };

  const handleEditCustomer = (customer: CustomerEntry) => {
    setEditingId(customer.id);
    setCustName(customer.customerName);
    setCustDate(customer.date.split('T')[0]);
    setVehicle(customer.vehicleNumber);
    setSite(customer.site || '');
    setMaterial(customer.material);
    setTrips((customer.trips || 1).toString());
    setBrass(customer.brass.toString());
    setWeight((customer.weight || 0).toString());
    setRateUnit(customer.rateUnit || 'PER_BRASS');
    setRate(customer.rate.toString());
    setPaidAmount(customer.paidAmount.toString());
    setCustType(customer.customerType);
    setIsCustomerModalOpen(true);
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      type: mType,
      amount: parseFloat(mAmount),
      description: mDesc,
      addedBy: state.currentUser?.name || 'Unknown',
      addedById: state.currentUser?.id || '',
    };
    // Sync to backend
    (setMaintenance as any)(newEntry);
    setIsMaintenanceModalOpen(false);
    setMType('');
    setMAmount('');
    setMDesc('');
  };

  useEffect(() => {
    setSearchTerm('');
    setCustomerTypeFilter('ALL');
  }, [activeTab]);
  
  const filteredCustomers = useMemo(() => {
    let result = state.customers;

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
      c.status.toLowerCase().includes(term) ||
      c.date.includes(term) ||
      c.brass.toString().includes(term) ||
      c.rate.toString().includes(term) ||
      c.amount.toString().includes(term) ||
      c.addedBy.toLowerCase().includes(term)
    );
  }, [state.customers, searchTerm, customerTypeFilter]);

  const filteredMaintenance = useMemo(() => {
    if (!searchTerm) return state.maintenance;
    const term = searchTerm.toLowerCase();
    return state.maintenance.filter(m => 
      m.type.toLowerCase().includes(term) ||
      (m.description && m.description.toLowerCase().includes(term)) ||
      m.date.includes(term)
    );
  }, [state.maintenance, searchTerm]);

  const filteredSalaries = useMemo(() => {
    if (!searchTerm) return state.salaries;
    const term = searchTerm.toLowerCase();
    return state.salaries.filter(s => 
      s.workerName.toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term) ||
      s.month.toLowerCase().includes(term) ||
      s.date.includes(term)
    );
  }, [state.salaries, searchTerm]);

  const filteredAssistants = useMemo(() => {
    if (!searchTerm) return state.assistants;
    const term = searchTerm.toLowerCase();
    return state.assistants.filter(a => 
      a.name.toLowerCase().includes(term) ||
      a.phone.toLowerCase().includes(term)
    );
  }, [state.assistants, searchTerm]);

  const filteredCustomerRates = useMemo(() => {
    if (!searchTerm) return state.customerRates;
    const term = searchTerm.toLowerCase();
    return state.customerRates.filter(r => 
      r.customerName.toLowerCase().includes(term) ||
      r.material.toLowerCase().includes(term) ||
      r.rate.toString().includes(term)
    );
  }, [state.customerRates, searchTerm]);

  const stats = useMemo(() => {
    const getAmount = (c: any) => {
      if (c.customerType === 'REGULAR') {
        return calculateRegularAmount(c.customerName, c.material, c.brass, c.weight || 0, c.trips || 1, c.rate, c.rateUnit || 'PER_BRASS');
      }
      return c.amount;
    };
    
    const totalIncome = state.customers.reduce((acc, curr) => acc + getAmount(curr), 0);
    const totalExpenses = state.maintenance.reduce((acc, curr) => acc + curr.amount, 0) + 
                          state.salaries.reduce((acc, curr) => acc + curr.amount, 0);
    const profit = totalIncome - totalExpenses;
    const paid = state.khataPayments.reduce((acc, p) => acc + p.amount, 0) + 
                 state.customers.filter(c => c.customerType === 'OTHER').reduce((acc, c) => acc + c.paidAmount, 0);
    const pending = totalIncome - paid;

    return { totalIncome, totalExpenses, profit, pending, paid };
  }, [state, state.customerRates]);

  const chartData = useMemo(() => {
    // Aggregate data by date for the last 7 days
    const dailyMap: Record<string, { income: number; expense: number }> = {};
    const today = new Date();
    
    // Initialize last 7 days with zeros
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      dailyMap[dateStr] = { income: 0, expense: 0, name: dayName } as any;
    }

    state.customers.forEach(c => {
      const date = (c.date || '').split('T')[0];
      if (dailyMap[date]) {
        let amt = c.amount;
        if (c.customerType === 'REGULAR') {
          amt = calculateRegularAmount(c.customerName, c.material, c.brass, c.weight || 0, c.trips || 1, c.rate, c.rateUnit || 'PER_BRASS');
        }
        dailyMap[date].income += amt;
      }
    });

    state.maintenance.forEach(m => {
      const date = (m.date || '').split('T')[0];
      if (dailyMap[date]) {
        dailyMap[date].expense += m.amount;
      }
    });

    state.salaries.forEach(s => {
      const date = (s.date || '').split('T')[0];
      if (dailyMap[date]) {
        dailyMap[date].expense += s.amount;
      }
    });

    return Object.values(dailyMap).sort((a: any, b: any) => {
      // name is short day string, not ideal for sorting, but they are already ordered correctly in the loop above
      return 0; 
    });
  }, [state.customers, state.maintenance, state.salaries]);

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Day Start/End Control */}
      <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative group">
        <div className="relative z-10">
          <h3 className="text-sm font-bold text-text-main uppercase tracking-widest flex items-center mb-1">
            <Clock className="h-4 w-4 mr-2 text-primary" /> Operational Window
          </h3>
          <p className="text-xs text-text-muted">Currently {state.isDayStarted ? 'recording entries' : 'locked for assistants'}</p>
        </div>
        
        <div className="flex items-center space-x-3 relative z-10">
          {!state.isDayStarted ? (
            <button 
              onClick={() => setIsDayStarted(true)}
              className="flex items-center px-6 py-3 bg-success text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-success/90 transition-all shadow-lg shadow-success/20 group/btn"
            >
              <CheckCircle2 className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" /> Start Day
            </button>
          ) : (
            <button 
              onClick={() => setIsDayStarted(false)}
              className="flex items-center px-6 py-3 bg-danger text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-danger/90 transition-all shadow-lg shadow-danger/20 group/btn"
            >
              <X className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" /> End Day
            </button>
          )}
        </div>

        {/* Decorative background element */}
        <div className={cn(
          "absolute right-0 top-0 h-full w-1/3 opacity-[0.03] pointer-events-none transition-colors duration-500",
          state.isDayStarted ? "bg-success" : "bg-danger"
        )} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Income', value: stats.totalIncome, icon: TrendingUp, color: 'text-success', bg: 'bg-success/5' },
          { label: 'Total Expenses', value: stats.totalExpenses, icon: TrendingDown, color: 'text-danger', bg: 'bg-danger/5' },
          { label: 'Net Profit', value: stats.profit, icon: Wallet, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Pending Dues', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/5' },
          { label: 'Paid Amount', value: stats.paid, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 rounded-xl bg-white border border-border-subtle shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={cn("text-xl font-bold text-text-main tracking-tight", stat.label === 'Total Income' && 'text-success', stat.label === 'Total Expenses' && 'text-danger')}>
              {formatCurrency(stat.value)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-base font-bold text-text-main">Performance Overview</h3>
            <p className="text-xs text-text-muted mt-1">Real-time Income vs Expenses</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-sm bg-primary mr-2" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Income</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-sm bg-warning mr-2" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Expense</span>
            </div>
          </div>
        </div>
        <div className="min-h-[350px] w-full flex items-center justify-center">
          {chartData.every(d => d.income === 0 && d.expense === 0) ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center p-4 bg-bg-surface rounded-full mb-4">
                <TrendingUp className="h-8 w-8 text-text-muted opacity-20" />
              </div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">No activity in the last 7 days</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(val) => `₹${val/1000}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="income" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="expense" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-text-main">Customer Billing System</h3>
          <p className="text-xs text-text-muted mt-0.5">Manage transaction logs and financial records</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <select
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value as any)}
            className="px-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none cursor-pointer uppercase tracking-widest w-full sm:w-auto"
          >
            <option value="ALL">All Customers</option>
            <option value="REGULAR">Regular Only</option>
            <option value="OTHER">Others Only</option>
          </select>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Filter transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none w-full sm:w-64"
            />
          </div>
          <button 
            onClick={() => setIsCustomerModalOpen(true)}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-all whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2" /> NEW ENTRY
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-[1000px] w-full text-left">
          <thead>
            <tr className="bg-bg-surface border-b-2 border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-widest">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Vehicle Identity</th>
              <th className="px-6 py-4">Customer Entity</th>
              <th className="px-6 py-4">Site</th>
              <th className="px-6 py-4">Material Specification</th>
              <th className="px-6 py-4">Trips</th>
              <th className="px-6 py-4">Brass</th>
              <th className="px-6 py-4">Weight</th>
              <th className="px-6 py-4">Rate Unit</th>
              <th className="px-6 py-4">Rate (₹)</th>
              <th className="px-6 py-4">Total (₹)</th>
              <th className="px-6 py-4">Paid (₹)</th>
              <th className="px-6 py-4">Balance (₹)</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-tight">Logged By</th>
              <th className="px-6 py-4 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-bg-surface/50 transition-colors group">
                <td className="px-6 py-4 text-xs font-medium text-text-muted">{formatDate(customer.date)}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-bg-surface text-text-main text-[10px] font-bold rounded-md border border-border-subtle uppercase">
                    {customer.vehicleNumber}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-text-main uppercase">{customer.customerName}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-tight font-bold">{customer.customerType} CLIENT</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-text-main uppercase">{customer.site || '-'}</td>
                <td className="px-6 py-4 text-xs font-medium text-text-main">{customer.material}</td>
                <td className="px-6 py-4 text-xs font-bold text-text-main">{customer.trips || 1}</td>
                <td className="px-6 py-4 text-xs font-bold text-text-main">{customer.brass} <span className="text-text-muted font-normal uppercase tracking-tighter">BRS</span></td>
                <td className="px-6 py-4 text-xs font-bold text-text-main">{customer.weight || 0}</td>
                <td className="px-6 py-4 text-xs font-bold text-text-muted uppercase">{formatRateUnit(customer.rateUnit || 'PER_BRASS')}</td>
                <td className="px-6 py-4 text-xs font-bold text-text-muted">{formatCurrency(customer.rate)}</td>
                <td className="px-6 py-4 text-xs font-bold text-text-main">
                    {customer.customerType === 'REGULAR'
                      ? formatCurrency(calculateRegularAmount(customer.customerName, customer.material, customer.brass, customer.weight || 0, customer.trips || 1, customer.rate, customer.rateUnit || 'PER_BRASS'))
                      : formatCurrency(customer.amount)}
                </td>
                <td className="px-6 py-4 text-xs font-bold text-success">
                  {customer.customerType === 'REGULAR' ? '-' : formatCurrency(customer.paidAmount)}
                </td>
                <td className="px-6 py-4 text-xs font-bold text-danger">
                  {customer.customerType === 'REGULAR' ? '-' : formatCurrency(customer.amount - customer.paidAmount)}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide",
                    customer.customerType === 'REGULAR'
                      ? "bg-primary/10 text-primary"
                      : customer.status === 'PAID' 
                        ? "bg-success/10 text-success" 
                        : "bg-warning/10 text-warning"
                  )}>
                    {customer.customerType === 'REGULAR' ? 'KHATA' : customer.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                      {(customer.addedBy || '').split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">{customer.addedBy}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => handleEditCustomer(customer)}
                      className="text-primary hover:text-primary-dark transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => deleteRecord('customers', customer.id)}
                      className="text-danger hover:text-danger/80 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );

  const renderSalaries = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-main">Salary Management</h2>
          <p className="text-sm text-text-muted">Track and process worker compensation logs</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search payroll..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-border-subtle rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none w-full sm:w-56"
            />
          </div>
          <button 
            onClick={() => setIsSalaryModalOpen(true)}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/10 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2" /> PAY SALARY
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-[600px] w-full text-left">
            <thead>
              <tr className="bg-bg-surface border-b-2 border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Worker</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Month</th>
                <th className="px-6 py-4">Paid On</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredSalaries.map((salary) => (
                <tr key={salary.id} className="hover:bg-bg-surface/50">
                  <td className="px-6 py-4 text-sm font-bold text-text-main uppercase">{salary.workerName}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{salary.role}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-text-main font-semibold uppercase">{salary.month}</td>
                  <td className="px-6 py-4 text-xs text-text-muted font-medium">{formatDate(salary.date)}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-primary">{formatCurrency(salary.amount)}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => deleteRecord('salaries', salary.id)}
                      className="text-danger hover:text-danger/80 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-[#0F172A] p-6 rounded-xl text-white shadow-xl">
            <Briefcase className="h-6 w-6 mb-4 text-primary" />
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest">Total Payroll</h4>
            <p className="text-2xl font-black mt-2 tracking-tight">{formatCurrency(state.salaries.reduce((acc, curr) => acc + curr.amount, 0))}</p>
            <p className="text-[10px] font-medium text-white/40 mt-3 uppercase tracking-tighter">Current quarter overhead accumulated</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm">
            <h4 className="text-xs font-bold text-text-main uppercase tracking-widest mb-4 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-primary" /> Pending Actions
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] p-3 bg-bg-surface rounded-lg border border-border-subtle border-dashed">
                <span className="font-bold text-text-muted uppercase tracking-tight italic">No pending salary actions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAssistants = () => (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-main">Assistant Management</h2>
          <p className="text-sm text-text-muted">Control access permissions and monitor staff activities</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-border-subtle rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none w-full sm:w-56"
            />
          </div>
            {isOwner && (
              <button 
                onClick={() => setIsAssistantModalOpen(true)}
                className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-all whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4 mr-2" /> ADD ASSISTANT
              </button>
            )}
          </div>
        </div>

        {!isOwner && (
          <div className="bg-bg-surface border border-border-subtle rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Assistant access can view staff activity but cannot add or remove assistants.
            </p>
          </div>
        )}
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssistants.map((assistant) => {
          const billingCount = state.customers.filter(c => c.addedById === assistant.id).length;
          const maintenanceCount = state.maintenance.filter(m => m.addedById === assistant.id).length;
          
          return (
            <motion.div 
              key={assistant.id}
              whileHover={{ y: -2 }}
                className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm relative overflow-hidden group"
              >
                {isOwner && (
                  <div className="absolute top-0 right-0 p-4 flex space-x-2">
                    <button 
                      onClick={() => handleRemoveAssistant(assistant.id)}
                      className="text-text-muted hover:text-danger transition-colors p-1"
                      title="Remove Assistant"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-bg-surface border border-border-subtle rounded-full flex items-center justify-center text-text-main font-bold text-xs uppercase">
                  {(assistant.name || '').split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-main uppercase">{assistant.name}</h4>
                  <p className="text-text-muted text-[10px] font-bold">{assistant.phone}</p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-border-subtle">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-3">Activity Metrics</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-bg-surface rounded-lg border border-border-subtle">
                    <p className="text-sm font-black text-text-main">{billingCount}</p>
                    <p className="text-[8px] font-bold text-text-muted uppercase mt-0.5">Billings</p>
                  </div>
                  <div className="p-3 bg-bg-surface rounded-lg border border-border-subtle">
                    <p className="text-sm font-black text-text-main">{maintenanceCount}</p>
                    <p className="text-[8px] font-bold text-text-muted uppercase mt-0.5">Maint Logs</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-text-muted">System Access</span>
                  <span className="text-warning">Restricted</span>
                </div>
                <div className="flex flex-wrap gap-1.5 font-bold uppercase">
                  <span className="px-2 py-0.5 bg-success/5 text-success rounded text-[9px]">Data Entry</span>
                  <span className="px-2 py-0.5 bg-success/5 text-success rounded text-[9px]">View Logs</span>
                  <span className="px-2 py-0.5 bg-danger/5 text-danger rounded text-[9px]">No Financials</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

   const renderKhata = () => {
     const clients = (state.khataClients || []).filter(client => 
       client?.name &&
       client.name.toLowerCase().includes((searchTerm || '').toLowerCase())
     );

    const clientRates = state.customerRates.filter(r => 
      selectedKhataClient && 
      (r.customerName || '').trim().toUpperCase() === selectedKhataClient.trim().toUpperCase()
    );
    
    // Financial Summary for Selected Khata Client
    const clientTransactions = state.customers.filter(c => 
      selectedKhataClient && 
      c.customerName.trim().toUpperCase() === selectedKhataClient.trim().toUpperCase()
    );
    const clientPayments = state.khataPayments.filter(p => 
      selectedKhataClient && 
      p.customerName.trim().toUpperCase() === selectedKhataClient.trim().toUpperCase()
    );
    
    const getAmount = (c: any) => {
      return c.customerType === 'REGULAR'
        ? calculateRegularAmount(c.customerName, c.material, c.brass, c.weight || 0, c.trips || 1, c.rate, c.rateUnit || 'PER_BRASS')
        : c.amount;
    };
    
    const clientTotalValuation = clientTransactions.reduce((acc, curr) => acc + getAmount(curr), 0);
    const clientTransactionsPaid = clientTransactions.reduce((acc, curr) => acc + curr.paidAmount, 0);
    const clientKhataPayments = clientPayments.reduce((acc, curr) => acc + curr.amount, 0);
    
    const clientTotalPaid = clientTransactionsPaid + clientKhataPayments;
    const clientBalance = clientTotalValuation - clientTotalPaid;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-main">Rate Master (Khata)</h2>
            <p className="text-sm text-text-muted">Manage regular client material rates in an organized way</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search Client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-border-subtle rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none w-full sm:w-56"
              />
            </div>
            <button 
              onClick={() => setIsKhataClientModalOpen(true)}
              className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-md whitespace-nowrap"
            >
              <FolderPlus className="h-4 w-4 mr-2" /> NEW CLIENT
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Client List */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden h-fit">
            <div className="p-4 bg-bg-surface border-b border-border-subtle flex justify-between items-center">
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Client Registry</h3>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{clients.length} Total</span>
            </div>
            <div className="divide-y divide-border-subtle max-h-[500px] overflow-y-auto">
              {clients.map(client => (
                <div key={client.id} className="flex items-center justify-between px-6 py-4 transition-all hover:bg-bg-surface">
                  <button
                    onClick={() => setSelectedKhataClient(client.name)}
                    className={cn(
                      "flex items-center flex-1",
                      selectedKhataClient === client.name ? "border-l-4 border-primary bg-primary/5 -ml-px pl-4" : ""
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center mr-3 font-bold text-xs shadow-sm",
                      selectedKhataClient === client.name ? "bg-primary text-white" : "bg-bg-surface text-text-muted"
                    )}>
                      {client.name[0]}
                    </div>
                    <span className={cn(
                      "text-sm font-bold tracking-tight uppercase",
                      selectedKhataClient === client.name ? "text-primary" : "text-text-main"
                    )}>{client.name}</span>
                  </button>
                  {client.applyGst && (
                    <span className="mr-2 px-2 py-0.5 bg-success/10 text-success rounded-full text-[9px] font-bold uppercase tracking-widest">
                      GST
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditKhataClient(client);
                    }}
                    className="p-2 text-text-muted hover:text-primary transition-colors"
                    title="Edit Client"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete client "${client.name}"?`)) {
                        handleRemoveKhataClient(client);
                      }
                    }}
                    className="p-2 text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {clients.length === 0 && (
                <div className="p-12 text-center text-text-muted italic text-xs">
                  No clients found.
                </div>
              )}
            </div>
          </div>

          {/* Rates Detail Panel */}
          <div className="lg:col-span-2 space-y-6">
            {selectedKhataClient ? (
              <div className="bg-white rounded-xl border border-border-subtle shadow-lg overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b border-border-subtle bg-bg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-text-main uppercase tracking-tight">{selectedKhataClient}</h3>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Material Rate Master</p>
                    {selectedKhataClientData && (
                      <p className="text-[10px] font-bold uppercase tracking-widest mt-2 text-success">
                        GST: {selectedKhataClientData.applyGst ? 'Applied at 5%' : 'Not Applied'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setIsKhataPaymentModalOpen(true)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-success text-white rounded-lg text-xs font-bold hover:opacity-90 flex items-center justify-center shadow-md shadow-success/10 whitespace-nowrap"
                    >
                      <IndianRupee className="h-3 w-3 mr-1.5" /> LOG PAYMENT
                    </button>
                    <button 
                      onClick={handlePrintKhataBill}
                      className="flex-1 sm:flex-none px-4 py-2 bg-warning text-white rounded-lg text-xs font-bold hover:opacity-90 flex items-center justify-center shadow-md shadow-warning/10 whitespace-nowrap"
                    >
                      <Printer className="h-3 w-3 mr-1.5" /> PRINT BILL
                    </button>
                    <button 
                      onClick={() => {
                        setKhataCustName(selectedKhataClient);
                        setIsKhataModalOpen(true);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-[#0F172A] text-white rounded-lg text-xs font-bold hover:opacity-90 flex items-center justify-center whitespace-nowrap"
                    >
                      <Plus className="h-3 w-3 mr-1.5" /> ADD MATERIAL
                    </button>
                    <button 
                      onClick={() => selectedKhataClientData && handleRemoveKhataClient(selectedKhataClientData)}
                      className="p-2 text-danger hover:bg-danger/5 rounded-lg border border-danger/20 transition-all shadow-sm flex items-center justify-center"
                      title="Remove Client"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Client Financial Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle border-b border-border-subtle bg-bg-surface/20">
                  <div className="p-4">
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Total Billing</p>
                    <p className="text-sm font-black text-text-main">{formatCurrency(clientTotalValuation)}</p>
                  </div>
                  <div className="p-4 border-t sm:border-t-0">
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Total Received</p>
                    <p className="text-sm font-black text-success">{formatCurrency(clientTotalPaid)}</p>
                  </div>
                  <div className="p-4 border-t sm:border-t-0">
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Outstanding Balance</p>
                    <p className={cn("text-sm font-black", clientBalance > 0 ? "text-danger" : "text-success")}>
                      {formatCurrency(clientBalance)}
                    </p>
                  </div>
                </div>

                {/* Tabs for Mobile UX */}
                <div className="flex border-b border-border-subtle bg-white sticky top-0 z-10">
                  <button 
                    onClick={() => setKhataDetailTab('RATES')}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                      khataDetailTab === 'RATES' ? "text-primary border-b-2 border-primary bg-primary/5" : "text-text-muted hover:bg-bg-surface"
                    )}
                  >
                    Material Rates
                  </button>
                  <button 
                    onClick={() => setKhataDetailTab('PAYMENTS')}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                      khataDetailTab === 'PAYMENTS' ? "text-primary border-b-2 border-primary bg-primary/5" : "text-text-muted hover:bg-bg-surface"
                    )}
                  >
                    Payment History
                  </button>
                </div>

                {khataDetailTab === 'RATES' ? (
                  <div className="overflow-x-auto min-h-[300px]">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full w-full text-left">
                        <thead>
                          <tr className="bg-bg-surface/30 border-b border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-widest">
                            <th className="px-6 py-4 font-black">Material Type</th>
                            <th className="px-6 py-4 font-black">Contract Rate</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {clientRates.map(rate => (
                            <tr key={rate.id} className="hover:bg-bg-surface/10 group">
                              <td className="px-6 py-4">
                                <span className="text-xs font-bold text-text-main uppercase bg-bg-surface px-2 py-1 rounded border border-border-subtle whitespace-nowrap">
                                  {rate.material}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center text-primary font-black text-sm whitespace-nowrap">
                                  <IndianRupee className="h-3.5 w-3.5 mr-1" />
                                  {rate.rate.toLocaleString()}
                                  <span className="ml-1.5 text-[9px] text-text-muted font-bold opacity-60">/ {rate.rateUnit === 'PER_WEIGHT' ? 'WEIGHT' : 'BRS'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end space-x-2">
                                  <button 
                                    onClick={() => handleEditKhata(rate)}
                                    className="p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-md transition-all"
                                    title="Edit Rate"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveKhata(rate.id)}
                                    className="p-2 text-text-muted hover:text-danger hover:bg-danger/5 rounded-md transition-all"
                                    title="Remove Rate"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {clientRates.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-6 py-12 text-center text-text-muted italic text-[11px] font-medium bg-white">
                                No materials registered for this client. Click "Add Material" to define rates.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto min-h-[300px]">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full w-full text-left">
                        <thead>
                          <tr className="bg-bg-surface/30 border-b border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-widest">
                            <th className="px-6 py-4 font-black">Date</th>
                            <th className="px-6 py-4 font-black">Amount</th>
                            <th className="px-6 py-4 font-black">Method</th>
                            <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {clientPayments.map(payment => (
                            <tr key={payment.id} className="hover:bg-bg-surface/10 group">
                              <td className="px-6 py-4 text-xs font-medium text-text-muted whitespace-nowrap">
                                {formatDate(payment.date)}
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-black text-success whitespace-nowrap">
                                  {formatCurrency(payment.amount)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-[10px] font-bold text-text-muted uppercase bg-bg-surface px-2 py-0.5 rounded border border-border-subtle whitespace-nowrap">
                                  {payment.paymentMethod}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleRemoveKhataPayment(payment.id)}
                                  className="p-2 text-text-muted hover:text-danger hover:bg-danger/5 rounded-md transition-all"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {clientPayments.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-10 text-center text-text-muted italic text-[11px] font-medium bg-white">
                                No bulk payments logged for this client yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-xl border-2 border-dashed border-border-subtle text-text-muted space-y-4">
                <BookOpen className="h-12 w-12 opacity-10" />
                <div className="text-center">
                  <p className="text-sm font-bold uppercase tracking-widest mb-1 italic">Select a client from the registry</p>
                  <p className="text-[10px] font-medium max-w-sm">
                    Review and maintain material-specific pricing contracts for your regular stone crusher clients.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMaintenance = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-main">Operations & Maintenance</h2>
          <p className="text-sm text-text-muted">Monitor industrial asset logs and expenditure tracking</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-border-subtle rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none w-full sm:w-56"
            />
          </div>
          <button 
            onClick={() => setIsMaintenanceModalOpen(true)}
            className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/10 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2" /> LOG MAINTENANCE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Maintenance Stats */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0F172A] p-6 rounded-xl text-white shadow-xl">
            <Wrench className="h-6 w-6 mb-4 text-primary" />
            <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Total Maintenance Cost</h4>
            <p className="text-2xl font-black mt-2 tracking-tight">
              {formatCurrency(state.maintenance.reduce((acc, curr) => acc + curr.amount, 0))}
            </p>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-tighter">
              <span>Monthly Avg</span>
              <span className="text-white/60">₹{Math.round(state.maintenance.reduce((acc, curr) => acc + curr.amount, 0) / 12).toLocaleString()}</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm">
            <h4 className="text-[10px] font-bold text-text-main uppercase tracking-widest mb-4 flex items-center">
              <Filter className="h-3 w-3 mr-2 text-primary" /> Category Distribution
            </h4>
            <div className="space-y-3">
              {Array.from(new Set(state.maintenance.map(m => m.type))).slice(0, 4).map((type) => {
                const total = state.maintenance.filter(m => m.type === type).reduce((acc, curr) => acc + curr.amount, 0);
                const percentage = Math.round((total / (state.maintenance.reduce((acc, curr) => acc + curr.amount, 0) || 1)) * 100);
                return (
                  <div key={type} className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-tight">
                      <span className="text-text-main">{type}</span>
                      <span className="text-text-muted">{percentage}%</span>
                    </div>
                    <div className="h-1 bg-bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Maintenance Log Registry */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full w-full text-left">
                <thead>
                  <tr className="bg-bg-surface border-b border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-6 py-4">Service Date</th>
                    <th className="px-6 py-4">Entry Details</th>
                    <th className="px-6 py-4">Logged By</th>
                    <th className="px-6 py-4 text-right">Expenditure</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredMaintenance.map((m) => (
                    <tr key={m.id} className="hover:bg-bg-surface/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-text-main">{formatDate(m.date)}</span>
                          <span className="text-[9px] text-text-muted font-medium uppercase tracking-tighter">ID: {m.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-text-main uppercase tracking-tight">{m.type}</span>
                          {m.description && (
                            <span className="text-[10px] text-text-muted mt-0.5 line-clamp-1 italic">{m.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20 mr-2 uppercase">
                            {(m.addedBy || 'U').split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-tight">{m.addedBy || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-danger">{formatCurrency(m.amount)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => deleteRecord('maintenance', m.id)}
                            className="p-2 text-text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-all"
                            title="Delete Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredMaintenance.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-text-muted italic text-xs font-medium">
                        No maintenance records found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'maintenance' && renderMaintenance()}
          {activeTab === 'salaries' && renderSalaries()}
          {activeTab === 'khata' && renderKhata()}
          {activeTab === 'staff' && renderAssistants()}
          {activeTab === 'settings' && (
            <SettingsContent 
              user={state.currentUser!}
              settings={state.notificationSettings} 
              onSettingsChange={setNotificationSettings} 
              onProfileUpdate={syncProfile}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <Modal 
        isOpen={isMaintenanceModalOpen} 
        onClose={() => setIsMaintenanceModalOpen(false)}
        title="Log Maintenance Expenditure"
      >
        <form onSubmit={handleAddMaintenance} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Maintenance Category</label>
            <input 
              type="text" required value={mType} onChange={e => setMType(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. Spare Parts, Fuel, Greasing"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Amount (₹)</label>
            <input 
              type="number" required value={mAmount} onChange={e => setMAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Description (Optional)</label>
            <textarea 
              value={mDesc} onChange={e => setMDesc(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none h-24 resize-none"
              placeholder="Add details about the maintenance service..."
            />
          </div>
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              <Save className="h-4 w-4 mr-2" /> Save Log
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isCustomerModalOpen} 
        onClose={() => {
          setIsCustomerModalOpen(false);
          setEditingId(null);
          setCustName('');
          setVehicle('');
          setSite('');
          setMaterial('');
          setBrass('');
          setRate('');
          setPaidAmount('');
        }}
        title={editingId ? "Update Billing Record" : "New Billing Record"}
      >
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Entry Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input 
                type="date" required value={custDate} onChange={e => setCustDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Customer Type</label>
              <select 
                value={custType} onChange={e => setCustType(e.target.value as CustomerType)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              >
                <option value="REGULAR">Khata Client</option>
                <option value="OTHER">One-Time Client</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Vehicle Number</label>
              <input 
                type="text" required value={vehicle} onChange={e => setVehicle(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
                placeholder="ABC-123"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Customer Name</label>
            <input 
              type="text" required value={custName} onChange={e => {
                setCustName(e.target.value);
                // Check if Khata client
                const name = (e.target.value || '').trim().toUpperCase();
                const isKhata = state.khataClients.some(k => (k.name || '').trim().toUpperCase() === name);
                if (isKhata) setCustType('REGULAR');
                else if (name) setCustType('OTHER');
              }}
              list="khata-customers"
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              placeholder="Enter customer name"
            />
            <datalist id="khata-customers">
              {uniqueKhataCustomers.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Site</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input 
                type="text"
                value={site}
                onChange={e => setSite(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
                placeholder="Delivery Site / Location"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Material</label>
            <input 
              type="text" required value={material} onChange={e => setMaterial(e.target.value)}
              list="khata-materials"
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              placeholder="e.g. 20mm aggregate"
            />
            <datalist id="khata-materials">
              {availableKhataMaterials.map(m => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Trips</label>
              <input 
                type="number" required value={trips} onChange={e => setTrips(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
                placeholder="1"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Brass Quantity</label>
              <input 
                type="number" step="0.01" value={brass} onChange={e => setBrass(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Weight</label>
              <input 
                type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
                placeholder="0.00"
              />
            </div>
            {custType !== 'REGULAR' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Rate (₹)</label>
                <input 
                  type="number" required value={rate} onChange={e => setRate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
          {custType !== 'REGULAR' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Rate Unit</label>
              <select
                value={rateUnit}
                onChange={e => setRateUnit(e.target.value as RateUnit)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              >
                <option value="PER_BRASS">Per Brass</option>
                <option value="PER_WEIGHT">Per Weight</option>
              </select>
            </div>
          )}
          {custType !== 'REGULAR' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-primary">Amount Paid (₹)</label>
              <input 
                type="number" required value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
                placeholder="0.00"
              />
            </div>
          )}
          <div className="pt-4 border-t border-border-subtle mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-text-muted uppercase">Total Valuation</span>
              <span className="text-sm font-black text-text-main">
                ₹{(
                  custType === 'REGULAR'
                    ? calculateRegularAmount(custName, material, parseFloat(brass) || 0, parseFloat(weight) || 0, parseInt(trips) || 1, parseFloat(rate) || 0, rateUnit)
                    : calculateAmountByUnit(rateUnit, parseFloat(rate) || 0, parseFloat(brass) || 0, parseFloat(weight) || 0, parseInt(trips) || 1)
                ).toLocaleString()}
              </span>
            </div>
            {custType !== 'REGULAR' && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-text-muted uppercase">Balance Remaining</span>
                <span className="text-sm font-black text-danger">
                  ₹{((calculateAmountByUnit(rateUnit, parseFloat(rate) || 0, parseFloat(brass) || 0, parseFloat(weight) || 0, parseInt(trips) || 1) - (parseFloat(paidAmount) || 0))).toLocaleString()}
                </span>
              </div>
            )}
            <button 
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              <Save className="h-4 w-4 mr-2" /> {editingId ? "Update Billing Entry" : "Save Billing Entry"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isSalaryModalOpen} 
        onClose={() => setIsSalaryModalOpen(false)}
        title="Process Salary Payment"
      >
        <form onSubmit={handleAddSalary} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Worker Name</label>
            <input 
              type="text" required value={workerName} onChange={e => setWorkerName(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              placeholder="e.g. Ganpat Rao"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Designation/Role</label>
              <input 
                type="text" required value={workerRole} onChange={e => setWorkerRole(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
                placeholder="e.g. Driver"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Salary Month</label>
              <input 
                type="text" required value={salaryMonth} onChange={e => setSalaryMonth(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
                placeholder="March 2024"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Amount (₹)</label>
            <input 
              type="number" required value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
              placeholder="0.00"
            />
          </div>
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              <Save className="h-4 w-4 mr-2" /> Confirm Payment
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isAssistantModalOpen} 
        onClose={() => setIsAssistantModalOpen(false)}
        title="Add New Assistant Staff"
      >
        <form onSubmit={handleAddAssistant} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Full Name</label>
            <input 
              type="text" required value={assistantName} onChange={e => setAssistantName(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              placeholder="Staff Name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Phone Number (Login ID)</label>
            <input 
              type="text" required value={assistantPhone} onChange={e => setAssistantPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              placeholder="e.g. 9370763003"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Login Password</label>
            <input 
              type="password" required value={assistantPassword} onChange={e => setAssistantPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
              placeholder="••••••••"
            />
          </div>
          <div className="pt-4 border-t border-border-subtle mt-4">
            <div className="p-3 bg-bg-surface rounded-lg border border-border-subtle mb-4">
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tight leading-relaxed">
                By adding an assistant, you grant them permission to log billing and maintenance data. They cannot view financial totals or delete records.
              </p>
            </div>
            <button 
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              <UserPlus className="h-4 w-4 mr-2" /> Register Staff
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isKhataClientModalOpen} 
        onClose={() => {
          setIsKhataClientModalOpen(false);
          setEditingKhataClientId(null);
          setNewKhataClientName('');
          setNewKhataClientApplyGst(false);
        }}
        title={editingKhataClientId ? "Edit Khata Client" : "Register New Khata Client"}
      >
        <form onSubmit={handleAddKhataClient} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Client / Contractor Name</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input 
                type="text"
                required
                value={newKhataClientName}
                onChange={e => setNewKhataClientName(e.target.value)}
                readOnly={Boolean(editingKhataClientId)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
                placeholder="Business Name or Owner Name"
              />
            </div>
            {editingKhataClientId && (
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-tight">
                Client name is locked during edit. You can update the GST setting here.
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newKhataClientApplyGst}
                onChange={e => setNewKhataClientApplyGst(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary"
              />
              <span className="space-y-1">
                <span className="block text-[11px] font-bold text-text-main uppercase tracking-widest">Apply 5% GST</span>
                <span className="block text-[10px] font-medium text-text-muted">
                  When enabled, this client&apos;s regular billing total includes 5% GST automatically.
                </span>
              </span>
            </label>
          </div>
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              <Save className="h-4 w-4 mr-2" /> {editingKhataClientId ? "Update Khata Client" : "Add Client to Registry"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isKhataModalOpen} 
        onClose={() => {
          setIsKhataModalOpen(false);
          setEditingKhataId(null);
        }}
        title={editingKhataId ? "Edit Contract Rate" : "Add Fixed Client Rate (Khata)"}
      >
        <form onSubmit={handleAddKhata} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Regular Customer Name</label>
            <input 
              type="text" required value={khataCustName} onChange={e => setKhataCustName(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              placeholder="e.g. Mauli Builders"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Material Type</label>
            <input 
              type="text" required value={khataMaterial} onChange={e => setKhataMaterial(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              placeholder="e.g. 20mm aggregate"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Rate Unit</label>
            <select
              value={khataRateUnit}
              onChange={e => setKhataRateUnit(e.target.value as RateUnit)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
            >
              <option value="PER_BRASS">Per Brass</option>
              <option value="PER_WEIGHT">Per Weight</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Fixed Rate (₹ Per Brass)</label>
            <input 
              type="number" required value={khataRate} onChange={e => setKhataRate(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
              placeholder="0.00"
            />
          </div>
          <div className="pt-4 mt-2">
            <button 
              type="submit"
              className="w-full bg-[#0F172A] text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center shadow-lg hover:opacity-90 transition-all"
            >
              <Save className="h-4 w-4 mr-2" /> {editingKhataId ? "Update Khata Entry" : "Save Khata Entry"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isKhataPaymentModalOpen} 
        onClose={() => setIsKhataPaymentModalOpen(false)}
        title={`Log Payment from ${selectedKhataClient}`}
      >
        <form onSubmit={handleAddKhataPayment} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Amount Received (₹)</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input 
                type="number" required value={kpAmount} onChange={e => setKpAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Payment Method</label>
            <select 
              value={kpMethod} onChange={e => setKpMethod(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              required
            >
              <option value="">Select Method</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI (PhonePe/GPAY)</option>
              <option value="RTGS">RTGS / Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Notes / Description</label>
            <textarea 
              value={kpDescription} onChange={e => setKpDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none h-20 resize-none"
              placeholder="Any additional details..."
            />
          </div>
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-success text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center shadow-lg shadow-success/20 hover:opacity-90 transition-all font-black"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Payment Receipt
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
