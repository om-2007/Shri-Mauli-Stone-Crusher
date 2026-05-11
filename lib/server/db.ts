import CryptoJS from 'crypto-js';
import pg from 'pg';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

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

export async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    vehicleNumber TEXT,
    customerName TEXT,
    customerType TEXT,
    material TEXT,
    brass TEXT,
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
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customerType TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS material TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS brass TEXT`,
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
    rate TEXT
  )`);

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
  await initDb();
}

export async function autoUpdateDayStatus() {
  try {
    const shouldBeStarted = isBusinessHoursIST();
    const systemState = await pool.query("SELECT value FROM system_state WHERE key = 'isDayStarted'");
    const currentStatus = systemState.rows.length > 0 && systemState.rows[0].value === 'true';

    if (shouldBeStarted !== currentStatus) {
      await pool.query(
        "UPDATE system_state SET value = $1 WHERE key = 'isDayStarted'",
        [shouldBeStarted.toString()]
      );
    }
  } catch (error) {
    console.error('Failed to auto-update day status:', error);
  }
}

export async function getAppData() {
  await safeInitDb();
  await autoUpdateDayStatus();

  const customers = await pool.query("SELECT * FROM customers");
  const maintenance = await pool.query("SELECT * FROM maintenance");
  const salaries = await pool.query("SELECT * FROM salaries");

  let khataPaymentsRows: any[] = [];
  try {
    const result = await pool.query("SELECT * FROM khata_payments");
    khataPaymentsRows = result.rows;
  } catch {
    const result = await pool.query("SELECT * FROM khata_logs").catch(() => ({ rows: [] }));
    khataPaymentsRows = result.rows;
  }

  const assistants = await pool.query("SELECT * FROM assistants");
  const customerRates = await pool.query("SELECT * FROM customer_rates");
  const khataClients = await pool.query("SELECT * FROM khata_clients");
  const ownerProfile = await pool.query("SELECT * FROM owner_profile WHERE id = $1", [DEFAULT_OWNER.id]);
  const systemState = await pool.query("SELECT * FROM system_state");
  const isDayStarted = systemState.rows.find((row: any) => row.key === 'isDayStarted')?.value === 'true';

  return {
    customers: customers.rows.map((customer: any) => ({
      id: customer.id,
      vehicleNumber: customer.vehiclenumber || customer.vehicleNumber || '',
      customerName: customer.customername || customer.customerName || '',
      customerType: customer.customertype || customer.customerType || 'OTHER',
      material: customer.material || '',
      brass: customer.brass ? parseFloat(customer.brass) : 0,
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
    customerType,
    material,
    brass,
    rate,
    amount,
    paidAmount,
    status,
    addedBy,
    addedById,
    updateFlag,
  } = payload;

  if (!vehicleNumber || !customerName) {
    throw new Error('Vehicle number and customer name are required');
  }

  const date = new Date().toISOString();

  if (id && updateFlag) {
    await pool.query(
      `UPDATE customers
       SET vehicleNumber = $1, customerName = $2, customerType = $3, material = $4, brass = $5,
           rate = $6, amount = $7, paidAmount = $8, status = $9, date = $10, addedBy = $11, addedById = $12
       WHERE id = $13`,
      [
        vehicleNumber,
        customerName,
        customerType || 'OTHER',
        material || '',
        brass || '0',
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

    return { id, vehicleNumber, customerName, customerType, material, brass, rate, amount, paidAmount, status, date, addedBy, addedById };
  }

  const newId = Date.now().toString();
  await pool.query(
    `INSERT INTO customers (id, vehicleNumber, customerName, customerType, material, brass, rate, amount, paidAmount, status, date, addedBy, addedById)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      newId,
      vehicleNumber,
      customerName,
      customerType || 'OTHER',
      material || '',
      brass || '0',
      rate || '0',
      encrypt(amount?.toString() || '0'),
      encrypt(paidAmount?.toString() || '0'),
      status || 'PENDING',
      date,
      addedBy || '',
      addedById || '',
    ]
  );

  return { id: newId, vehicleNumber, customerName, customerType, material, brass, rate, amount, paidAmount, status, date, addedBy, addedById };
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
  const { customerName, material, rate } = payload;

  if (!customerName || !material) {
    throw new Error('Customer name and material required');
  }

  const existing = await pool.query(
    'SELECT * FROM customer_rates WHERE customerName = $1 AND material = $2',
    [customerName, material]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE customer_rates SET rate = $1 WHERE customerName = $2 AND material = $3',
      [rate ? encrypt(String(rate)) : '', customerName, material]
    );

    return { id: existing.rows[0].id, customerName, material, rate: rate || 0 };
  }

  const id = Date.now().toString();
  await pool.query(
    'INSERT INTO customer_rates (id, customerName, material, rate) VALUES ($1, $2, $3, $4)',
    [id, customerName, material, rate ? encrypt(String(rate)) : '']
  );

  return { id, customerName, material, rate: rate || 0 };
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

  const nextId = id || Date.now().toString();
  await pool.query(
    `INSERT INTO khata_clients (id, name, applyGst)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       applyGst = EXCLUDED.applyGst`,
    [nextId, normalizedName, Boolean(applyGst)]
  );

  return { id: nextId, name: normalizedName, applyGst: Boolean(applyGst) };
}
