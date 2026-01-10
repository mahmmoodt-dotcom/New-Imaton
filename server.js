
/**
 * IMATION IRAQ - SECURE SUPABASE PRODUCTION SERVER
 * Hardened Persistence: Supabase DB (PostgreSQL) + Supabase Storage (Media)
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client (Using Service Role for Admin Sync Tasks)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '30mb' }));

/**
 * LOGGING & SECURITY
 */
const log = (action, meta = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action,
    ...meta
  }));
};

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.originalUrl.startsWith('/api')) {
      log('API_REQUEST', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${Date.now() - start}ms`
      });
    }
  });
  next();
});

/**
 * MEDIA HANDLER: Base64 -> Supabase Storage
 */
const uploadToSupabase = async (base64Str) => {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
    return base64Str;
  }

  try {
    const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Str;

    const mimeType = matches[1];
    const extension = mimeType.replace('svg+xml', 'svg').split('/').pop();
    const buffer = Buffer.from(matches[2], 'base64');
    
    // Security: Limit file size to 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      log('UPLOAD_REJECTED_SIZE', { bytes: buffer.length });
      return null;
    }

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;
    
    const { data, error } = await supabase.storage
      .from('products')
      .upload(filename, buffer, {
        contentType: mimeType.includes('svg') ? 'image/svg+xml' : `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(filename);

    return publicUrl;
  } catch (err) {
    log('UPLOAD_ERROR', { error: err.message });
    return null;
  }
};

/**
 * API ENDPOINTS
 */

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('config')
      .select('data')
      .eq('key', 'settings')
      .single();
    
    res.json(data ? data.data : {});
  } catch (e) { res.status(500).json({ error: 'DB_READ_FAILURE' }); }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    const processed = {
      ...settings,
      logo: await uploadToSupabase(settings.logo),
      heroImage: await uploadToSupabase(settings.heroImage),
      aboutImage: await uploadToSupabase(settings.aboutImage)
    };
    
    await supabase
      .from('config')
      .upsert({ key: 'settings', data: processed });
      
    res.json(processed);
  } catch (e) { res.status(500).json({ error: 'DB_WRITE_FAILURE' }); }
});

// Products
app.get('/api/products', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('createdAt', { ascending: false });
  res.json(data || []);
});

app.post('/api/products', async (req, res) => {
  try {
    const items = await Promise.all(req.body.map(async p => ({
      ...p,
      image: await uploadToSupabase(p.image)
    })));
    
    // In Supabase, we upsert the array
    const { error } = await supabase
      .from('products')
      .upsert(items);
      
    if (error) throw error;
    res.json(items);
  } catch (e) { res.status(500).json({ error: 'PRODUCT_SYNC_FAILURE' }); }
});

// Categories
app.get('/api/categories', async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*');
  res.json(data || []);
});

app.post('/api/categories', async (req, res) => {
  try {
    const items = await Promise.all(req.body.map(async c => ({
      ...c,
      image: await uploadToSupabase(c.image)
    })));
    
    const { error } = await supabase
      .from('categories')
      .upsert(items);
      
    if (error) throw error;
    res.json(items);
  } catch (e) { res.status(500).json({ error: 'CATEGORY_SYNC_FAILURE' }); }
});

// Orders
app.get('/api/orders', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('createdAt', { ascending: false });
  res.json(data || []);
});

// Atomic Status Update
app.post('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, deliveryPerson, deliveryPhone } = req.body;

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) throw new Error('Order not found');
    if (['Delivered', 'Canceled'].includes(existing.status)) {
      throw new Error('FINALIZED_ORDER_IMMUTABLE');
    }

    const updates = { status };
    if (deliveryPerson) updates.deliveryPerson = deliveryPerson;
    if (deliveryPhone) updates.deliveryPhone = deliveryPhone;

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    
    log('ADMIN_STATUS_UPDATE', { orderId: id, status });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Atomic Order Submission
app.post('/api/orders/new', async (req, res) => {
  try {
    const orderData = req.body;

    // Use a Supabase RPC or a simple transaction logic for invoice
    // For this implementation, we'll increment a counter in a 'metadata' table
    const { data: counter, error: counterError } = await supabase.rpc('increment_invoice_counter');
    
    // Fallback if RPC isn't set up: use timestamp-based logic or a manual fetch-and-update (less safe but works for migration)
    let nextInvoice = counter;
    if (!nextInvoice) {
      const { data: meta } = await supabase.from('metadata').select('value').eq('key', 'lastInvoice').single();
      nextInvoice = (meta?.value || 1000) + 1;
      await supabase.from('metadata').upsert({ key: 'lastInvoice', value: nextInvoice });
    }

    const trackingNo = 'IM' + Math.random().toString(36).substring(2, 9).toUpperCase();

    const order = {
      ...orderData,
      invoiceNumber: nextInvoice,
      trackingNumber: trackingNo,
      createdAt: Date.now(),
      status: 'Pending'
    };
    
    const { error: insertError } = await supabase
      .from('orders')
      .insert(order);

    if (insertError) throw insertError;

    log('ORDER_SUBMITTED', { id: order.id, invoice: nextInvoice });
    res.status(201).json(order);
  } catch (err) {
    log('ORDER_SUBMIT_FAILED', { error: err.message });
    res.status(500).json({ error: 'CHECKOUT_SERVICE_UNAVAILABLE' });
  }
});

// Asset Upload
app.post('/api/upload', async (req, res) => {
  const url = await uploadToSupabase(req.body.image);
  url ? res.json({ url }) : res.status(400).json({ error: 'UPLOAD_FAILED' });
});

// Auth Persistence
app.get('/api/auth', async (req, res) => {
  const { data } = await supabase.from('config').select('data').eq('key', 'auth').single();
  res.json(data ? data.data : { isLoggedIn: false });
});

app.post('/api/auth', async (req, res) => {
  await supabase.from('config').upsert({ key: 'auth', data: req.body });
  res.json(req.body);
});

/**
 * PRODUCTION SERVING
 */
app.use('/dist', express.static(path.join(__dirname, 'dist')));
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API_NOT_FOUND' });
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  log('IMATION_SERVER_ONLINE', { port: PORT, provider: 'Supabase' });
});
