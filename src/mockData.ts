import { CustomerEntry, MaintenanceEntry, SalaryEntry, User, CustomerRate, KhataPayment } from './types';

export const MOCK_OWNER: User = {
  id: 'o1',
  name: 'Nilesh Karande',
  phone: '9370763003',
  role: 'OWNER',
};

export const MOCK_ASSISTANTS: User[] = [
  {
    id: 'a1',
    name: 'assistant',
    phone: '8888888888',
    role: 'ASSISTANT',
  }
];

export const MOCK_CUSTOMERS: CustomerEntry[] = [
  {
    id: 'c1',
    date: '2024-03-20',
    vehicleNumber: 'MH-12-AB-1234',
    customerName: 'Mauli Builders',
    site: 'Main Crusher Yard',
    customerType: 'REGULAR',
    material: 'Crushed Stone (20mm)',
    brass: 2.5,
    rate: 6000,
    amount: 15000,
    paidAmount: 15000,
    status: 'PAID',
    addedBy: 'Nilesh Karande',
    addedById: 'o1',
  },
  {
    id: 'c2',
    date: '2024-03-21',
    vehicleNumber: 'MH-14-XY-5678',
    customerName: 'Global Infra',
    site: 'River Sand Depot',
    customerType: 'OTHER',
    material: 'Dust',
    brass: 4.0,
    rate: 3000,
    amount: 12000,
    paidAmount: 5000,
    status: 'PENDING',
    addedBy: 'assistant',
    addedById: 'a1',
  },
  {
    id: 'c3',
    date: '2024-03-21',
    vehicleNumber: 'MH-12-PQ-9999',
    customerName: 'Mauli Builders',
    site: 'Main Crusher Yard',
    customerType: 'REGULAR',
    material: 'Crushed Stone (10mm)',
    brass: 1.5,
    rate: 6000,
    amount: 9000,
    paidAmount: 9000,
    status: 'PAID',
    addedBy: 'Nilesh Karande',
    addedById: 'o1',
  }
];

export const MOCK_MAINTENANCE: MaintenanceEntry[] = [
  {
    id: 'm1',
    date: '2024-03-15',
    type: 'Diesel Fill',
    amount: 5000,
    description: 'JCB Fuel refill',
    addedById: 'o1',
  },
  {
    id: 'm2',
    date: '2024-03-18',
    type: 'Conveyor Repair',
    amount: 2500,
    description: 'Belt replacement',
    addedById: 'o1',
  }
];

export const MOCK_SALARIES: SalaryEntry[] = [
  {
    id: 's1',
    date: '2024-03-01',
    workerName: 'Ganpat Rao',
    role: 'Loader Driver',
    amount: 18000,
    month: 'February 2024',
  },
  {
    id: 's2',
    date: '2024-03-05',
    workerName: 'assistant',
    role: 'Assistant',
    amount: 12000,
    month: 'February 2024',
  }
];

export const MOCK_CUSTOMER_RATES: CustomerRate[] = [
  {
    id: 'r1',
    customerName: 'Mauli Builders',
    material: 'Crushed Stone (20mm)',
    rate: 6000,
  },
  {
    id: 'r2',
    customerName: 'Mauli Builders',
    material: 'Crushed Stone (10mm)',
    rate: 6000,
  },
  {
    id: 'r3',
    customerName: 'Mauli Builders',
    material: 'Dust',
    rate: 3000,
  }
];

export const MOCK_KHATA_CLIENTS: string[] = [
  'Mauli Builders',
  'XYZ',
  'Om Stone Works'
];

export const MOCK_KHATA_PAYMENTS: KhataPayment[] = [
  {
    id: 'kp1',
    date: '2024-03-25',
    customerName: 'Mauli Builders',
    amount: 10000,
    paymentMethod: 'UPI',
    description: 'Part payment for March'
  }
];
