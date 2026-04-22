const JSONBIN_API = 'https://api.jsonbin.io/v3/b';

const getCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
});

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(env.ALLOWED_ORIGIN);

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
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
    const { userId, pictureUrl } = await request.json();

    if (!userId || !pictureUrl) {
      return new Response(JSON.stringify({ error: 'Missing userId or pictureUrl' }), {
        status: 400, headers: corsHeaders
      });
    }

    // ดึงข้อมูล user ปัจจุบัน
    const getRes = await fetch(`${JSONBIN_API}/${env.USER_BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': env.JSONBIN_MASTER_KEY,
        'X-Bin-Meta': 'false'
      }
    });

    if (!getRes.ok) {
      const body = await getRes.text();
      throw new Error(`JSONBin GET ${getRes.status}: ${body}`);
    }

    const data = await getRes.json();
    const userMap = data.record || data;

    // ถ้า user ไม่มีในระบบ ไม่ต้องอัปเดต
    if (!userMap[userId]) {
      return new Response(JSON.stringify({ success: true, updated: false }), {
        status: 200, headers: corsHeaders
      });
    }

    // ถ้ารูปเหมือนเดิม ไม่ต้องเขียน
    if (userMap[userId].pictureUrl === pictureUrl) {
      return new Response(JSON.stringify({ success: true, updated: false }), {
        status: 200, headers: corsHeaders
      });
    }

    userMap[userId].pictureUrl = pictureUrl;
    userMap[userId].updatedAt = new Date().toISOString();

    const putRes = await fetch(`${JSONBIN_API}/${env.USER_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': env.JSONBIN_MASTER_KEY
      },
      body: JSON.stringify(userMap)
    });

    if (!putRes.ok) {
      const body = await putRes.text();
      throw new Error(`JSONBin PUT ${putRes.status}: ${body}`);
    }

    return new Response(JSON.stringify({ success: true, updated: true }), {
      status: 200, headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
}
