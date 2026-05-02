import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSecret } from '@/lib/api-auth';

// ─── Seed data constants ─────────────────────────────────────────────

const USERS = [
  { id: '00000000-0001-4000-8000-000000000001', name: 'Rajesh Kumar', email: 'rajesh@stayeg.in', phone: '+919876543210', role: 'OWNER', gender: 'MALE', is_verified: true, is_approved: true, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Rajesh', bio: 'Experienced PG owner managing premium accommodations in Bengaluru.', city: 'Bangalore', occupation: 'Property Manager' },
  { id: '00000000-0001-4000-8000-000000000002', name: 'Priya Sharma', email: 'priya@stayeg.in', phone: '+919876543211', role: 'OWNER', gender: 'FEMALE', is_verified: true, is_approved: true, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya', bio: 'Managing 2 PGs in Bengaluru.', city: 'Bangalore', occupation: 'Property Manager' },
  { id: '00000000-0001-4000-8000-000000000003', name: 'Amit Patel', email: 'amit@stayeg.in', phone: '+919876543212', role: 'OWNER', gender: 'MALE', is_verified: true, is_approved: true, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Amit', bio: 'Tech turned PG entrepreneur.', city: 'Bangalore', occupation: 'Property Manager' },
  { id: '00000000-0002-4000-8000-000000000001', name: 'Vikram Singh', email: 'vikram@email.com', phone: '+919123456789', role: 'TENANT', gender: 'MALE', is_verified: true, is_approved: true, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Vikram', city: 'Bangalore', occupation: 'Software Engineer' },
  { id: '00000000-0002-4000-8000-000000000002', name: 'Ananya Reddy', email: 'ananya@email.com', phone: '+919123456790', role: 'TENANT', gender: 'FEMALE', is_verified: true, is_approved: true, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ananya', city: 'Bangalore', occupation: 'Data Analyst' },
  { id: '00000000-0002-4000-8000-000000000003', name: 'Rohan Mehta', email: 'rohan@email.com', phone: '+919123456791', role: 'TENANT', gender: 'MALE', is_verified: true, is_approved: true, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Rohan', city: 'Bangalore', occupation: 'MBA Student' },
  { id: '00000000-0002-4000-8000-000000000004', name: 'Sneha Joshi', email: 'sneha@email.com', phone: '+919123456792', role: 'TENANT', gender: 'FEMALE', is_verified: true, is_approved: true, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sneha', city: 'Bangalore', occupation: 'UX Designer' },
  { id: '00000000-0002-4000-8000-000000000005', name: 'Karthik Nair', email: 'karthik@email.com', phone: '+919123456793', role: 'TENANT', gender: 'MALE', is_verified: true, is_approved: true, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Karthik', city: 'Bangalore', occupation: 'IT Consultant' },
  { id: '00000000-0002-4000-8000-000000000006', name: 'Divya Gupta', email: 'divya@email.com', phone: '+919123456794', role: 'TENANT', gender: 'FEMALE', is_verified: true, is_approved: true, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Divya', city: 'Bangalore', occupation: 'Content Writer' },
  { id: '00000000-0003-4000-8000-000000000001', name: 'Admin User', email: 'admin@stayeg.in', phone: '+919999999999', role: 'ADMIN', gender: 'MALE', is_verified: true, is_approved: true, avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Admin', bio: 'StayEg platform administrator.', city: 'Bangalore', occupation: 'Administrator' },
];

const PGS = [
  { id: '10000000-0001-4000-8000-000000000001', name: 'Sunrise PG - Koramangala', owner_id: '00000000-0001-4000-8000-000000000001', description: 'Premium PG in Koramangala with modern amenities.', address: '123, 4th Cross, Koramangala 4th Block', city: 'Bangalore', lat: 12.9352, lng: 77.6245, gender: 'UNISEX', price: 12000, security_deposit: 24000, amenities: 'wifi,ac,food,laundry,parking,cctv,power_backup,water_heater,study_table,housekeeping', images: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=400&fit=crop', rating: 4.5, total_reviews: 128, status: 'APPROVED', is_verified: true },
  { id: '10000000-0001-4000-8000-000000000002', name: 'Green Valley PG - HSR Layout', owner_id: '00000000-0001-4000-8000-000000000001', description: 'Peaceful PG with homely food.', address: '45, 27th Main, HSR Layout Sector 2', city: 'Bangalore', lat: 12.9116, lng: 77.6389, gender: 'MALE', price: 8500, security_deposit: 17000, amenities: 'wifi,food,laundry,cctv,power_backup,study_table,common_room,tv', images: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=400&fit=crop', rating: 4.2, total_reviews: 89, status: 'APPROVED', is_verified: true },
  { id: '10000000-0001-4000-8000-000000000003', name: 'Ladies Paradise PG - Indiranagar', owner_id: '00000000-0001-4000-8000-000000000002', description: 'Safe PG for women in Indiranagar.', address: '78, 100 Feet Road, Indiranagar', city: 'Bangalore', lat: 12.9784, lng: 77.6408, gender: 'FEMALE', price: 14000, security_deposit: 28000, amenities: 'wifi,ac,food,laundry,cctv,power_backup,water_heater,wardrobe,housekeeping,gym', images: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600&h=400&fit=crop', rating: 4.8, total_reviews: 156, status: 'APPROVED', is_verified: true },
  { id: '10000000-0001-4000-8000-000000000004', name: 'Tech Hub PG - Whitefield', owner_id: '00000000-0001-4000-8000-000000000002', description: 'Modern co-living near ITPL.', address: '56, ITPL Main Road, Whitefield', city: 'Bangalore', lat: 12.9698, lng: 77.75, gender: 'UNISEX', price: 11000, security_deposit: 22000, amenities: 'wifi,ac,food,laundry,parking,gym,cctv,power_backup,common_room,tv', images: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600&h=400&fit=crop', rating: 4.3, total_reviews: 95, status: 'APPROVED', is_verified: true },
  { id: '10000000-0001-4000-8000-000000000005', name: 'Budget Bliss PG - Marathahalli', owner_id: '00000000-0001-4000-8000-000000000003', description: 'Affordable PG with basic amenities.', address: '23, Marathahalli Main Road', city: 'Bangalore', lat: 12.9591, lng: 77.6974, gender: 'MALE', price: 6500, security_deposit: 13000, amenities: 'wifi,food,laundry,power_backup,study_table', images: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=400&fit=crop', rating: 3.9, total_reviews: 67, status: 'APPROVED', is_verified: true },
  { id: '10000000-0001-4000-8000-000000000006', name: 'Royal Residency PG - Electronic City', owner_id: '00000000-0001-4000-8000-000000000003', description: 'Premium gated PG community.', address: '89, Phase 1, Electronic City', city: 'Bangalore', lat: 12.844, lng: 77.673, gender: 'UNISEX', price: 15000, security_deposit: 30000, amenities: 'wifi,ac,food,laundry,parking,gym,cctv,power_backup,water_heater,study_table,wardrobe,housekeeping', images: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop', rating: 4.7, total_reviews: 210, status: 'APPROVED', is_verified: true },
];

const ROOMS = [
  { id: '20000000-0001-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', room_code: 'A101', room_type: 'DOUBLE', floor: 1, has_ac: true, has_attached_bath: true },
  { id: '20000000-0001-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000001', room_code: 'A102', room_type: 'DOUBLE', floor: 1, has_ac: true, has_attached_bath: true },
  { id: '20000000-0001-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000001', room_code: 'A201', room_type: 'TRIPLE', floor: 2, has_ac: false, has_attached_bath: false },
  { id: '20000000-0001-4000-8000-000000000004', pg_id: '10000000-0001-4000-8000-000000000001', room_code: 'A202', room_type: 'SINGLE', floor: 2, has_ac: true, has_attached_bath: true },
  { id: '20000000-0001-4000-8000-000000000005', pg_id: '10000000-0001-4000-8000-000000000001', room_code: 'A301', room_type: 'DORMITORY', floor: 3, has_ac: false, has_attached_bath: false },
  { id: '20000000-0002-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000002', room_code: 'B101', room_type: 'TRIPLE', floor: 1, has_ac: false, has_attached_bath: false },
  { id: '20000000-0002-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000002', room_code: 'B102', room_type: 'DOUBLE', floor: 1, has_ac: false, has_attached_bath: true },
  { id: '20000000-0002-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000002', room_code: 'B201', room_type: 'DOUBLE', floor: 2, has_ac: true, has_attached_bath: true },
  { id: '20000000-0003-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000003', room_code: 'C101', room_type: 'DOUBLE', floor: 1, has_ac: true, has_attached_bath: true },
  { id: '20000000-0003-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000003', room_code: 'C102', room_type: 'SINGLE', floor: 1, has_ac: true, has_attached_bath: true },
  { id: '20000000-0003-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000003', room_code: 'C201', room_type: 'DOUBLE', floor: 2, has_ac: true, has_attached_bath: true },
  { id: '20000000-0003-4000-8000-000000000004', pg_id: '10000000-0001-4000-8000-000000000003', room_code: 'C202', room_type: 'DOUBLE', floor: 2, has_ac: false, has_attached_bath: false },
  { id: '20000000-0004-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000004', room_code: 'D101', room_type: 'DOUBLE', floor: 1, has_ac: true, has_attached_bath: true },
  { id: '20000000-0004-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000004', room_code: 'D102', room_type: 'TRIPLE', floor: 1, has_ac: false, has_attached_bath: false },
  { id: '20000000-0004-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000004', room_code: 'D201', room_type: 'DOUBLE', floor: 2, has_ac: true, has_attached_bath: true },
  { id: '20000000-0005-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000005', room_code: 'E101', room_type: 'DORMITORY', floor: 1, has_ac: false, has_attached_bath: false },
  { id: '20000000-0005-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000005', room_code: 'E102', room_type: 'TRIPLE', floor: 1, has_ac: false, has_attached_bath: false },
  { id: '20000000-0006-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000006', room_code: 'F101', room_type: 'SINGLE', floor: 1, has_ac: true, has_attached_bath: true },
  { id: '20000000-0006-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000006', room_code: 'F102', room_type: 'SINGLE', floor: 1, has_ac: true, has_attached_bath: true },
  { id: '20000000-0006-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000006', room_code: 'F201', room_type: 'DOUBLE', floor: 2, has_ac: true, has_attached_bath: true },
  { id: '20000000-0006-4000-8000-000000000004', pg_id: '10000000-0001-4000-8000-000000000006', room_code: 'F202', room_type: 'DOUBLE', floor: 2, has_ac: true, has_attached_bath: true },
  { id: '20000000-0006-4000-8000-000000000005', pg_id: '10000000-0001-4000-8000-000000000006', room_code: 'F301', room_type: 'DORMITORY', floor: 3, has_ac: false, has_attached_bath: false },
];

const BEDS = [
  { id: '30000000-0001-4000-8000-000000000001', room_id: '20000000-0001-4000-8000-000000000001', bed_number: 1, status: 'OCCUPIED', price: 12000 },
  { id: '30000000-0001-4000-8000-000000000002', room_id: '20000000-0001-4000-8000-000000000001', bed_number: 2, status: 'AVAILABLE', price: 12000 },
  { id: '30000000-0001-4000-8000-000000000003', room_id: '20000000-0001-4000-8000-000000000002', bed_number: 1, status: 'AVAILABLE', price: 12000 },
  { id: '30000000-0001-4000-8000-000000000004', room_id: '20000000-0001-4000-8000-000000000002', bed_number: 2, status: 'OCCUPIED', price: 12000 },
  { id: '30000000-0001-4000-8000-000000000005', room_id: '20000000-0001-4000-8000-000000000003', bed_number: 1, status: 'OCCUPIED', price: 10000 },
  { id: '30000000-0001-4000-8000-000000000006', room_id: '20000000-0001-4000-8000-000000000003', bed_number: 2, status: 'OCCUPIED', price: 10000 },
  { id: '30000000-0001-4000-8000-000000000007', room_id: '20000000-0001-4000-8000-000000000003', bed_number: 3, status: 'AVAILABLE', price: 10000 },
  { id: '30000000-0001-4000-8000-000000000008', room_id: '20000000-0001-4000-8000-000000000004', bed_number: 1, status: 'OCCUPIED', price: 15000 },
  { id: '30000000-0001-4000-8000-000000000009', room_id: '20000000-0001-4000-8000-000000000005', bed_number: 1, status: 'OCCUPIED', price: 7000 },
  { id: '30000000-0001-4000-8000-000000000010', room_id: '20000000-0001-4000-8000-000000000005', bed_number: 2, status: 'AVAILABLE', price: 7000 },
  { id: '30000000-0001-4000-8000-000000000011', room_id: '20000000-0001-4000-8000-000000000005', bed_number: 3, status: 'OCCUPIED', price: 7000 },
  { id: '30000000-0001-4000-8000-000000000012', room_id: '20000000-0001-4000-8000-000000000005', bed_number: 4, status: 'AVAILABLE', price: 7000 },
  { id: '30000000-0001-4000-8000-000000000013', room_id: '20000000-0001-4000-8000-000000000005', bed_number: 5, status: 'OCCUPIED', price: 7000 },
  { id: '30000000-0001-4000-8000-000000000014', room_id: '20000000-0001-4000-8000-000000000005', bed_number: 6, status: 'AVAILABLE', price: 7000 },
  { id: '30000000-0002-4000-8000-000000000001', room_id: '20000000-0002-4000-8000-000000000001', bed_number: 1, status: 'OCCUPIED', price: 8500 },
  { id: '30000000-0002-4000-8000-000000000002', room_id: '20000000-0002-4000-8000-000000000001', bed_number: 2, status: 'AVAILABLE', price: 8500 },
  { id: '30000000-0002-4000-8000-000000000003', room_id: '20000000-0002-4000-8000-000000000001', bed_number: 3, status: 'OCCUPIED', price: 8500 },
  { id: '30000000-0002-4000-8000-000000000004', room_id: '20000000-0002-4000-8000-000000000002', bed_number: 1, status: 'AVAILABLE', price: 9000 },
  { id: '30000000-0002-4000-8000-000000000005', room_id: '20000000-0002-4000-8000-000000000002', bed_number: 2, status: 'OCCUPIED', price: 9000 },
  { id: '30000000-0002-4000-8000-000000000006', room_id: '20000000-0002-4000-8000-000000000003', bed_number: 1, status: 'OCCUPIED', price: 10000 },
  { id: '30000000-0002-4000-8000-000000000007', room_id: '20000000-0002-4000-8000-000000000003', bed_number: 2, status: 'OCCUPIED', price: 10000 },
  { id: '30000000-0003-4000-8000-000000000001', room_id: '20000000-0003-4000-8000-000000000001', bed_number: 1, status: 'OCCUPIED', price: 14000 },
  { id: '30000000-0003-4000-8000-000000000002', room_id: '20000000-0003-4000-8000-000000000001', bed_number: 2, status: 'OCCUPIED', price: 14000 },
  { id: '30000000-0003-4000-8000-000000000003', room_id: '20000000-0003-4000-8000-000000000002', bed_number: 1, status: 'AVAILABLE', price: 16000 },
  { id: '30000000-0003-4000-8000-000000000004', room_id: '20000000-0003-4000-8000-000000000003', bed_number: 1, status: 'OCCUPIED', price: 14000 },
  { id: '30000000-0003-4000-8000-000000000005', room_id: '20000000-0003-4000-8000-000000000003', bed_number: 2, status: 'AVAILABLE', price: 14000 },
  { id: '30000000-0003-4000-8000-000000000006', room_id: '20000000-0003-4000-8000-000000000004', bed_number: 1, status: 'OCCUPIED', price: 12000 },
  { id: '30000000-0003-4000-8000-000000000007', room_id: '20000000-0003-4000-8000-000000000004', bed_number: 2, status: 'OCCUPIED', price: 12000 },
  { id: '30000000-0004-4000-8000-000000000001', room_id: '20000000-0004-4000-8000-000000000001', bed_number: 1, status: 'OCCUPIED', price: 11000 },
  { id: '30000000-0004-4000-8000-000000000002', room_id: '20000000-0004-4000-8000-000000000001', bed_number: 2, status: 'AVAILABLE', price: 11000 },
  { id: '30000000-0004-4000-8000-000000000003', room_id: '20000000-0004-4000-8000-000000000002', bed_number: 1, status: 'AVAILABLE', price: 10000 },
  { id: '30000000-0004-4000-8000-000000000004', room_id: '20000000-0004-4000-8000-000000000002', bed_number: 2, status: 'OCCUPIED', price: 10000 },
  { id: '30000000-0004-4000-8000-000000000005', room_id: '20000000-0004-4000-8000-000000000002', bed_number: 3, status: 'OCCUPIED', price: 10000 },
  { id: '30000000-0004-4000-8000-000000000006', room_id: '20000000-0004-4000-8000-000000000003', bed_number: 1, status: 'OCCUPIED', price: 12000 },
  { id: '30000000-0004-4000-8000-000000000007', room_id: '20000000-0004-4000-8000-000000000003', bed_number: 2, status: 'AVAILABLE', price: 12000 },
  { id: '30000000-0005-4000-8000-000000000001', room_id: '20000000-0005-4000-8000-000000000001', bed_number: 1, status: 'OCCUPIED', price: 6500 },
  { id: '30000000-0005-4000-8000-000000000002', room_id: '20000000-0005-4000-8000-000000000001', bed_number: 2, status: 'OCCUPIED', price: 6500 },
  { id: '30000000-0005-4000-8000-000000000003', room_id: '20000000-0005-4000-8000-000000000001', bed_number: 3, status: 'AVAILABLE', price: 6500 },
  { id: '30000000-0005-4000-8000-000000000004', room_id: '20000000-0005-4000-8000-000000000001', bed_number: 4, status: 'OCCUPIED', price: 6500 },
  { id: '30000000-0005-4000-8000-000000000005', room_id: '20000000-0005-4000-8000-000000000001', bed_number: 5, status: 'AVAILABLE', price: 6500 },
  { id: '30000000-0005-4000-8000-000000000006', room_id: '20000000-0005-4000-8000-000000000001', bed_number: 6, status: 'OCCUPIED', price: 6500 },
  { id: '30000000-0005-4000-8000-000000000007', room_id: '20000000-0005-4000-8000-000000000002', bed_number: 1, status: 'AVAILABLE', price: 7000 },
  { id: '30000000-0005-4000-8000-000000000008', room_id: '20000000-0005-4000-8000-000000000002', bed_number: 2, status: 'OCCUPIED', price: 7000 },
  { id: '30000000-0005-4000-8000-000000000009', room_id: '20000000-0005-4000-8000-000000000002', bed_number: 3, status: 'AVAILABLE', price: 7000 },
  { id: '30000000-0006-4000-8000-000000000001', room_id: '20000000-0006-4000-8000-000000000001', bed_number: 1, status: 'OCCUPIED', price: 15000 },
  { id: '30000000-0006-4000-8000-000000000002', room_id: '20000000-0006-4000-8000-000000000002', bed_number: 1, status: 'OCCUPIED', price: 15000 },
  { id: '30000000-0006-4000-8000-000000000003', room_id: '20000000-0006-4000-8000-000000000003', bed_number: 1, status: 'AVAILABLE', price: 16000 },
  { id: '30000000-0006-4000-8000-000000000004', room_id: '20000000-0006-4000-8000-000000000003', bed_number: 2, status: 'OCCUPIED', price: 16000 },
  { id: '30000000-0006-4000-8000-000000000005', room_id: '20000000-0006-4000-8000-000000000004', bed_number: 1, status: 'OCCUPIED', price: 16000 },
  { id: '30000000-0006-4000-8000-000000000006', room_id: '20000000-0006-4000-8000-000000000004', bed_number: 2, status: 'OCCUPIED', price: 16000 },
  { id: '30000000-0006-4000-8000-000000000007', room_id: '20000000-0006-4000-8000-000000000005', bed_number: 1, status: 'AVAILABLE', price: 10000 },
  { id: '30000000-0006-4000-8000-000000000008', room_id: '20000000-0006-4000-8000-000000000005', bed_number: 2, status: 'OCCUPIED', price: 10000 },
  { id: '30000000-0006-4000-8000-000000000009', room_id: '20000000-0006-4000-8000-000000000005', bed_number: 3, status: 'OCCUPIED', price: 10000 },
  { id: '30000000-0006-4000-8000-000000000010', room_id: '20000000-0006-4000-8000-000000000005', bed_number: 4, status: 'AVAILABLE', price: 10000 },
  { id: '30000000-0006-4000-8000-000000000011', room_id: '20000000-0006-4000-8000-000000000005', bed_number: 5, status: 'OCCUPIED', price: 10000 },
  { id: '30000000-0006-4000-8000-000000000012', room_id: '20000000-0006-4000-8000-000000000005', bed_number: 6, status: 'AVAILABLE', price: 10000 },
];

const BOOKINGS = [
  { id: '40000000-0001-4000-8000-000000000001', user_id: '00000000-0002-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', bed_id: '30000000-0001-4000-8000-000000000001', check_in_date: '2025-01-15T00:00:00Z', status: 'ACTIVE', advance_paid: 12000 },
  { id: '40000000-0001-4000-8000-000000000002', user_id: '00000000-0002-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000003', bed_id: '30000000-0003-4000-8000-000000000001', check_in_date: '2025-02-01T00:00:00Z', status: 'ACTIVE', advance_paid: 14000 },
  { id: '40000000-0001-4000-8000-000000000003', user_id: '00000000-0002-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000002', bed_id: '30000000-0002-4000-8000-000000000001', check_in_date: '2025-01-20T00:00:00Z', status: 'ACTIVE', advance_paid: 8500 },
  { id: '40000000-0001-4000-8000-000000000004', user_id: '00000000-0002-4000-8000-000000000004', pg_id: '10000000-0001-4000-8000-000000000003', bed_id: '30000000-0003-4000-8000-000000000002', check_in_date: '2025-03-01T00:00:00Z', status: 'ACTIVE', advance_paid: 14000 },
  { id: '40000000-0001-4000-8000-000000000005', user_id: '00000000-0002-4000-8000-000000000005', pg_id: '10000000-0001-4000-8000-000000000004', bed_id: '30000000-0004-4000-8000-000000000004', check_in_date: '2025-02-15T00:00:00Z', status: 'ACTIVE', advance_paid: 11000 },
  { id: '40000000-0001-4000-8000-000000000006', user_id: '00000000-0002-4000-8000-000000000006', pg_id: '10000000-0001-4000-8000-000000000003', bed_id: '30000000-0003-4000-8000-000000000006', check_in_date: '2025-04-01T00:00:00Z', status: 'ACTIVE', advance_paid: 14000 },
];

const PAYMENTS = [
  { id: '50000000-0001-4000-8000-000000000001', user_id: '00000000-0002-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', booking_id: '40000000-0001-4000-8000-000000000001', amount: 12000, type: 'RENT', status: 'COMPLETED', due_date: '2025-01-01', paid_date: '2025-01-02', method: 'UPI' },
  { id: '50000000-0001-4000-8000-000000000002', user_id: '00000000-0002-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', booking_id: '40000000-0001-4000-8000-000000000001', amount: 12000, type: 'RENT', status: 'COMPLETED', due_date: '2025-02-01', paid_date: '2025-02-03', method: 'CARD' },
  { id: '50000000-0001-4000-8000-000000000003', user_id: '00000000-0002-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', booking_id: '40000000-0001-4000-8000-000000000001', amount: 12000, type: 'RENT', status: 'COMPLETED', due_date: '2025-03-01', paid_date: '2025-03-02', method: 'UPI' },
  { id: '50000000-0001-4000-8000-000000000004', user_id: '00000000-0002-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', booking_id: '40000000-0001-4000-8000-000000000001', amount: 12000, type: 'RENT', status: 'COMPLETED', due_date: '2025-04-01', paid_date: '2025-04-01', method: 'NET_BANKING' },
  { id: '50000000-0001-4000-8000-000000000005', user_id: '00000000-0002-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', booking_id: '40000000-0001-4000-8000-000000000001', amount: 12000, type: 'RENT', status: 'COMPLETED', due_date: '2025-05-01', paid_date: '2025-05-03', method: 'UPI' },
  { id: '50000000-0001-4000-8000-000000000006', user_id: '00000000-0002-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', booking_id: '40000000-0001-4000-8000-000000000001', amount: 12000, type: 'RENT', status: 'PENDING', due_date: '2025-06-01' },
  { id: '50000000-0002-4000-8000-000000000001', user_id: '00000000-0002-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000002', amount: 14000, type: 'RENT', status: 'COMPLETED', due_date: '2025-02-01', paid_date: '2025-02-01', method: 'UPI' },
  { id: '50000000-0002-4000-8000-000000000002', user_id: '00000000-0002-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000002', amount: 14000, type: 'RENT', status: 'COMPLETED', due_date: '2025-03-01', paid_date: '2025-03-02', method: 'CASH' },
  { id: '50000000-0002-4000-8000-000000000003', user_id: '00000000-0002-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000002', amount: 14000, type: 'RENT', status: 'COMPLETED', due_date: '2025-04-01', paid_date: '2025-04-01', method: 'UPI' },
  { id: '50000000-0002-4000-8000-000000000004', user_id: '00000000-0002-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000002', amount: 14000, type: 'RENT', status: 'COMPLETED', due_date: '2025-05-01', paid_date: '2025-05-02', method: 'UPI' },
  { id: '50000000-0002-4000-8000-000000000005', user_id: '00000000-0002-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000002', amount: 14000, type: 'RENT', status: 'PENDING', due_date: '2025-06-01' },
  { id: '50000000-0003-4000-8000-000000000001', user_id: '00000000-0002-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000002', booking_id: '40000000-0001-4000-8000-000000000003', amount: 8500, type: 'RENT', status: 'COMPLETED', due_date: '2025-01-01', paid_date: '2025-01-03', method: 'UPI' },
  { id: '50000000-0003-4000-8000-000000000002', user_id: '00000000-0002-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000002', booking_id: '40000000-0001-4000-8000-000000000003', amount: 8500, type: 'RENT', status: 'COMPLETED', due_date: '2025-02-01', paid_date: '2025-02-02', method: 'CARD' },
  { id: '50000000-0003-4000-8000-000000000003', user_id: '00000000-0002-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000002', booking_id: '40000000-0001-4000-8000-000000000003', amount: 8500, type: 'RENT', status: 'COMPLETED', due_date: '2025-03-01', paid_date: '2025-03-01', method: 'UPI' },
  { id: '50000000-0003-4000-8000-000000000004', user_id: '00000000-0002-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000002', booking_id: '40000000-0001-4000-8000-000000000003', amount: 8500, type: 'RENT', status: 'COMPLETED', due_date: '2025-04-01', paid_date: '2025-04-03', method: 'CASH' },
  { id: '50000000-0003-4000-8000-000000000005', user_id: '00000000-0002-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000002', booking_id: '40000000-0001-4000-8000-000000000003', amount: 8500, type: 'RENT', status: 'COMPLETED', due_date: '2025-05-01', paid_date: '2025-05-02', method: 'UPI' },
  { id: '50000000-0003-4000-8000-000000000006', user_id: '00000000-0002-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000002', booking_id: '40000000-0001-4000-8000-000000000003', amount: 8500, type: 'RENT', status: 'PENDING', due_date: '2025-06-01' },
  { id: '50000000-0004-4000-8000-000000000001', user_id: '00000000-0002-4000-8000-000000000004', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000004', amount: 14000, type: 'RENT', status: 'COMPLETED', due_date: '2025-03-01', paid_date: '2025-03-02', method: 'UPI' },
  { id: '50000000-0004-4000-8000-000000000002', user_id: '00000000-0002-4000-8000-000000000004', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000004', amount: 14000, type: 'RENT', status: 'COMPLETED', due_date: '2025-04-01', paid_date: '2025-04-01', method: 'UPI' },
  { id: '50000000-0004-4000-8000-000000000003', user_id: '00000000-0002-4000-8000-000000000004', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000004', amount: 14000, type: 'RENT', status: 'COMPLETED', due_date: '2025-05-01', paid_date: '2025-05-03', method: 'CARD' },
  { id: '50000000-0004-4000-8000-000000000004', user_id: '00000000-0002-4000-8000-000000000004', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000004', amount: 14000, type: 'RENT', status: 'PENDING', due_date: '2025-06-01' },
  { id: '50000000-0005-4000-8000-000000000001', user_id: '00000000-0002-4000-8000-000000000005', pg_id: '10000000-0001-4000-8000-000000000004', booking_id: '40000000-0001-4000-8000-000000000005', amount: 11000, type: 'RENT', status: 'COMPLETED', due_date: '2025-02-01', paid_date: '2025-02-02', method: 'UPI' },
  { id: '50000000-0005-4000-8000-000000000002', user_id: '00000000-0002-4000-8000-000000000005', pg_id: '10000000-0001-4000-8000-000000000004', booking_id: '40000000-0001-4000-8000-000000000005', amount: 11000, type: 'RENT', status: 'COMPLETED', due_date: '2025-03-01', paid_date: '2025-03-03', method: 'UPI' },
  { id: '50000000-0005-4000-8000-000000000003', user_id: '00000000-0002-4000-8000-000000000005', pg_id: '10000000-0001-4000-8000-000000000004', booking_id: '40000000-0001-4000-8000-000000000005', amount: 11000, type: 'RENT', status: 'COMPLETED', due_date: '2025-04-01', paid_date: '2025-04-02', method: 'NET_BANKING' },
  { id: '50000000-0005-4000-8000-000000000004', user_id: '00000000-0002-4000-8000-000000000005', pg_id: '10000000-0001-4000-8000-000000000004', booking_id: '40000000-0001-4000-8000-000000000005', amount: 11000, type: 'RENT', status: 'COMPLETED', due_date: '2025-05-01', paid_date: '2025-05-01', method: 'UPI' },
  { id: '50000000-0005-4000-8000-000000000005', user_id: '00000000-0002-4000-8000-000000000005', pg_id: '10000000-0001-4000-8000-000000000004', booking_id: '40000000-0001-4000-8000-000000000005', amount: 11000, type: 'RENT', status: 'PENDING', due_date: '2025-06-01' },
  { id: '50000000-0006-4000-8000-000000000001', user_id: '00000000-0002-4000-8000-000000000006', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000006', amount: 14000, type: 'RENT', status: 'COMPLETED', due_date: '2025-04-01', paid_date: '2025-04-02', method: 'UPI' },
  { id: '50000000-0006-4000-8000-000000000002', user_id: '00000000-0002-4000-8000-000000000006', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000006', amount: 14000, type: 'RENT', status: 'COMPLETED', due_date: '2025-05-01', paid_date: '2025-05-03', method: 'UPI' },
  { id: '50000000-0006-4000-8000-000000000003', user_id: '00000000-0002-4000-8000-000000000006', pg_id: '10000000-0001-4000-8000-000000000003', booking_id: '40000000-0001-4000-8000-000000000006', amount: 14000, type: 'RENT', status: 'PENDING', due_date: '2025-06-01' },
];

const COMPLAINTS = [
  { id: '60000000-0001-4000-8000-000000000001', user_id: '00000000-0002-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', title: 'WiFi not working in Room A101', description: 'WiFi has been down for 2 days.', category: 'MAINTENANCE', priority: 'HIGH', status: 'IN_PROGRESS', assigned_to: 'Arjun' },
  { id: '60000000-0001-4000-8000-000000000002', user_id: '00000000-0002-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000003', title: 'Water heater not functioning', description: 'Water heater stopped working since last week.', category: 'MAINTENANCE', priority: 'MEDIUM', status: 'OPEN' },
  { id: '60000000-0001-4000-8000-000000000003', user_id: '00000000-0002-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000002', title: 'Excessive noise from construction', description: 'Construction noise from 7 AM to 10 PM daily.', category: 'NOISE', priority: 'LOW', status: 'OPEN' },
  { id: '60000000-0001-4000-8000-000000000004', user_id: '00000000-0002-4000-8000-000000000004', pg_id: '10000000-0001-4000-8000-000000000003', title: 'Common bathroom cleanliness issue', description: 'Bathroom not being cleaned properly.', category: 'CLEANLINESS', priority: 'MEDIUM', status: 'RESOLVED', assigned_to: 'Lakshmi', resolution: 'Cleaning schedule updated.' },
  { id: '60000000-0001-4000-8000-000000000005', user_id: '00000000-0002-4000-8000-000000000005', pg_id: '10000000-0001-4000-8000-000000000004', title: 'AC remote missing', description: 'AC remote in Room D102 is missing.', category: 'MAINTENANCE', priority: 'LOW', status: 'RESOLVED', assigned_to: 'Arjun', resolution: 'Replacement remote provided.' },
  { id: '60000000-0001-4000-8000-000000000006', user_id: '00000000-0002-4000-8000-000000000006', pg_id: '10000000-0001-4000-8000-000000000003', title: 'Security gate malfunction', description: 'Main gate electronic lock not working.', category: 'SAFETY', priority: 'URGENT', status: 'IN_PROGRESS', assigned_to: 'Ramesh', resolution: 'Technician called.' },
];

const VENDORS = [
  { id: '70000000-0001-4000-8000-000000000001', name: 'QuickFix Plumbing', type: 'PLUMBER', phone: '+919876540001', email: 'quickfix@email.com', city: 'Bangalore', area: 'Koramangala', rating: 4.2, status: 'ACTIVE' },
  { id: '70000000-0001-4000-8000-000000000002', name: 'Spark Electric', type: 'ELECTRICIAN', phone: '+919876540002', email: 'spark@email.com', city: 'Bangalore', area: 'HSR Layout', rating: 4.5, status: 'ACTIVE' },
  { id: '70000000-0001-4000-8000-000000000003', name: 'CleanPro Services', type: 'CLEANER', phone: '+919876540003', city: 'Bangalore', area: 'Indiranagar', rating: 4.0, status: 'ACTIVE' },
  { id: '70000000-0001-4000-8000-000000000004', name: 'Fresh Paint Co', type: 'PAINTER', phone: '+919876540004', email: 'freshpaint@email.com', city: 'Bangalore', area: 'Whitefield', rating: 3.8, status: 'ACTIVE' },
  { id: '70000000-0001-4000-8000-000000000005', name: 'WoodCraft Works', type: 'CARPENTER', phone: '+919876540005', city: 'Bangalore', area: 'Marathahalli', rating: 4.3, status: 'ACTIVE' },
  { id: '70000000-0001-4000-8000-000000000006', name: 'NetConnect WiFi', type: 'WIFI', phone: '+919876540006', email: 'netconnect@email.com', city: 'Bangalore', area: 'Electronic City', rating: 4.6, status: 'ACTIVE' },
  { id: '70000000-0001-4000-8000-000000000007', name: 'Mr. Right Services', type: 'GENERAL', phone: '+919876540007', city: 'Bangalore', area: 'JP Nagar', rating: 3.9, status: 'ACTIVE' },
  { id: '70000000-0001-4000-8000-000000000008', name: 'PowerGrid Electric', type: 'ELECTRICIAN', phone: '+919876540008', email: 'powergrid@email.com', city: 'Bangalore', area: 'BTM Layout', rating: 4.1, status: 'ACTIVE' },
];

const WORKERS = [
  { id: '80000000-0001-4000-8000-000000000001', name: 'Ramesh', role: 'SECURITY', phone: '+919876550001', pg_id: '10000000-0001-4000-8000-000000000001', shift: 'NIGHT', status: 'ACTIVE' },
  { id: '80000000-0001-4000-8000-000000000002', name: 'Geeta', role: 'CLEANER', phone: '+919876550002', pg_id: '10000000-0001-4000-8000-000000000001', shift: 'MORNING', status: 'ACTIVE' },
  { id: '80000000-0001-4000-8000-000000000003', name: 'Suresh', role: 'COOK', phone: '+919876550003', pg_id: '10000000-0001-4000-8000-000000000002', shift: 'MORNING', status: 'ACTIVE' },
  { id: '80000000-0001-4000-8000-000000000004', name: 'Lakshmi', role: 'CLEANER', phone: '+919876550004', pg_id: '10000000-0001-4000-8000-000000000003', shift: 'EVENING', status: 'ACTIVE' },
  { id: '80000000-0001-4000-8000-000000000005', name: 'Mohan', role: 'MANAGER', phone: '+919876550005', pg_id: '10000000-0001-4000-8000-000000000001', shift: 'MORNING', status: 'ACTIVE' },
  { id: '80000000-0001-4000-8000-000000000006', name: 'Kavitha', role: 'COOK', phone: '+919876550006', pg_id: '10000000-0001-4000-8000-000000000004', shift: 'EVENING', status: 'ACTIVE' },
  { id: '80000000-0001-4000-8000-000000000007', name: 'Arjun', role: 'MAINTENANCE', phone: '+919876550007', pg_id: '10000000-0001-4000-8000-000000000006', shift: 'MORNING', status: 'ACTIVE' },
  { id: '80000000-0001-4000-8000-000000000008', name: 'Deepa', role: 'CLEANER', phone: '+919876550008', pg_id: '10000000-0001-4000-8000-000000000005', shift: 'MORNING', status: 'ACTIVE' },
];

const ACTIVITY_LOG = [
  { owner_id: '00000000-0001-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', action: 'Created PG', details: 'Sunrise PG registered on platform', entity_type: 'pg' },
  { owner_id: '00000000-0001-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', action: 'New Booking', details: 'Vikram Singh booked bed in A101', entity_type: 'booking' },
  { owner_id: '00000000-0001-4000-8000-000000000001', pg_id: '10000000-0001-4000-8000-000000000001', action: 'Rent Collected', details: 'Monthly rent collected from Vikram Singh', entity_type: 'payment' },
  { owner_id: '00000000-0001-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000003', action: 'Complaint Resolved', details: 'Bathroom cleanliness issue resolved', entity_type: 'complaint' },
  { owner_id: '00000000-0001-4000-8000-000000000002', pg_id: '10000000-0001-4000-8000-000000000003', action: 'New Tenant', details: 'Ananya Reddy moved into C101', entity_type: 'booking' },
  { owner_id: '00000000-0001-4000-8000-000000000003', pg_id: '10000000-0001-4000-8000-000000000006', action: 'PG Approved', details: 'Royal Residency PG approved and verified', entity_type: 'pg' },
];

// ─── Seed steps ──────────────────────────────────────────────────────

interface SeedStepResult {
  table: string;
  count: number;
  status: 'ok' | 'error';
  error?: string;
}

async function seedTable(
  table: string,
  data: Record<string, unknown>[],
  results: SeedStepResult[],
): Promise<void> {
  const { error } = await supabaseAdmin.from(table).insert(data);
  if (error) {
    results.push({ table, count: 0, status: 'error', error: error.message });
  } else {
    results.push({ table, count: data.length, status: 'ok' });
  }
}

// ─── POST Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = requireAdminSecret(request);
  if (authError) return authError;

  try {
    // Check if users table already has data
    const { count: userCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userCount && userCount > 0) {
      return NextResponse.json({
        message: `Database already has ${userCount} user(s). Skipping seed to avoid duplicates.`,
        skipped: true,
        existing_users: userCount,
      });
    }

    const results: SeedStepResult[] = [];

    // Seed in dependency order
    await seedTable('users', USERS, results);
    await seedTable('pgs', PGS, results);
    await seedTable('rooms', ROOMS, results);
    await seedTable('beds', BEDS, results);
    await seedTable('bookings', BOOKINGS, results);
    await seedTable('payments', PAYMENTS, results);
    await seedTable('complaints', COMPLAINTS, results);
    await seedTable('vendors', VENDORS, results);
    await seedTable('workers', WORKERS, results);
    await seedTable('activity_log', ACTIVITY_LOG, results);

    const failures = results.filter((r) => r.status === 'error');
    const successes = results.filter((r) => r.status === 'ok');
    const totalRows = successes.reduce((sum, r) => sum + r.count, 0);

    if (failures.length > 0) {
      return NextResponse.json({
        message: `Seed completed with ${failures.length} error(s). ${successes.length}/10 tables seeded successfully.`,
        success: false,
        total_rows_inserted: totalRows,
        details: results,
      }, { status: 207 });
    }

    return NextResponse.json({
      message: `Seed complete! Inserted ${totalRows} rows across 10 tables.`,
      success: true,
      total_rows_inserted: totalRows,
      details: results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Seed failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
