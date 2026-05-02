export const AMENITIES_LIST = [
  { id: 'wifi', label: 'WiFi', icon: 'Wifi' },
  { id: 'ac', label: 'AC', icon: 'Snowflake' },
  { id: 'food', label: 'Meals', icon: 'UtensilsCrossed' },
  { id: 'laundry', label: 'Laundry', icon: 'Shirt' },
  { id: 'parking', label: 'Parking', icon: 'Car' },
  { id: 'gym', label: 'Gym', icon: 'Dumbbell' },
  { id: 'cctv', label: 'CCTV', icon: 'Camera' },
  { id: 'power_backup', label: 'Power Backup', icon: 'Zap' },
  { id: 'water_heater', label: 'Water Heater', icon: 'Thermometer' },
  { id: 'study_table', label: 'Study Table', icon: 'BookOpen' },
  { id: 'wardrobe', label: 'Wardrobe', icon: 'Archive' },
  { id: 'housekeeping', label: 'Housekeeping', icon: 'Sparkles' },
  { id: 'common_room', label: 'Common Room', icon: 'Users' },
  { id: 'tv', label: 'TV Lounge', icon: 'Tv' },
  { id: 'refrigerator', label: 'Refrigerator', icon: 'Refrigerator' },
];

export const CITIES = [
  'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune',
  'Chennai', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Chandigarh'
];

export const PG_IMAGES = [
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600&h=400&fit=crop',
];

export const NEARBY_SERVICES = [
  { name: 'Metro Station', icon: 'TrainFront', count: 24 },
  { name: 'Hospitals', icon: 'Hospital', count: 18 },
  { name: 'Restaurants', icon: 'UtensilsCrossed', count: 156 },
  { name: 'Shopping Malls', icon: 'ShoppingBag', count: 12 },
  { name: 'Parks', icon: 'TreePine', count: 8 },
  { name: 'Gyms', icon: 'Dumbbell', count: 32 },
  { name: 'Banks & ATMs', icon: 'Landmark', count: 45 },
  { name: 'Pharmacies', icon: 'Pill', count: 28 },
];

// ============================
// BADGE & CARD COLORS
// ============================
export const BADGE = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  gray: 'bg-gray-100 text-gray-700',
  night: 'bg-slate-700 text-gray-200',
} as const;

export const BADGE_BORDER = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
} as const;

export const CARD_BG = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  yellow: 'bg-yellow-50',
  red: 'bg-red-50',
  purple: 'bg-purple-50',
  amber: 'bg-amber-50',
  pink: 'bg-pink-50',
  orange: 'bg-orange-50',
} as const;

export const TEXT_COLOR = {
  green: 'text-green-700',
  red: 'text-red-700',
  yellow: 'text-yellow-700',
  blue: 'text-blue-700',
  purple: 'text-purple-700',
  greenLight: 'text-green-600',
} as const;

export const STATUSES = {
  BOOKING: {
    PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    CONFIRMED: { label: 'Confirmed', color: 'bg-green-100 text-green-800' },
    ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800' },
    COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  },
  PAYMENT: {
    PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800' },
    FAILED: { label: 'Failed', color: 'bg-red-100 text-red-800' },
    REFUNDED: { label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
  },
  COMPLAINT: {
    OPEN: { label: 'Open', color: 'bg-red-100 text-red-800' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
    CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  },
  BED: {
    AVAILABLE: { label: 'Available', color: 'bg-green-100 text-green-800' },
    OCCUPIED: { label: 'Occupied', color: 'bg-red-100 text-red-800' },
    MAINTENANCE: { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800' },
  },
  PG: {
    PENDING: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
    APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  },
} as const;

export const AVATARS = [
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Bailey',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Cookie',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Daisy',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Gizmo',
];

// ============================
// PRICING PLANS
// ============================
export const PRICING_PLANS = [
  {
    id: 'yearly',
    name: 'Starter',
    duration: '1 Year',
    durationMonths: 12,
    price: 12499,
    originalPrice: 12499,
    discount: 0,
    setupFee: 2500,
    features: [
      'List up to 2 PG properties',
      'Smart room & bed management',
      'Tenant booking & verification',
      'Rent collection & tracking',
      'Complaint management system',
      'Basic analytics dashboard',
      'Staff management (up to 5)',
      'WhatsApp notifications',
    ],
    badge: 'Most Popular',
    popular: true,
  },
  {
    id: 'biyearly',
    name: 'Growth',
    duration: '2 Years',
    durationMonths: 24,
    price: 24999,
    originalPrice: 24998,
    discount: 20,
    setupFee: 3000,
    features: [
      'Everything in Starter',
      'List up to 5 PG properties',
      'Advanced analytics & reports',
      'AI-powered rent reminders',
      'Vendor management portal',
      'Staff management (up to 15)',
      'Priority customer support',
      'Custom branded dashboard',
      'Festival offer discounts',
      'Coupon creation for tenants',
    ],
    badge: '20% OFF',
    popular: false,
  },
  {
    id: 'triyearly',
    name: 'Enterprise',
    duration: '3 Years',
    durationMonths: 36,
    price: 37499,
    originalPrice: 37497,
    discount: 30,
    setupFee: 5000,
    features: [
      'Everything in Growth',
      'Unlimited PG properties',
      'Full AI assistant integration',
      'Community management tools',
      'Dedicated account manager',
      'Unlimited staff management',
      'Multi-location support',
      'Custom API integrations',
      'White-label mobile app',
      'Bulk coupon & offer engine',
      'Revenue optimization insights',
      'Free listing on partner sites',
    ],
    badge: '30% OFF',
    popular: false,
  },
];

// ============================
// COUPONS
// ============================
export const AVAILABLE_COUPONS = [
  {
    code: 'STAYEG500',
    description: 'Flat ₹500 off on first booking',
    discountPercent: 0,
    minAmount: 3000,
    maxDiscount: 500,
    flatDiscount: 500,
    validTill: '2025-12-31',
    applicableFor: ['ADVANCE'],
  },
  {
    code: 'FIRSTFREE',
    description: '1st 1000 PG Owners - Free 1 Year Subscription',
    discountPercent: 100,
    minAmount: 0,
    maxDiscount: 12499,
    validTill: '2025-12-31',
    applicableFor: ['SUBSCRIPTION'],
  },
  {
    code: 'DIWALI20',
    description: '20% off on subscription during Diwali',
    discountPercent: 20,
    minAmount: 5000,
    maxDiscount: 5000,
    validTill: '2025-11-15',
    applicableFor: ['SUBSCRIPTION'],
  },
  {
    code: 'RENT10',
    description: '10% off on monthly rent payment',
    discountPercent: 10,
    minAmount: 5000,
    maxDiscount: 2000,
    validTill: '2025-12-31',
    applicableFor: ['RENT'],
  },
];

// ============================
// COMMUNITY CATEGORIES
// ============================
export const COMMUNITY_CATEGORIES = [
  'Roommates', 'Events', 'Food', 'Sports', 'Travel',
  'Study Groups', 'Fitness', 'Music', 'Movies', 'Tech',
  'Local Tips', 'Move-in Help', 'Car Pool', 'Pets',
];

export const SAMPLE_COMMUNITY_GROUPS = [
  { id: 'g1', name: 'Bangalore Roommates', description: 'Find roommates and share rooms in Bangalore', members: 2840, category: 'Roommates', isJoined: false },
  { id: 'g2', name: 'Weekend Trekkers', description: 'Explore trails around Bangalore on weekends', members: 1250, category: 'Travel', isJoined: false },
  { id: 'g3', name: 'Foodies United', description: 'Discover best food spots near your PG', members: 3100, category: 'Food', isJoined: false },
  { id: 'g4', name: 'Study & Chill', description: 'Study groups, exam prep and chill hangouts', members: 1890, category: 'Study Groups', isJoined: false },
  { id: 'g5', name: 'Fitness Freaks', description: 'Gym buddies, yoga sessions, morning runs', members: 980, category: 'Fitness', isJoined: false },
  { id: 'g6', name: 'Tech Hub BLR', description: 'Tech talks, hackathons and coding sessions', members: 1560, category: 'Tech', isJoined: false },
  { id: 'g7', name: 'Movie Night Gang', description: 'Weekly movie nights and series discussions', members: 2200, category: 'Movies', isJoined: false },
  { id: 'g8', name: 'New to Bangalore', description: 'Help and tips for people who just moved here', members: 4500, category: 'Local Tips', isJoined: false },
  { id: 'g9', name: 'Car Pool BLR', description: 'Share rides to save money and reduce pollution', members: 890, category: 'Car Pool', isJoined: false },
  { id: 'g10', name: 'Pet Lovers PG', description: 'For pet owners living in PGs and hostels', members: 670, category: 'Pets', isJoined: false },
];

export const SAMPLE_COMMUNITY_POSTS = [
  { id: 'p1', authorId: 'u1', authorName: 'Priya M.', authorAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya', title: 'Looking for a female roommate in Koramangala', content: 'Hi! I have a double sharing room in Koramangala, 3rd floor with AC. The other bed is vacant. Rent is ₹8500/mo including meals. PG has WiFi, laundry, and 24/7 security. DM me if interested!', category: 'Roommates', likes: 24, comments: 8, createdAt: '2025-01-15T10:30:00Z', tags: ['Koramangala', 'Female', 'AC'] },
  { id: 'p2', authorId: 'u2', authorName: 'Arjun K.', authorAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Arjun', title: 'Weekend trek to Nandi Hills this Saturday!', content: 'Planning a sunrise trek to Nandi Hills this Saturday. We are a group of 8 so far. Car pool available from Indiranagar. Cost sharing for fuel. Interested? Join the group!', category: 'Travel', likes: 56, comments: 19, createdAt: '2025-01-14T18:00:00Z', tags: ['Nandi Hills', 'Trek', 'Weekend'] },
  { id: 'p3', authorId: 'u3', authorName: 'Sneha R.', authorAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sneha', title: 'Best biryani near HSR Layout - Found it!', content: 'Just discovered this amazing biryani place near HSR BDA complex. Dum Biryani for ₹180 and the portion is huge! They also have good kebabs. Highly recommend for foodies on a budget.', category: 'Food', likes: 89, comments: 32, createdAt: '2025-01-14T13:00:00Z', tags: ['HSR Layout', 'Biryani', 'Budget Food'] },
  { id: 'p4', authorId: 'u4', authorName: 'Rahul S.', authorAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Rahul', title: 'Tips for new people moving to Bangalore', content: '1. Get an BMTC bus pass immediately - saves a lot. 2. Download Namma Metro app. 3. Swiggy One is worth it if you order 4+ times/month. 4. Join local WhatsApp groups for your area. 5. Carry an umbrella always!', category: 'Local Tips', likes: 156, comments: 45, createdAt: '2025-01-13T09:00:00Z', tags: ['Bangalore', 'Tips', 'Newcomer'] },
  { id: 'p5', authorId: 'u5', authorName: 'Meera J.', authorAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Meera', title: 'Free yoga sessions every morning in Cubbon Park', content: 'A group of us do yoga in Cubbon Park every morning 6-7 AM. Completely free, all levels welcome. We meet near the bamboo grove. Great way to start the day!', category: 'Fitness', likes: 73, comments: 21, createdAt: '2025-01-12T16:00:00Z', tags: ['Yoga', 'Cubbon Park', 'Free'] },
];
