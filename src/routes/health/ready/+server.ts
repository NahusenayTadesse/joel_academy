import { json } from '@sveltejs/kit';
import { schemaReady } from '$lib/server/readiness';

/**
 * Ready means the database answers *and* holds every migration this build expects. The deploy
 * script polls this after a restart; `/health` alone answers 200 while pages 500 on a missing
 * column.
 */
export async function GET() {
	try {
		if (await schemaReady()) return json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
	} catch {
		/* A missing migration table or an unreachable database is simply not ready. */
	}
	return json({ status: 'degraded' }, { status: 503, headers: { 'cache-control': 'no-store' } });
}
