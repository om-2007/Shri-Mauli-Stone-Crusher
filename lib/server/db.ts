import CryptoJS from 'crypto-js';
import pg from 'pg';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let initPromise: Promise<void> | null = null;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured on the server');
  }
  return databaseUrl;
}

function createPool() {
  return new Pool({
    connectionString: getDatabaseUrl(),
    max: 5,
    connectionTimeoutMillis: 20000,
    query_timeout: 20000,
    statement_timeout: 20000,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: true,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

export function getPool() {
  if (!poolInstance) {
    poolInstance = createPool();
  }
  return poolInstance;
}

export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop, receiver) {
    return Reflect.get(getPool() as object, prop, receiver);
  },
}) as pg.Pool;

const CRYPTO_SECRET = process.env.CRYPTO_SECRET || 'fallback_secret_for_dev_only';
const DEFAULT_OWNER = {
  id: 'owner-1',
  name: 'Nilesh Karande',
  phone: '9370763003',
  password: '123456',
};

export function encrypt(text: unknown) {
  if (text === undefined || text === null) return '';
  return CryptoJS.AES.encrypt(String(text), CRYPTO_SECRET).toString();
}

export function decrypt(ciphertext: string) {
  if (!ciphertext) return '0';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, CRYPTO_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8) || '0';
  } catch {
    return '0';
  }
}

export function isBusinessHoursIST() {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
  const istHour = istTime.getUTCHours();
  const istMinute = istTime.getUTCMinutes();
  const currentTime = istHour + istMinute / 60;
  return currentTime >= 6.0 && currentTime < 21.0;
}

function normalizeVehicleNumber(vehicle: string) {
  return (vehicle || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
}

function normalizeComparableText(value: string) {
  return (value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function resolveCanonicalText(input: string, candidates: string[]) {
  const trimmed = (input || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const normalizedInput = normalizeComparableText(trimmed);
  const match = candidates.find(candidate => normalizeComparableText(candidate) === normalizedInput);
  return match ? match.trim().replace(/\s+/g, ' ') : trimmed;
}

export async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    vehicleNumber TEXT,
    customerName TEXT,
    site TEXT,
    customerType TEXT,
    material TEXT,
    trips TEXT,
    brass TEXT,
    weight TEXT,
    rateUnit TEXT,
    rate TEXT,
    amount TEXT,
    paidAmount TEXT,
    status TEXT,
    date TEXT,
    addedBy TEXT,
    addedById TEXT
  )`);

  const customerAlterQueries = [
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS vehicleNumber TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customerName TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS site TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customerType TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS material TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS trips TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS brass TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS weight TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS rateUnit TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS rate TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS paidAmount TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS addedBy TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS addedById TEXT`,
  ];

  for (const query of customerAlterQueries) {
    try {
      await pool.query(query);
    } catch {}
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS maintenance (
    id TEXT PRIMARY KEY,
    type TEXT,
    description TEXT,
    amount TEXT,
    date TEXT,
    addedBy TEXT,
    addedById TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS salaries (
    id TEXT PRIMARY KEY,
    workerName TEXT,
    role TEXT,
    amount TEXT,
    month TEXT,
    date TEXT,
    addedBy TEXT,
    addedById TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS khata_payments (
    id TEXT PRIMARY KEY,
    customerName TEXT,
    amount TEXT,
    paymentMethod TEXT,
    description TEXT,
    date TEXT,
    addedBy TEXT,
    addedById TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS khata_logs (
    id TEXT PRIMARY KEY,
    customerName TEXT,
    amount TEXT,
    date TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS assistants (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    password TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS system_state (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  await pool.query(
    "INSERT INTO system_state (key, value) VALUES ('isDayStarted', 'false') ON CONFLICT (key) DO NOTHING"
  );

  await pool.query(`CREATE TABLE IF NOT EXISTS owner_profile (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    password TEXT,
    enableKhataReminders BOOLEAN DEFAULT TRUE,
    enableMaintenanceAlerts BOOLEAN DEFAULT TRUE
  )`);

  await pool.query(
    `INSERT INTO owner_profile (id, name, phone, password)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       phone = EXCLUDED.phone,
       password = COALESCE(NULLIF(owner_profile.password, ''), EXCLUDED.password)`,
    [DEFAULT_OWNER.id, DEFAULT_OWNER.name, DEFAULT_OWNER.phone, DEFAULT_OWNER.password]
  );
  await pool.query(
    `UPDATE owner_profile
     SET name = $1,
         phone = $2,
         password = COALESCE(NULLIF(password, ''), $3)
     WHERE id <> $4`,
    [DEFAULT_OWNER.name, DEFAULT_OWNER.phone, DEFAULT_OWNER.password, DEFAULT_OWNER.id]
  );

  await pool.query(`CREATE TABLE IF NOT EXISTS customer_rates (
    id TEXT PRIMARY KEY,
    customerName TEXT,
    material TEXT,
    rate TEXT,
    rateUnit TEXT
  )`);

  try {
    await pool.query(`ALTER TABLE customer_rates ADD COLUMN IF NOT EXISTS rateUnit TEXT`);
  } catch {}

  await pool.query(`CREATE TABLE IF NOT EXISTS khata_clients (
    id TEXT PRIMARY KEY,
    name TEXT,
    applyGst BOOLEAN DEFAULT FALSE
  )`);

  try {
    await pool.query(`ALTER TABLE khata_clients ADD COLUMN IF NOT EXISTS applyGst BOOLEAN DEFAULT FALSE`);
  } catch {}
}

export async function safeInitDb() {
  getPool();
  if (!initPromise) {
    initPromise = initDb().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  await initPromise;
}

export async function autoUpdateDayStatus() {
  // Use a very short timeout for auto-updates so they don't block the app
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Auto-update timeout')), 3000)
  );

  try {
    const shouldBeStarted = isBusinessHoursIST();
    
    // Wrap the query in a timeout
    const systemState: any = await Promise.race([
      pool.query("SELECT value FROM system_state WHERE key = 'isDayStarted'"),
      timeoutPromise
    ]);

    const currentStatus = systemState.rows.length > 0 && systemState.rows[0].value === 'true';

    if (shouldBeStarted !== currentStatus) {
      await Promise.race([
        pool.query(
          "INSERT INTO system_state (key, value) VALUES ('isDayStarted', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
          [String(shouldBeStarted)]
        ),
        timeoutPromise
      ]);
    }
  } catch (error) {
    // Silently handle errors/timeouts for auto-update
    console.log('[AUTO-UPDATE] Day status update skipped (timeout or error)');
  }
}

export async function getAppData() {
  await safeInitDb();
  await autoUpdateDayStatus();

  const [
    customers,
    maintenance,
    salaries,
    khataPaymentsResult,
    assistants,
    customerRates,
    khataClients,
    ownerProfile,
    systemState,
  ] = await Promise.all([
    pool.query("SELECT * FROM customers"),
    pool.query("SELECT * FROM maintenance"),
    pool.query("SELECT * FROM salaries"),
    pool.query("SELECT * FROM khata_payments").catch(async () => {
      const fallback = await pool.query("SELECT * FROM khata_logs").catch(() => ({ rows: [] }));
      return fallback;
    }),
    pool.query("SELECT * FROM assistants"),
    pool.query("SELECT * FROM customer_rates"),
    pool.query("SELECT * FROM khata_clients"),
    pool.query("SELECT * FROM owner_profile WHERE id = $1", [DEFAULT_OWNER.id]),
    pool.query("SELECT * FROM system_state"),
  ]);

  const khataPaymentsRows: any[] = khataPaymentsResult.rows;
  const isDayStarted = systemState.rows.find((row: any) => row.key === 'isDayStarted')?.value === 'true';

  return {
    customers: customers.rows.map((customer: any) => ({
      id: customer.id,
      vehicleNumber: customer.vehiclenumber || customer.vehicleNumber || '',
      customerName: customer.customername || customer.customerName || '',
      site: customer.site || '',
      customerType: customer.customertype || customer.customerType || 'OTHER',
      material: customer.material || '',
      trips: customer.trips ? parseInt(customer.trips) : 1,
      brass: customer.brass ? parseFloat(customer.brass) : 0,
      weight: customer.weight ? parseFloat(customer.weight) : 0,
      rateUnit: customer.rateunit || customer.rateUnit || 'PER_BRASS',
      rate: customer.rate ? parseFloat(customer.rate) : 0,
      amount: customer.amount ? parseFloat(decrypt(customer.amount)) : 0,
      paidAmount: customer.paidamount ? parseFloat(decrypt(customer.paidamount)) : 0,
      status: customer.status || 'PENDING',
      date: customer.date,
      addedBy: customer.addedby || customer.addedBy || '',
      addedById: customer.addedbyid || customer.addedById || '',
    })),
    maintenance: maintenance.rows.map((entry: any) => ({
      id: entry.id,
      type: entry.type || '',
      description: entry.description || '',
      amount: entry.amount ? parseFloat(decrypt(entry.amount)) : 0,
      date: entry.date,
      addedBy: entry.addedby || '',
      addedById: entry.addedbyid || '',
    })),
    salaries: salaries.rows.map((entry: any) => ({
      id: entry.id,
      workerName: entry.workername || '',
      role: entry.role || '',
      amount: entry.amount ? parseFloat(decrypt(entry.amount)) : 0,
      month: entry.month || '',
      date: entry.date,
      addedBy: entry.addedby || '',
      addedById: entry.addedbyid || '',
    })),
    khataPayments: khataPaymentsRows.map((entry: any) => ({
      id: entry.id,
      customerName: entry.customername || '',
      amount: entry.amount ? parseFloat(decrypt(entry.amount)) : 0,
      paymentMethod: entry.paymentmethod || '',
      description: entry.description || '',
      date: entry.date,
      addedBy: entry.addedby || '',
      addedById: entry.addedbyid || '',
    })),
    assistants: assistants.rows,
    customerRates: customerRates.rows.map((entry: any) => ({
      id: entry.id,
      customerName: entry.customername || '',
      material: entry.material || '',
      rate: entry.rate ? parseFloat(decrypt(entry.rate)) : 0,
      rateUnit: entry.rateunit || entry.rateUnit || 'PER_BRASS',
    })),
    khataClients: khataClients.rows
      .map((entry: any) => ({
        id: entry.id,
        name: entry.name || '',
        applyGst: entry.applygst ?? entry.applyGst ?? false,
      }))
      .filter((entry: any) => entry.name),
    ownerProfile: ownerProfile.rows[0],
    notificationSettings: {
      enableKhataReminders: ownerProfile.rows[0]?.enablekhatareminders ?? true,
      enableMaintenanceAlerts: ownerProfile.rows[0]?.enablemaintenancealerts ?? true,
    },
    isDayStarted,
  };
}

function mapCustomerRow(customer: any) {
  return {
    id: customer.id,
    vehicleNumber: customer.vehiclenumber || customer.vehicleNumber || '',
    customerName: customer.customername || customer.customerName || '',
    site: customer.site || '',
    customerType: customer.customertype || customer.customerType || 'OTHER',
    material: customer.material || '',
    trips: customer.trips ? parseInt(customer.trips) : 1,
    brass: customer.brass ? parseFloat(customer.brass) : 0,
    weight: customer.weight ? parseFloat(customer.weight) : 0,
    rateUnit: customer.rateunit || customer.rateUnit || 'PER_BRASS',
    rate: customer.rate ? parseFloat(customer.rate) : 0,
    amount: customer.amount ? parseFloat(decrypt(customer.amount)) : 0,
    paidAmount: customer.paidamount ? parseFloat(decrypt(customer.paidamount)) : 0,
    status: customer.status || 'PENDING',
    date: customer.date,
    addedBy: customer.addedby || customer.addedBy || '',
    addedById: customer.addedbyid || customer.addedById || '',
  };
}

function mapMaintenanceRow(entry: any) {
  return {
    id: entry.id,
    type: entry.type || '',
    description: entry.description || '',
    amount: entry.amount ? parseFloat(decrypt(entry.amount)) : 0,
    date: entry.date,
    addedBy: entry.addedby || '',
    addedById: entry.addedbyid || '',
  };
}

function mapSalaryRow(entry: any) {
  return {
    id: entry.id,
    workerName: entry.workername || '',
    role: entry.role || '',
    amount: entry.amount ? parseFloat(decrypt(entry.amount)) : 0,
    month: entry.month || '',
    date: entry.date,
    addedBy: entry.addedby || '',
    addedById: entry.addedbyid || '',
  };
}

function mapKhataPaymentRow(entry: any) {
  return {
    id: entry.id,
    customerName: entry.customername || '',
    amount: entry.amount ? parseFloat(decrypt(entry.amount)) : 0,
    paymentMethod: entry.paymentmethod || '',
    description: entry.description || '',
    date: entry.date,
    addedBy: entry.addedby || '',
    addedById: entry.addedbyid || '',
  };
}

function mapCustomerRateRow(entry: any) {
  return {
    id: entry.id,
    customerName: entry.customername || '',
    material: entry.material || '',
    rate: entry.rate ? parseFloat(decrypt(entry.rate)) : 0,
    rateUnit: entry.rateunit || entry.rateUnit || 'PER_BRASS',
  };
}

function mapKhataClientRow(entry: any) {
  return {
    id: entry.id,
    name: entry.name || '',
    applyGst: entry.applygst ?? entry.applyGst ?? false,
  };
}

async function getOwnerProfileRow() {
  const ownerProfile = await pool.query("SELECT * FROM owner_profile WHERE id = $1", [DEFAULT_OWNER.id]);
  return ownerProfile.rows[0] || null;
}

async function getCurrentDayStartedValue() {
  const systemState = await pool.query("SELECT value FROM system_state WHERE key = 'isDayStarted'");
  return systemState.rows[0]?.value === 'true';
}

export async function getBootstrapData() {
  await safeInitDb();
  await autoUpdateDayStatus();

  const [assistants, ownerProfile, isDayStarted] = await Promise.all([
    pool.query("SELECT * FROM assistants"),
    getOwnerProfileRow(),
    getCurrentDayStartedValue(),
  ]);

  return {
    assistants: assistants.rows,
    ownerProfile,
    notificationSettings: {
      enableKhataReminders: ownerProfile?.enablekhatareminders ?? true,
      enableMaintenanceAlerts: ownerProfile?.enablemaintenancealerts ?? true,
    },
    isDayStarted,
  };
}

export async function getScopedAppData(scope: string) {
  await safeInitDb();
  await autoUpdateDayStatus();

  const base = await getBootstrapData();

  switch (scope) {
    case 'dashboard': {
      const [
        customers,
        maintenance,
        salaries,
        khataPaymentsResult,
        customerRates,
        khataClients,
      ] = await Promise.all([
        pool.query("SELECT * FROM customers ORDER BY date DESC LIMIT 250"),
        pool.query("SELECT * FROM maintenance ORDER BY date DESC LIMIT 250"),
        pool.query("SELECT * FROM salaries ORDER BY date DESC LIMIT 250"),
        pool.query("SELECT * FROM khata_payments ORDER BY date DESC LIMIT 250").catch(async () => {
          const fallback = await pool.query("SELECT * FROM khata_logs ORDER BY date DESC LIMIT 250").catch(() => ({ rows: [] }));
          return fallback;
        }),
        pool.query("SELECT * FROM customer_rates"),
        pool.query("SELECT * FROM khata_clients"),
      ]);

      return {
        ...base,
        customers: customers.rows.map(mapCustomerRow),
        maintenance: maintenance.rows.map(mapMaintenanceRow),
        salaries: salaries.rows.map(mapSalaryRow),
        khataPayments: khataPaymentsResult.rows.map(mapKhataPaymentRow),
        customerRates: customerRates.rows.map(mapCustomerRateRow),
        khataClients: khataClients.rows.map(mapKhataClientRow).filter((entry: any) => entry.name),
      };
    }
    case 'customers': {
      const [customers, customerRates, khataClients, khataPayments] = await Promise.all([
        pool.query("SELECT * FROM customers ORDER BY date DESC"),
        pool.query("SELECT * FROM customer_rates"),
        pool.query("SELECT * FROM khata_clients"),
        pool.query("SELECT * FROM khata_payments ORDER BY date DESC").catch(async () => {
          const fallback = await pool.query("SELECT * FROM khata_logs ORDER BY date DESC").catch(() => ({ rows: [] }));
          return fallback;
        }),
      ]);

      return {
        ...base,
        customers: customers.rows.map(mapCustomerRow),
        customerRates: customerRates.rows.map(mapCustomerRateRow),
        khataClients: khataClients.rows.map(mapKhataClientRow).filter((entry: any) => entry.name),
        khataPayments: khataPayments.rows.map(mapKhataPaymentRow),
      };
    }
    case 'assistant-dashboard': {
      const [customers, maintenance, customerRates, khataClients, khataPayments] = await Promise.all([
        pool.query("SELECT * FROM customers ORDER BY date DESC LIMIT 250"),
        pool.query("SELECT * FROM maintenance ORDER BY date DESC LIMIT 250"),
        pool.query("SELECT * FROM customer_rates"),
        pool.query("SELECT * FROM khata_clients"),
        pool.query("SELECT * FROM khata_payments ORDER BY date DESC LIMIT 250").catch(async () => {
          const fallback = await pool.query("SELECT * FROM khata_logs ORDER BY date DESC LIMIT 250").catch(() => ({ rows: [] }));
          return fallback;
        }),
      ]);

      return {
        ...base,
        customers: customers.rows.map(mapCustomerRow),
        maintenance: maintenance.rows.map(mapMaintenanceRow),
        customerRates: customerRates.rows.map(mapCustomerRateRow),
        khataClients: khataClients.rows.map(mapKhataClientRow).filter((entry: any) => entry.name),
        khataPayments: khataPayments.rows.map(mapKhataPaymentRow),
      };
    }
    case 'maintenance': {
      const maintenance = await pool.query("SELECT * FROM maintenance ORDER BY date DESC");
      return {
        ...base,
        maintenance: maintenance.rows.map(mapMaintenanceRow),
      };
    }
    case 'salaries': {
      const salaries = await pool.query("SELECT * FROM salaries ORDER BY date DESC");
      return {
        ...base,
        salaries: salaries.rows.map(mapSalaryRow),
      };
    }
    case 'khata': {
      const [customers, customerRates, khataClients, khataPayments] = await Promise.all([
        pool.query("SELECT * FROM customers ORDER BY date DESC"),
        pool.query("SELECT * FROM customer_rates"),
        pool.query("SELECT * FROM khata_clients"),
        pool.query("SELECT * FROM khata_payments ORDER BY date DESC").catch(async () => {
          const fallback = await pool.query("SELECT * FROM khata_logs ORDER BY date DESC").catch(() => ({ rows: [] }));
          return fallback;
        }),
      ]);

      return {
        ...base,
        customers: customers.rows.map(mapCustomerRow),
        customerRates: customerRates.rows.map(mapCustomerRateRow),
        khataClients: khataClients.rows.map(mapKhataClientRow).filter((entry: any) => entry.name),
        khataPayments: khataPayments.rows.map(mapKhataPaymentRow),
      };
    }
    case 'staff': {
      const [assistants, customers, maintenance] = await Promise.all([
        pool.query("SELECT * FROM assistants"),
        pool.query("SELECT id, addedById FROM customers"),
        pool.query("SELECT id, addedById FROM maintenance"),
      ]);

      return {
        ...base,
        assistants: assistants.rows,
        customers: customers.rows.map((entry: any) => ({ id: entry.id, addedById: entry.addedbyid || entry.addedById || '' })),
        maintenance: maintenance.rows.map((entry: any) => ({ id: entry.id, addedById: entry.addedbyid || entry.addedById || '' })),
      };
    }
    case 'settings': {
      return {
        ...base,
      };
    }
    default:
      return getAppData();
  }
}

export async function getSystemState() {
  await safeInitDb();
  const systemState = await pool.query("SELECT * FROM system_state");
  const isDayStarted = systemState.rows.find((row: any) => row.key === 'isDayStarted')?.value === 'true';
  return { isDayStarted };
}

export async function updateSystemState(key: string, value: unknown) {
  await safeInitDb();
  await pool.query(
    `INSERT INTO system_state (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, String(value)]
  );

  return { success: true };
}

export async function updateSettings(payload: any) {
  await safeInitDb();
  const { id, name, phone, role, enableKhataReminders, enableMaintenanceAlerts } = payload;

  if (name !== undefined && phone !== undefined) {
    if (role === 'ASSISTANT') {
      await pool.query(
        "UPDATE assistants SET name = $1, phone = $2 WHERE id = $3",
        [name, phone, id]
      );
    } else {
      await pool.query(
        "UPDATE owner_profile SET name = $1, phone = $2 WHERE id = $3",
        [name, phone, id]
      );
    }
  }

  if (enableKhataReminders !== undefined || enableMaintenanceAlerts !== undefined) {
    const current = await pool.query("SELECT * FROM owner_profile WHERE id = $1", [id]);
    if (current.rows.length > 0) {
      const khata =
        enableKhataReminders !== undefined
          ? enableKhataReminders
          : current.rows[0].enablekhatareminders;
      const maintenanceAlerts =
        enableMaintenanceAlerts !== undefined
          ? enableMaintenanceAlerts
          : current.rows[0].enablemaintenancealerts;

      await pool.query(
        "UPDATE owner_profile SET enableKhataReminders = $1, enableMaintenanceAlerts = $2 WHERE id = $3",
        [khata, maintenanceAlerts, id]
      );
    }
  }

  return { success: true };
}

export async function deleteCollectionRecord(collection: string, id: string) {
  await safeInitDb();

  const tableMap: Record<string, string> = {
    customers: 'customers',
    maintenance: 'maintenance',
    salaries: 'salaries',
    'khata-payments': 'khata_payments',
    khataPayments: 'khata_payments',
    assistants: 'assistants',
    'customer-rates': 'customer_rates',
    customerRates: 'customer_rates',
    'khata-clients': 'khata_clients',
  };

  const tableName = tableMap[collection];
  if (!tableName) {
    throw new Error('Collection not found');
  }

  if (tableName === 'khata_clients') {
    await pool.query('DELETE FROM khata_clients WHERE id = $1', [id]);
  } else {
    await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
  }

  return { success: true };
}

export async function saveCustomer(payload: any) {
  await safeInitDb();
  const {
    id,
    vehicleNumber,
    customerName,
    site,
    customerType,
    material,
    trips,
    brass,
    weight,
    rateUnit,
    rate,
    amount,
    paidAmount,
    status,
    addedBy,
    addedById,
    updateFlag,
  } = payload;

  const trimmedVehicleNumber = (vehicleNumber || '').trim();
  const trimmedCustomerName = (customerName || '').trim();
  const trimmedMaterial = (material || '').trim();
  const trimmedSite = (site || '').trim();

  if (!trimmedVehicleNumber || !trimmedCustomerName) {
    throw new Error('Vehicle number and customer name are required');
  }

  const normalizedVehicleNumber = normalizeVehicleNumber(trimmedVehicleNumber);
  let resolvedCustomerName = trimmedCustomerName;
  let resolvedMaterial = trimmedMaterial;
  let resolvedSite = trimmedSite;

  if (normalizedVehicleNumber) {
    const existingCustomers = await pool.query(
      'SELECT id, customerName, vehicleNumber, material, site FROM customers WHERE id <> $1',
      [id || '']
    );
    const matchedCustomer = existingCustomers.rows.find(
      (customer: any) =>
        normalizeVehicleNumber(customer.vehiclenumber || customer.vehicleNumber || '') === normalizedVehicleNumber &&
        (customer.customername || customer.customerName || '').trim()
    );

    if (matchedCustomer && !id) {
      resolvedCustomerName = (matchedCustomer.customername || matchedCustomer.customerName || '').trim();
    }

    const canonicalCustomer = existingCustomers.rows
      .map((customer: any) => customer.customername || customer.customerName || '')
      .filter(Boolean);
    const canonicalMaterial = existingCustomers.rows
      .map((customer: any) => customer.material || '')
      .filter(Boolean);
    const canonicalSite = existingCustomers.rows
      .map((customer: any) => customer.site || '')
      .filter(Boolean);

    resolvedCustomerName = resolveCanonicalText(resolvedCustomerName, canonicalCustomer);
    resolvedMaterial = resolveCanonicalText(resolvedMaterial, canonicalMaterial);
    resolvedSite = resolveCanonicalText(resolvedSite, canonicalSite);
  }

  const date = new Date().toISOString();

  if (id && updateFlag) {
    await pool.query(
      `UPDATE customers
       SET vehicleNumber = $1, customerName = $2, site = $3, customerType = $4, material = $5, trips = $6, brass = $7,
           weight = $8, rateUnit = $9, rate = $10, amount = $11, paidAmount = $12, status = $13, date = $14, addedBy = $15, addedById = $16
       WHERE id = $17`,
      [
        trimmedVehicleNumber,
        resolvedCustomerName,
        resolvedSite,
        customerType || 'OTHER',
        resolvedMaterial,
        trips || '1',
        brass || '0',
        weight || '0',
        rateUnit || 'PER_BRASS',
        rate || '0',
        encrypt(amount?.toString() || '0'),
        encrypt(paidAmount?.toString() || '0'),
        status || 'PENDING',
        date,
        addedBy || '',
        addedById || '',
        id,
      ]
    );

    return { id, vehicleNumber: trimmedVehicleNumber, customerName: resolvedCustomerName, site: resolvedSite, customerType, material: resolvedMaterial, trips, brass, weight, rateUnit: rateUnit || 'PER_BRASS', rate, amount, paidAmount, status, date, addedBy, addedById };
  }

  const newId = Date.now().toString();
  await pool.query(
    `INSERT INTO customers (id, vehicleNumber, customerName, site, customerType, material, trips, brass, weight, rateUnit, rate, amount, paidAmount, status, date, addedBy, addedById)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      newId,
      trimmedVehicleNumber,
      resolvedCustomerName,
      resolvedSite,
      customerType || 'OTHER',
      resolvedMaterial,
      trips || '1',
      brass || '0',
      weight || '0',
      rateUnit || 'PER_BRASS',
      rate || '0',
      encrypt(amount?.toString() || '0'),
      encrypt(paidAmount?.toString() || '0'),
      status || 'PENDING',
      date,
      addedBy || '',
      addedById || '',
    ]
  );

  return { id: newId, vehicleNumber: trimmedVehicleNumber, customerName: resolvedCustomerName, site: resolvedSite, customerType, material: resolvedMaterial, trips, brass, weight, rateUnit: rateUnit || 'PER_BRASS', rate, amount, paidAmount, status, date, addedBy, addedById };
}

export async function updateCustomer(id: string, payload: any) {
  return saveCustomer({ ...payload, id, updateFlag: true });
}

export async function saveMaintenance(payload: any) {
  await safeInitDb();
  const { type, description, amount, addedBy, addedById } = payload;
  if (amount === undefined) {
    throw new Error('Amount required');
  }

  const id = Date.now().toString();
  const date = new Date().toISOString();

  await pool.query(
    `INSERT INTO maintenance (id, type, description, amount, date, addedBy, addedById)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, type || '', description || '', encrypt(String(amount)), date, addedBy || '', addedById || '']
  );

  return { id, type, description, amount: parseFloat(amount), date, addedBy, addedById };
}

export async function updateMaintenance(id: string, payload: any) {
  await safeInitDb();
  const { type, description, amount, addedBy, addedById } = payload;
  if (amount === undefined) {
    throw new Error('Amount required');
  }

  const systemState = await pool.query("SELECT value FROM system_state WHERE key = 'isDayStarted'");
  const isDayStarted = systemState.rows.length > 0 && systemState.rows[0].value === 'true';
  if (!isDayStarted) {
    throw new Error('Cannot edit maintenance records after the day has ended');
  }

  const maintenanceRecord = await pool.query("SELECT addedById FROM maintenance WHERE id = $1", [id]);
  if (maintenanceRecord.rows.length === 0) {
    throw new Error('Maintenance record not found');
  }

  if (maintenanceRecord.rows[0].addedbyid !== addedById) {
    throw new Error('Can only edit your own maintenance records');
  }

  const date = new Date().toISOString();
  await pool.query(
    `UPDATE maintenance SET type = $1, description = $2, amount = $3, date = $4, addedBy = $5, addedById = $6 WHERE id = $7`,
    [type || '', description || '', encrypt(String(amount)), date, addedBy || '', addedById || '', id]
  );

  return { id, type, description, amount: parseFloat(amount), date, addedBy, addedById };
}

export async function saveSalary(payload: any) {
  await safeInitDb();
  const { workerName, role, amount, month, addedBy, addedById } = payload;
  if (amount === undefined) {
    throw new Error('Amount required');
  }

  const id = Date.now().toString();
  const date = new Date().toISOString();

  await pool.query(
    `INSERT INTO salaries (id, workerName, role, amount, month, date, addedBy, addedById)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, workerName || '', role || '', encrypt(String(amount)), month || '', date, addedBy || '', addedById || '']
  );

  return { id, workerName, role, amount: parseFloat(amount), month, date, addedBy, addedById };
}

export async function saveKhataPayment(payload: any) {
  await safeInitDb();
  const { id, customerName, amount, paymentMethod, description, date, addedBy, addedById } = payload;

  if (!customerName || amount === undefined) {
    throw new Error('Customer name and amount required');
  }

  const newId = id || Date.now().toString();
  const finalDate = date || new Date().toISOString();

  await pool.query(
    `INSERT INTO khata_payments (id, customerName, amount, paymentMethod, description, date, addedBy, addedById)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
     customerName = $2, amount = $3, paymentMethod = $4, description = $5, date = $6, addedBy = $7, addedById = $8`,
    [
      newId,
      customerName,
      encrypt(String(amount)),
      paymentMethod || '',
      description || '',
      finalDate,
      addedBy || '',
      addedById || '',
    ]
  );

  return { id: newId, customerName, amount: parseFloat(amount), paymentMethod, description, date: finalDate, addedBy, addedById };
}

export async function saveCustomerRate(payload: any) {
  await safeInitDb();
  const { customerName, material, rate, rateUnit } = payload;

  if (!customerName || !material) {
    throw new Error('Customer name and material required');
  }

  const customerRows = await pool.query('SELECT customerName, material FROM customer_rates');
  const existingCustomerNames = customerRows.rows.map((row: any) => row.customername || row.customerName || '').filter(Boolean);
  const existingMaterials = customerRows.rows.map((row: any) => row.material || '').filter(Boolean);
  const resolvedCustomerName = resolveCanonicalText(customerName, existingCustomerNames);
  const resolvedMaterial = resolveCanonicalText(material, existingMaterials);

  const existing = await pool.query(
    'SELECT * FROM customer_rates WHERE customerName = $1 AND material = $2',
    [resolvedCustomerName, resolvedMaterial]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE customer_rates SET rate = $1, rateUnit = $2 WHERE customerName = $3 AND material = $4',
      [rate ? encrypt(String(rate)) : '', rateUnit || 'PER_BRASS', resolvedCustomerName, resolvedMaterial]
    );

    return { id: existing.rows[0].id, customerName: resolvedCustomerName, material: resolvedMaterial, rate: rate || 0, rateUnit: rateUnit || 'PER_BRASS' };
  }

  const id = Date.now().toString();
  await pool.query(
    'INSERT INTO customer_rates (id, customerName, material, rate, rateUnit) VALUES ($1, $2, $3, $4, $5)',
    [id, resolvedCustomerName, resolvedMaterial, rate ? encrypt(String(rate)) : '', rateUnit || 'PER_BRASS']
  );

  return { id, customerName: resolvedCustomerName, material: resolvedMaterial, rate: rate || 0, rateUnit: rateUnit || 'PER_BRASS' };
}

export async function saveAssistant(payload: any) {
  await safeInitDb();
  const { name, phone, password } = payload;
  const id = Date.now().toString();

  await pool.query(
    'INSERT INTO assistants (id, name, phone, password) VALUES ($1, $2, $3, $4)',
    [id, name, phone || '', password || '123456']
  );

  return { id, name, phone, password: password || '123456' };
}

export async function saveKhataClient(payload: any) {
  await safeInitDb();
  const { id, name, applyGst } = payload;
  const normalizedName = (name || '').trim();

  if (!normalizedName) {
    throw new Error('Khata client name required');
  }

  const existingClients = await pool.query('SELECT id, name FROM khata_clients');
  const resolvedName = resolveCanonicalText(
    normalizedName,
    existingClients.rows.map((row: any) => row.name || '').filter(Boolean)
  );

  // Check if a client with this name already exists (if we don't have an ID)
  let nextId = id;
  if (!nextId) {
    const existing = await pool.query(
      'SELECT id FROM khata_clients WHERE UPPER(name) = UPPER($1)',
      [resolvedName]
    );
    if (existing.rows.length > 0) {
      nextId = existing.rows[0].id;
    } else {
      nextId = Date.now().toString();
    }
  }

  await pool.query(
    `INSERT INTO khata_clients (id, name, applyGst)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       applyGst = EXCLUDED.applyGst`,
    [nextId, resolvedName, Boolean(applyGst)]
  );

  return { id: nextId, name: resolvedName, applyGst: Boolean(applyGst) };
}
