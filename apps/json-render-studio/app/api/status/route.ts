import { loadStudioConfig } from '../../../server/src/config';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  const config = loadStudioConfig();
  return Response.json({ model: config.model, credentials: config.credentials });
}
