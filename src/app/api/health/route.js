/**
 * Liveness probe — deliberately free of any database access.
 *
 * On Render's free tier the web service spins down after 15 minutes without
 * inbound traffic, and waking it costs roughly a minute of cold start. An external
 * uptime pinger hitting this route keeps the container warm.
 *
 * It must not query Postgres. Neon's free plan allows ~400 compute hours a month
 * against ~730 hours in a calendar month, so a pinger aimed at any DB-backed route
 * would keep the database resumed around the clock and exhaust that budget with
 * roughly a third of the month still to run. Touching nothing here lets Neon
 * auto-suspend as usual while Render stays awake.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ ok: true, service: 'red-apps' });
}
