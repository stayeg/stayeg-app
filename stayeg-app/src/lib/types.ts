export type UserRole = 'TENANT' | 'OWNER' | 'VENDOR' | 'ADMIN';
export type PGGender = 'MALE' | 'FEMALE' | 'UNISEX';
export type RoomType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORMITORY';
export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentType = 'RENT' | 'ADVANCE' | 'SECURITY_DEPOSIT';
export type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'UPI' | 'NET_BANKING' | 'WALLET' | 'COUPON' | 'RAZORPAY';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type ComplaintCategory = 'MAINTENANCE' | 'CLEANLINESS' | 'NOISE' | 'SAFETY' | 'GENERAL';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type VendorType = 'PLUMBER' | 'ELECTRICIAN' | 'CLEANER' | 'PAINTER' | 'CARPENTER' | 'WIFI' | 'GENERAL';
export type WorkerRole = 'SECURITY' | 'CLEANER' | 'COOK' | 'MANAGER' | 'MAINTENANCE';
export type WorkerShift = 'MORNING' | 'EVENING' | 'NIGHT';
export type PGStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type KYCStatus = 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type SubscriptionPlan = 'FREE_TRIAL' | 'YEARLY' | 'BIYEARLY' | 'TRIYEARLY';

export type AppView = 
  // Public (no login required)
  | 'LANDING'
  | 'PG_LISTING'
  | 'PG_DETAIL'
  | 'PRICING'
  | 'LOGIN'
  | 'SIGNUP'
  // Tenant (new mobile-first views)
  | 'TENANT_HOME'
  | 'TENANT_EXPLORE'
  | 'TENANT_MY_STAY'
  | 'TENANT_SUPPORT'
  | 'TENANT_GUIDE'
  | 'TENANT_PROFILE'
  // Customer (requires login)
  | 'BOOKING'
  | 'MY_STAY'
  | 'MY_BOOKINGS'
  | 'PAYMENTS'
  | 'COMPLAINTS'
  | 'NEARBY'
  | 'PROFILE'
  | 'COMMUNITY'
  // Owner
  | 'OWNER_DASHBOARD'
  | 'OWNER_PGS'
  | 'OWNER_ROOMS'
  | 'OWNER_TENANTS'
  | 'OWNER_RENT'
  | 'OWNER_VENDORS'
  | 'OWNER_WORKERS'
  | 'OWNER_COMPLAINTS'
  | 'OWNER_QR'
  | 'OWNER_SUPPORT'
  // Vendor
  | 'VENDOR_DASHBOARD'
  | 'VENDOR_SERVICES'
  | 'VENDOR_EARNINGS'
  // Admin
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_VERIFICATION'
  | 'ADMIN_USERS'
  // Setup
  | 'DATABASE_SETUP_V2'
  // Policy & Info pages
  | 'TERMS'
  | 'PRIVACY'
  | 'SAFE_USE'
  | 'ABOUT'
  | 'HELP'
  | 'HOW_IT_WORKS'
  | 'CONTACT'
  | 'REFUND_POLICY'
  // Owner
  | 'OWNER_SETUP';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  gender?: string;
  isVerified: boolean;
  kycStatus?: KYCStatus;
  bio?: string;
  city?: string;
  age?: number;
  occupation?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  createdAt?: string;
}

export interface PG {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
  gender: PGGender;
  price: number;
  securityDeposit: number;
  amenities: string;
  images: string;
  rating: number;
  totalReviews: number;
  status: PGStatus;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
  owner?: User;
  rooms?: Room[];
}

export interface Room {
  id: string;
  pgId: string;
  roomCode: string;
  roomType: RoomType;
  floor: number;
  hasAC: boolean;
  hasAttachedBath: boolean;
  beds?: Bed[];
}

export interface Bed {
  id: string;
  roomId: string;
  bedNumber: number;
  status: BedStatus;
  price?: number;
  room?: Room;
}

export interface Booking {
  id: string;
  userId: string;
  pgId: string;
  bedId: string;
  checkInDate: string;
  status: BookingStatus;
  advancePaid: number;
  user?: User;
  pg?: PG;
  bed?: Bed;
  payments?: Payment[];
  images?: string[];
  notes?: string;
}

export interface Payment {
  id: string;
  userId: string;
  pgId: string;
  bookingId?: string;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  dueDate?: string;
  paidDate?: string;
  method?: string;
  couponCode?: string;
  discount?: number;
  user?: User;
  pg?: PG;
}

export interface Complaint {
  id: string;
  userId: string;
  pgId: string;
  title: string;
  description?: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedTo?: string;
  resolution?: string;
  createdAt: string;
  user?: User;
  pg?: PG;
}

export interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  phone: string;
  email?: string;
  city: string;
  area?: string;
  rating: number;
  status: string;
  avatar?: string;
  description?: string;
  experience?: number;
  priceRange?: string;
}

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  phone: string;
  pgId?: string;
  shift?: WorkerShift;
  status: string;
}

export interface AnalyticsData {
  totalPGs: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
  monthlyRevenue: number;
  pendingPayments: number;
  totalTenants: number;
  activeBookings: number;
  revenueTrend: { month: string; revenue: number }[];
  occupancyTrend: { month: string; rate: number }[];
  genderDistribution: { male: number; female: number; unisex: number };
}

export interface SearchFilters {
  query?: string;
  gender?: PGGender | 'ALL';
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest';
  city?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  duration: string;
  durationMonths: number;
  price: number;
  originalPrice: number;
  discount: number;
  setupFee: number;
  features: string[];
  badge?: string;
  popular?: boolean;
}

export interface Coupon {
  code: string;
  description: string;
  discountPercent: number;
  minAmount: number;
  maxDiscount: number;
  validTill: string;
  applicableFor: ('RENT' | 'ADVANCE' | 'SUBSCRIPTION')[];
  flatDiscount?: number;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  comments: number;
  createdAt: string;
  tags?: string[];
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  members: number;
  category: string;
  avatar?: string;
  isJoined: boolean;
}

export interface Review {
  id: string;
  pgId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  cleanliness: number;
  safety: number;
  valueForMoney: number;
  amenities: number;
  management: number;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'PG' | 'USER' | 'REVIEW';
  reason: string;
  description: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
  createdAt: string;
}
