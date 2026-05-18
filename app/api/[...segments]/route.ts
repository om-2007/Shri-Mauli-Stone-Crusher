import { NextResponse } from 'next/server';
import {
  autoUpdateDayStatus,
  deleteCollectionRecord,
  getAppData,
  getSystemState,
  saveAssistant,
  saveCustomer,
  saveCustomerRate,
  saveKhataClient,
  saveKhataPayment,
  saveMaintenance,
  saveSalary,
  safeInitDb,
  updateCustomer,
  updateMaintenance,
  updateSettings,
  updateSystemState,
} from '@/lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    segments: string[];
  }>;
};

function errorResponse(error: unknown, fallbackMessage: string, status = 500) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status });
}

async function getSegments(context: RouteContext) {
  const params = await context.params;
  return params.segments || [];
}

export async function GET(_request: Request, context: RouteContext) {
  const segments = await getSegments(context);

  try {
    if (segments.length === 1 && segments[0] === 'data') {
      return NextResponse.json(await getAppData());
    }

    if (segments.length === 1 && segments[0] === 'system-state') {
      return NextResponse.json(await getSystemState());
    }

    if (segments.length === 1 && segments[0] === 'cron' && segments[1] === 'day-status') {
      await safeInitDb();
      await autoUpdateDayStatus();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    if (segments.length === 1 && segments[0] === 'data') {
      return NextResponse.json({
        customers: [],
        maintenance: [],
        salaries: [],
        khataPayments: [],
        assistants: [],
        customerRates: [],
        khataClients: [],
        ownerProfile: null,
        notificationSettings: { enableKhataReminders: true, enableMaintenanceAlerts: true },
        isDayStarted: false,
        degraded: true,
      }, { status: 200 });
    }

    if (segments.length === 1 && segments[0] === 'system-state') {
      return NextResponse.json({ isDayStarted: false, degraded: true }, { status: 200 });
    }
    return errorResponse(error, 'Database error');
  }
}

    if (segments.length === 1 && segments[0] === 'system-state') {
      return NextResponse.json(await getSystemState());
    }

    if (segments.length === 2 && segments[0] === 'cron' && segments[1] === 'day-status') {
      await safeInitDb();
      await autoUpdateDayStatus();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    if (segments.length === 1 && segments[0] === 'system-state') {
      return NextResponse.json({ isDayStarted: false, degraded: true }, { status: 200 });
    }
    return errorResponse(error, 'Database error');
  }
}

export async function POST(request: Request, context: RouteContext) {
  const segments = await getSegments(context);

  try {
    const body = await request.json();

    if (segments.length === 1 && segments[0] === 'system-state') {
      return NextResponse.json(await updateSystemState(body.key, body.value));
    }

    if (segments.length === 1 && segments[0] === 'settings') {
      return NextResponse.json(await updateSettings(body));
    }

    if (segments.length === 1 && segments[0] === 'customers') {
      return NextResponse.json(await saveCustomer(body));
    }

    if (segments.length === 1 && segments[0] === 'maintenance') {
      return NextResponse.json(await saveMaintenance(body));
    }

    if (segments.length === 1 && segments[0] === 'salaries') {
      return NextResponse.json(await saveSalary(body));
    }

    if (segments.length === 1 && segments[0] === 'khata-payments') {
      return NextResponse.json(await saveKhataPayment(body));
    }

    if (segments.length === 1 && segments[0] === 'customer-rates') {
      return NextResponse.json(await saveCustomerRate(body));
    }

    if (segments.length === 1 && segments[0] === 'assistants') {
      return NextResponse.json(await saveAssistant(body));
    }

    if (segments.length === 1 && segments[0] === 'khata-clients') {
      return NextResponse.json(await saveKhataClient(body));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = /required/i.test(message) ? 400 : 500;
    return errorResponse(error, 'Request failed', status);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const segments = await getSegments(context);

  try {
    const body = await request.json();

    if (segments.length === 2 && segments[0] === 'customers') {
      return NextResponse.json(await updateCustomer(segments[1], body));
    }

    if (segments.length === 2 && segments[0] === 'maintenance') {
      return NextResponse.json(await updateMaintenance(segments[1], body));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    let status = 500;
    if (/not found/i.test(message)) status = 404;
    else if (/cannot edit|only edit/i.test(message)) status = 403;
    else if (/required/i.test(message)) status = 400;
    return errorResponse(error, 'Request failed', status);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const segments = await getSegments(context);

  try {
    if (segments.length === 2) {
      return NextResponse.json(await deleteCollectionRecord(segments[0], segments[1]));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    const status = /Collection not found/i.test(message) ? 404 : 500;
    return errorResponse(error, 'Delete failed', status);
  }
}
