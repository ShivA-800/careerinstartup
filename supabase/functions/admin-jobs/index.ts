import { MongoClient, Bson } from 'https://deno.land/x/mongo@v0.31.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function verifyToken(token: string): Promise<any> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(Deno.env.get('JWT_SECRET') || 'default-secret-key');
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) {
      throw new Error('Invalid token');
    }

    return payload;
  } catch {
    throw new Error('Invalid token');
  }
}


Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const jobId = pathParts[pathParts.length - 1];
    // For GET requests we allow public access to published jobs. If an Authorization
    // header is present and valid, the requester is treated as admin and can see all jobs.
    let isAdmin = false;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        await verifyToken(token);
        isAdmin = true;
      } catch {
        isAdmin = false;
      }
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
    const jobsCol = db.collection('jobs');

    if (req.method === 'GET') {
      // Build a Mongo query from search params. Public requests (non-admin)
      // only return jobs with status === 'published'. Admins see all.
      const searchParams = url.searchParams;
      const q = searchParams.get('q') || '';
      const role = searchParams.get('role') || '';
      const location = searchParams.get('location') || '';
  const type = searchParams.get('type') || '';
  const passout = searchParams.get('passout') || '';

      const query: Record<string, any> = {};
      if (!isAdmin) query.status = 'published';

      if (q) {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [
          { title: { $regex: re } },
          { company: { $regex: re } },
          { location: { $regex: re } },
          { country: { $regex: re } },
        ];
      }

      if (role) query.title = { $regex: new RegExp(role, 'i') };
      if (location) query.location = { $regex: new RegExp(location, 'i') };
  if (type) query.type = type;
  if (passout) query.passout = passout;

      const cursor = jobsCol.find(query);
      const jobs = await cursor.toArray();
      // normalize id fields and sort by created_at desc
      const normalized = jobs.map((j: any) => ({
        id: j._id?.toString() || j.id,
        title: j.title,
        company: j.company,
        logo_url: j.logo_url,
        country: j.country,
        location: j.location,
        description: j.description,
        apply_link: j.apply_link,
        status: j.status,
        passout: j.passout,
        type: j.type,
        created_at: j.created_at,
        updated_at: j.updated_at,
      })).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      return new Response(JSON.stringify(normalized), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const jobData = await req.json();
      const insert = {
        ...jobData,
        status: isAdmin ? (jobData.status || 'published') : 'pending',
        created_at: new Date().toISOString(),
      };
      const insertId = await jobsCol.insertOne(insert);
      const created = await jobsCol.findOne({ _id: insertId });

      const out = { ...created, id: created._id?.toString() };
      return new Response(JSON.stringify(out), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT') {
      const jobData = await req.json();

      if (url.pathname.includes('/approve')) {
        const { status } = jobData;
        const oid = new Bson.ObjectId(jobId);
        await jobsCol.updateOne({ _id: oid }, { $set: { status, updated_at: new Date().toISOString() } });
        const updated = await jobsCol.findOne({ _id: oid });

        return new Response(JSON.stringify({ ...updated, id: updated._id?.toString() }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const oid = new Bson.ObjectId(jobId);
        await jobsCol.updateOne({ _id: oid }, { $set: { ...jobData, updated_at: new Date().toISOString() } });
        const updated = await jobsCol.findOne({ _id: oid });
        return new Response(JSON.stringify({ ...updated, id: updated._id?.toString() }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (req.method === 'DELETE') {
      const oid = new Bson.ObjectId(jobId);
      const deleteResult = await jobsCol.deleteOne({ _id: oid });
      return new Response(JSON.stringify({ success: deleteResult }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
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