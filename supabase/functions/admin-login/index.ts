import { MongoClient } from 'https://deno.land/x/mongo@v0.31.1/mod.ts';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
// Bson not required here

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface LoginRequest {
  email: string;
  password: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, password }: LoginRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const MONGO_URI = Deno.env.get('MONGO_URI');
    if (!MONGO_URI) {
      return new Response(JSON.stringify({ error: 'Missing MONGO_URI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new MongoClient();
    client.connectWithUri(MONGO_URI);
    const dbName = Deno.env.get('MONGO_DB') || 'jobboard';
    const db = client.database(dbName);
    const admins = db.collection('admins');

    const admin = await admins.findOne({ email });

    if (!admin) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash as string);

    if (!validPassword) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(Deno.env.get('JWT_SECRET') || 'default-secret-key');
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        adminId: admin.id,
        email: admin.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      })
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(`${header}.${payload}`)
    );

    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const token = `${header}.${payload}.${signatureBase64}`;

    return new Response(
      JSON.stringify({
        token,
        admin: { id: admin._id ? admin._id.toString() : admin.id, email: admin.email },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});