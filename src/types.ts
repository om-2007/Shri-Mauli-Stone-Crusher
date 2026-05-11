/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'OWNER' | 'ASSISTANT';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  password?: string;
}

export type CustomerType = 'REGULAR' | 'OTHER';

export interface CustomerEntry {
  id: string;
  date: string;
  vehicleNumber: string;
  customerName: string;
  customerType: CustomerType;
  material: string;
  brass: number;
  rate: number; // Added rate field
  amount: number; // Total Valuation (Brass * Rate)
  paidAmount: number; // Amount paid by customer
  status: 'PAID' | 'PENDING';
  addedBy: string;
  addedById: string; // Tracks which user created the billing record
}

export interface MaintenanceEntry {
  id: string;
  date: string;
  type: string;
  amount: number; // Input by Assistant, hidden in UI for Assistant
  description?: string;
  addedBy?: string;
  addedById: string; // To track who added the maintenance record
}

export interface SalaryEntry {
  id: string;
  date: string;
  workerName: string;
  role: string;
  amount: number;
  month: string;
}

export interface CustomerRate {
  id: string;
  customerName: string; // Linking by name for now as per system design
  material: string;
  rate: number;
}

export interface KhataClient {
  id: string;
  name: string;
  applyGst: boolean;
}

export interface KhataPayment {
  id: string;
  date: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  description?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
  date: string;
  isRead: boolean;
  link?: string;
}

export interface NotificationSettings {
  enableKhataReminders: boolean;
  enableMaintenanceAlerts: boolean;
}

export interface AppState {
  currentUser: User | null;
  customers: CustomerEntry[];
  maintenance: MaintenanceEntry[];
  salaries: SalaryEntry[];
  assistants: User[];
  customerRates: CustomerRate[];
  khataClients: KhataClient[];
  khataPayments: KhataPayment[];
  notifications: Notification[];
  notificationSettings: NotificationSettings;
  isDayStarted: boolean; // Controls if assistants can add/edit records
}
