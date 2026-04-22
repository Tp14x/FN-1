const JSONBIN_API = 'https://api.jsonbin.io/v3/b';

const getCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
});

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(env.ALLOWED_ORIGIN);

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders
    });
  }

  // ตรวจสอบ env vars ก่อน
  if (!env.JSONBIN_MASTER_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env: JSONBIN_MASTER_KEY' }), {
      status: 500, headers: corsHeaders
    });
  }
  if (!env.USER_BIN_ID) {
    return new Response(JSON.stringify({ error: 'Missing env: USER_BIN_ID' }), {
      status: 500, headers: corsHeaders
    });
  }

  try {
    const response = await fetch(`${JSONBIN_API}/${env.USER_BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': env.JSONBIN_MASTER_KEY,
        'X-Bin-Meta': 'false'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`JSONBin ${response.status}: ${body}`);
    }

    const data = await response.json();
    const userMap = data.record || data;

    return new Response(JSON.stringify(userMap), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
}
