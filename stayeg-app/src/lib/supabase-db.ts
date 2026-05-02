/**
 * StayEg v1.2 — Supabase Database Helper Module
 * =================================================
 * Wraps Supabase client operations for common CRUD queries.
 * Designed to gradually replace direct supabaseAdmin.from() calls in API routes.
 * Uses the service role admin client to bypass RLS policies for server-side operations.
 * All functions use snake_case column names (PostgreSQL convention).
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

// =============================================================
// Types — Row types matching the PostgreSQL schema
// =============================================================

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar: string | null;
  gender: string | null;
  is_verified: boolean;
  kyc_doc: string | null;
  bio: string | null;
  city: string | null;
  occupation: string | null;
  created_at: string;
  updated_at: string;
}

export interface PGRow {
  id: string;
  name: string;
  owner_id: string;
  description: string | null;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  gender: string;
  price: number;
  security_deposit: number;
  amenities: string;
  images: string;
  rating: number;
  total_reviews: number;
  status: string;
  is_verified: boolean;
  owner?: UserRow;
  created_at: string;
  updated_at: string;
}

export interface RoomRow {
  id: string;
  pg_id: string;
  room_code: string;
  room_type: string;
  floor: number;
  has_ac: boolean;
  has_attached_bath: boolean;
  pg?: PGRow;
  beds?: BedRow[];
  created_at: string;
  updated_at: string;
}

export interface BedRow {
  id: string;
  room_id: string;
  bed_number: number;
  status: string;
  price: number | null;
  room?: RoomRow;
  bookings?: BookingRow[];
  created_at: string;
  updated_at: string;
}

export interface BookingRow {
  id: string;
  user_id: string;
  pg_id: string;
  bed_id: string;
  check_in_date: string;
  status: string;
  advance_paid: number;
  user?: UserRow;
  pg?: PGRow;
  bed?: BedRow;
  payments?: PaymentRow[];
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  pg_id: string;
  booking_id: string | null;
  amount: number;
  type: string;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  method: string | null;
  user?: UserRow;
  pg?: PGRow;
  booking?: BookingRow;
  created_at: string;
  updated_at: string;
}

export interface ComplaintRow {
  id: string;
  user_id: string;
  pg_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  resolution: string | null;
  user?: UserRow;
  pg?: PGRow;
  created_at: string;
  updated_at: string;
}

export interface VendorRow {
  id: string;
  name: string;
  type: string;
  phone: string;
  email: string | null;
  city: string;
  area: string | null;
  rating: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkerRow {
  id: string;
  name: string;
  role: string;
  phone: string;
  pg_id: string | null;
  shift: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// =============================================================
// Filter Types
// =============================================================

export interface UserFilters {
  role?: string;
  email?: string;
  phone?: string;
  isVerified?: boolean;
  pgId?: string; // If set, returns tenants in that PG
}

export interface PGFilters {
  ownerId?: string;
  city?: string;
  gender?: string;
  status?: string;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
}

export interface BookingFilters {
  userId?: string;
  pgId?: string;
  status?: string;
}

export interface PaymentFilters {
  userId?: string;
  pgId?: string;
  status?: string;
}

export interface ComplaintFilters {
  userId?: string;
  pgId?: string;
  status?: string;
  priority?: string;
}

export interface VendorFilters {
  type?: string;
  city?: string;
  status?: string;
}

// =============================================================
// USERS
// =============================================================

export async function getUsers(filters?: UserFilters): Promise<UserRow[]> {
  if (filters?.pgId) {
    // Return tenants for a specific PG via active bookings
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('user:users(*)')
      .in('status', ['ACTIVE', 'CONFIRMED'])
      .eq('pg_id', filters.pgId);

    if (error) throw new Error(`Failed to fetch users for PG: ${error.message}`);
    return (data ?? []).map((d: Record<string, unknown>) => d.user as UserRow).filter(Boolean);
  }

  let query = supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.role) query = query.eq('role', filters.role);
  if (filters?.email) query = query.eq('email', filters.email);
  if (filters?.phone) query = query.eq('phone', filters.phone);
  if (filters?.isVerified !== undefined) query = query.eq('is_verified', filters.isVerified);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch users: ${error.message}`);
  return (data as UserRow[]) ?? [];
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch user ${id}: ${error.message}`);
  }
  return data as UserRow;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    return null;
  }
  return data as UserRow;
}

export async function createUser(data: {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  gender?: string;
  avatar?: string;
  bio?: string;
  city?: string;
  occupation?: string;
}): Promise<UserRow> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      role: data.role || 'TENANT',
      gender: data.gender || null,
      avatar: data.avatar || null,
      bio: data.bio || null,
      city: data.city || null,
      occupation: data.occupation || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return user as UserRow;
}

export async function updateUser(id: string, data: Partial<Record<string, unknown>>): Promise<UserRow> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update user ${id}: ${error.message}`);
  return user as UserRow;
}

// =============================================================
// PGS
// =============================================================

export async function getPGs(filters?: PGFilters): Promise<PGRow[]> {
  let query = supabaseAdmin
    .from('pgs')
    .select('*, owner:users(id,name,phone,avatar), rooms(*, beds(*))');

  if (filters?.ownerId) {
    query = query.eq('owner_id', filters.ownerId);
  } else {
    query = query.eq('status', 'APPROVED');
  }

  if (filters?.city) query = query.eq('city', filters.city);
  if (filters?.gender && filters.gender !== 'ALL') query = query.eq('gender', filters.gender);
  if (filters?.status && !filters?.ownerId) query = query.eq('status', filters.status);

  if (filters?.query) {
    const q = filters.query.replace(/[%_\\]/g, '\\$&');
    query = query.or(`name.ilike.%${q}%,address.ilike.%${q}%`);
  }

  if (filters?.minPrice !== undefined) query = query.gte('price', filters.minPrice);
  if (filters?.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);

  switch (filters?.sortBy) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'rating':
    default:
      query = query.order('rating', { ascending: false });
      break;
  }

  query = query.limit(50);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch PGs: ${error.message}`);
  return (data as PGRow[]) ?? [];
}

export async function getPGById(id: string): Promise<PGRow | null> {
  const { data, error } = await supabaseAdmin
    .from('pgs')
    .select('*, owner:users(id,name,phone,avatar,email), rooms(*, beds(*))')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch PG ${id}: ${error.message}`);
  }
  return data as PGRow;
}

export async function createPG(data: {
  name: string;
  ownerId: string;
  description?: string;
  address: string;
  city?: string;
  gender?: string;
  price: number;
  securityDeposit?: number;
  amenities?: string[];
  images?: string[];
  lat?: number;
  lng?: number;
}): Promise<PGRow> {
  const { data: pg, error } = await supabaseAdmin
    .from('pgs')
    .insert({
      name: data.name,
      owner_id: data.ownerId,
      description: data.description || null,
      address: data.address,
      city: data.city || 'Bangalore',
      gender: data.gender || 'UNISEX',
      price: data.price,
      security_deposit: data.securityDeposit || 0,
      amenities: data.amenities ? data.amenities.join(',') : '',
      images: data.images ? data.images.join(',') : '',
      lat: data.lat || null,
      lng: data.lng || null,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create PG: ${error.message}`);
  return pg as PGRow;
}

export async function updatePG(id: string, data: Partial<Record<string, unknown>>): Promise<PGRow> {
  const { data: pg, error } = await supabaseAdmin
    .from('pgs')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update PG ${id}: ${error.message}`);
  return pg as PGRow;
}

// =============================================================
// ROOMS
// =============================================================

export async function getRooms(pgId: string): Promise<RoomRow[]> {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('*, beds(*)')
    .eq('pg_id', pgId)
    .order('floor', { ascending: true })
    .order('room_code', { ascending: true });

  if (error) throw new Error(`Failed to fetch rooms for PG ${pgId}: ${error.message}`);
  return (data as RoomRow[]) ?? [];
}

export async function createRoom(data: {
  pgId: string;
  roomCode: string;
  roomType: string;
  floor?: number;
  hasAC?: boolean;
  hasAttachedBath?: boolean;
}): Promise<RoomRow> {
  const { data: room, error } = await supabaseAdmin
    .from('rooms')
    .insert({
      pg_id: data.pgId,
      room_code: data.roomCode,
      room_type: data.roomType,
      floor: data.floor ?? 1,
      has_ac: data.hasAC ?? false,
      has_attached_bath: data.hasAttachedBath ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create room: ${error.message}`);
  return room as RoomRow;
}

// =============================================================
// BEDS
// =============================================================

export async function getBeds(roomId: string, status?: string): Promise<BedRow[]> {
  let query = supabaseAdmin
    .from('beds')
    .select('*, room:rooms(*)')
    .eq('room_id', roomId)
    .order('bed_number', { ascending: true });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch beds for room ${roomId}: ${error.message}`);
  return (data as BedRow[]) ?? [];
}

export async function getBedsByPG(pgId: string, status?: string): Promise<BedRow[]> {
  // First get all room IDs for the PG
  const { data: rooms, error: roomsError } = await supabaseAdmin
    .from('rooms')
    .select('id')
    .eq('pg_id', pgId);

  if (roomsError) throw new Error(`Failed to fetch rooms: ${roomsError.message}`);

  const roomIds = (rooms ?? []).map((r: { id: string }) => r.id);
  if (roomIds.length === 0) return [];

  let query = supabaseAdmin
    .from('beds')
    .select('*, room:rooms(*)')
    .in('room_id', roomIds)
    .order('bed_number', { ascending: true });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch beds: ${error.message}`);
  return (data as BedRow[]) ?? [];
}

export async function updateBed(id: string, data: Partial<Record<string, unknown>>): Promise<BedRow> {
  const { data: bed, error } = await supabaseAdmin
    .from('beds')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update bed ${id}: ${error.message}`);
  return bed as BedRow;
}

// =============================================================
// BOOKINGS
// =============================================================

export async function getBookings(filters?: BookingFilters): Promise<BookingRow[]> {
  let query = supabaseAdmin
    .from('bookings')
    .select('*, pg:pgs(id,name,address,city,images), bed:beds(*, room:rooms(room_code,room_type,floor)), user:users(id,name,email,phone,avatar), payments:payments(*)')
    .order('created_at', { ascending: false });

  if (filters?.userId) query = query.eq('user_id', filters.userId);
  if (filters?.pgId) query = query.eq('pg_id', filters.pgId);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);
  return (data as BookingRow[]) ?? [];
}

export async function createBooking(data: {
  userId: string;
  pgId: string;
  bedId: string;
  checkInDate: string;
  advancePaid?: number;
}): Promise<BookingRow> {
  // Create booking
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      user_id: data.userId,
      pg_id: data.pgId,
      bed_id: data.bedId,
      check_in_date: new Date(data.checkInDate).toISOString(),
      advance_paid: data.advancePaid || 0,
    })
    .select('*, pg:pgs(name), bed:beds(*)')
    .single();

  if (error) throw new Error(`Failed to create booking: ${error.message}`);

  // Mark bed as occupied
  const bedUpdateErr = await supabaseAdmin
    .from('beds')
    .update({ status: 'OCCUPIED' })
    .eq('id', data.bedId);

  if (bedUpdateErr.error) {
    console.error('Warning: Failed to update bed status:', bedUpdateErr.error.message);
  }

  return booking as BookingRow;
}

export async function updateBooking(
  bookingId: string,
  data: { status: string }
): Promise<BookingRow> {
  // Fetch booking to get bed_id for status change
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('bookings')
    .select('bed_id')
    .eq('id', bookingId)
    .single();

  if (fetchErr) throw new Error(`Failed to fetch booking: ${fetchErr.message}`);

  // Update booking status
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .update({ status: data.status })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update booking: ${error.message}`);

  // Release bed if cancelled
  if (data.status === 'CANCELLED' && existing?.bed_id) {
    await supabaseAdmin
      .from('beds')
      .update({ status: 'AVAILABLE' })
      .eq('id', existing.bed_id);
  }

  return booking as BookingRow;
}

// =============================================================
// PAYMENTS
// =============================================================

export async function getPayments(filters?: PaymentFilters): Promise<PaymentRow[]> {
  let query = supabaseAdmin
    .from('payments')
    .select('*, pg:pgs(id,name), user:users(id,name,email,phone,avatar)')
    .order('created_at', { ascending: false });

  if (filters?.userId) query = query.eq('user_id', filters.userId);
  if (filters?.pgId) query = query.eq('pg_id', filters.pgId);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
  return (data as PaymentRow[]) ?? [];
}

export async function createPayment(data: {
  userId: string;
  pgId: string;
  bookingId?: string;
  amount: number;
  type?: string;
  method?: string;
  dueDate?: string;
  status?: string;
}): Promise<PaymentRow> {
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .insert({
      user_id: data.userId,
      pg_id: data.pgId,
      booking_id: data.bookingId || null,
      amount: data.amount,
      type: data.type || 'RENT',
      method: data.method || null,
      status: data.status || 'COMPLETED',
      paid_date: data.status === 'COMPLETED' ? new Date().toISOString() : null,
      due_date: data.dueDate || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create payment: ${error.message}`);
  return payment as PaymentRow;
}

export async function updatePayment(
  id: string,
  data: Partial<Record<string, unknown>>
): Promise<PaymentRow> {
  const updateData = { ...data };
  if (data.status === 'COMPLETED' && !data.paid_date) {
    updateData.paid_date = new Date().toISOString();
  }

  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update payment ${id}: ${error.message}`);
  return payment as PaymentRow;
}

// =============================================================
// COMPLAINTS
// =============================================================

export async function getComplaints(filters?: ComplaintFilters): Promise<ComplaintRow[]> {
  let query = supabaseAdmin
    .from('complaints')
    .select('*, pg:pgs(id,name), user:users(id,name,email,phone,avatar)')
    .order('created_at', { ascending: false });

  if (filters?.userId) query = query.eq('user_id', filters.userId);
  if (filters?.pgId) query = query.eq('pg_id', filters.pgId);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.priority) query = query.eq('priority', filters.priority);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch complaints: ${error.message}`);
  return (data as ComplaintRow[]) ?? [];
}

export async function createComplaint(data: {
  userId: string;
  pgId: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
}): Promise<ComplaintRow> {
  const { data: complaint, error } = await supabaseAdmin
    .from('complaints')
    .insert({
      user_id: data.userId,
      pg_id: data.pgId,
      title: data.title,
      description: data.description || null,
      category: data.category || 'GENERAL',
      priority: data.priority || 'MEDIUM',
    })
    .select('*, pg:pgs(name)')
    .single();

  if (error) throw new Error(`Failed to create complaint: ${error.message}`);
  return complaint as ComplaintRow;
}

export async function updateComplaint(
  id: string,
  data: {
    status?: string;
    assignedTo?: string | null;
    resolution?: string | null;
  }
): Promise<ComplaintRow> {
  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;
  if (data.resolution !== undefined) updateData.resolution = data.resolution;

  const { data: complaint, error } = await supabaseAdmin
    .from('complaints')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update complaint ${id}: ${error.message}`);
  return complaint as ComplaintRow;
}

// =============================================================
// VENDORS
// =============================================================

export async function getVendors(filters?: VendorFilters): Promise<VendorRow[]> {
  let query = supabaseAdmin
    .from('vendors')
    .select('*')
    .order('rating', { ascending: false });

  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.city) query = query.eq('city', filters.city);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch vendors: ${error.message}`);
  return (data as VendorRow[]) ?? [];
}

export async function createVendor(data: {
  name: string;
  type: string;
  phone: string;
  email?: string;
  city?: string;
  area?: string;
}): Promise<VendorRow> {
  const { data: vendor, error } = await supabaseAdmin
    .from('vendors')
    .insert({
      name: data.name,
      type: data.type,
      phone: data.phone,
      email: data.email || null,
      city: data.city || 'Bangalore',
      area: data.area || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create vendor: ${error.message}`);
  return vendor as VendorRow;
}

// =============================================================
// WORKERS
// =============================================================

export async function getWorkers(pgId?: string): Promise<WorkerRow[]> {
  let query = supabaseAdmin
    .from('workers')
    .select('*')
    .order('role', { ascending: true });

  if (pgId) query = query.eq('pg_id', pgId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch workers: ${error.message}`);
  return (data as WorkerRow[]) ?? [];
}

export async function createWorker(data: {
  name: string;
  role: string;
  phone: string;
  pgId?: string;
  shift?: string;
}): Promise<WorkerRow> {
  const { data: worker, error } = await supabaseAdmin
    .from('workers')
    .insert({
      name: data.name,
      role: data.role,
      phone: data.phone,
      pg_id: data.pgId || null,
      shift: data.shift || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create worker: ${error.message}`);
  return worker as WorkerRow;
}

export async function updateWorker(
  id: string,
  data: Partial<Record<string, unknown>>
): Promise<WorkerRow> {
  const { data: worker, error } = await supabaseAdmin
    .from('workers')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update worker ${id}: ${error.message}`);
  return worker as WorkerRow;
}


