'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  MapPin,
  Building2,
  ShieldCheck,
  ArrowUpDown,
  BedDouble,
  Wifi,
  Snowflake,
  UtensilsCrossed,
  Shirt,
  Car,
  Dumbbell,
  Camera,
  Zap,
  BookOpen,
  Sparkles,
  ChevronRight,
  Compass,
  RotateCcw,
  FilterX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import {
  fadeIn,
  slideUp,
  staggerContainer,
  staggerItem,
  loadingShimmer,
} from '@/lib/animations';
import { AMENITIES_LIST, CITIES, PG_IMAGES } from '@/lib/constants';
import type { PG, PGGender, RoomType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GENDER_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'UNISEX', label: 'Unisex' },
] as const;

const PRICE_RANGES = [
  { label: 'Under 5K', min: 0, max: 5000 },
  { label: '5K-10K', min: 5000, max: 10000 },
  { label: '10K-15K', min: 10000, max: 15000 },
  { label: '15K+', min: 15000, max: 30000 },
] as const;

const SORT_OPTIONS = [
  { value: 'rating', label: 'Rating' },
  { value: 'price_asc', label: 'Price Low' },
  { value: 'price_desc', label: 'Price High' },
  { value: 'newest', label: 'Newest' },
] as const;

const ROOM_TYPES = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'DOUBLE', label: 'Double' },
  { value: 'TRIPLE', label: 'Triple' },
  { value: 'DORMITORY', label: 'Dormitory' },
] as const;

const FILTERED_AMENITIES = AMENITIES_LIST.filter((a) =>
  ['wifi', 'ac', 'laundry', 'food', 'parking', 'cctv', 'gym', 'study_table'].includes(a.id),
);

const AMENITY_ICONS: Record<string, React.ElementType> = {
  wifi: Wifi,
  ac: Snowflake,
  food: UtensilsCrossed,
  laundry: Shirt,
  parking: Car,
  gym: Dumbbell,
  cctv: Camera,
  power_backup: Zap,
  study_table: BookOpen,
  housekeeping: Sparkles,
};

const AMENITY_LABELS: Record<string, string> = Object.fromEntries(
  AMENITIES_LIST.map((a) => [a.id, a.label]),
);

const POPULAR_CITIES = [
  { name: 'Bangalore', gradient: 'from-teal-500 to-emerald-600', emoji: '💻' },
  { name: 'Hyderabad', gradient: 'from-violet-500 to-purple-600', emoji: '🏯' },
  { name: 'Chennai', gradient: 'from-rose-500 to-pink-600', emoji: '🏖️' },
  { name: 'Pune', gradient: 'from-amber-500 to-orange-600', emoji: '🎓' },
  { name: 'Delhi', gradient: 'from-red-500 to-rose-600', emoji: '🏛️' },
  { name: 'Mumbai', gradient: 'from-cyan-500 to-sky-600', emoji: '🌊' },
] as const;

const GENDER_COLORS: Record<string, string> = {
  MALE: 'bg-blue-100 text-blue-700 border-blue-200',
  FEMALE: 'bg-pink-100 text-pink-700 border-pink-200',
  UNISEX: 'bg-purple-100 text-purple-700 border-purple-200',
};

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Boys',
  FEMALE: 'Girls',
  UNISEX: 'Unisex',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PGCardSkeleton() {
  return (
    <motion.div variants={loadingShimmer} animate="animate">
      <div className="rounded-2xl border bg-card shadow-md overflow-hidden">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-14 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
          <div className="flex justify-between pt-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ExplorePGCard({ pg, index }: { pg: PG; index: number }) {
  const { setSelectedPG, setCurrentView } = useAppStore();

  const images = useMemo(() => {
    if (!pg?.images) return PG_IMAGES;
    if (Array.isArray(pg.images) && pg.images.length > 0) return pg.images;
    const str = String(pg.images);
    if (!str.trim()) return PG_IMAGES;
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* not JSON */ }
    const imgs = str.split(',').map((s) => s.trim()).filter(Boolean);
    return imgs.length > 0 ? imgs : PG_IMAGES;
  }, [pg?.images]);

  const amenitiesList = useMemo(() => {
    if (typeof pg.amenities === 'string') return pg.amenities.split(',').filter(Boolean);
    if (Array.isArray(pg.amenities)) return pg.amenities;
    return [];
  }, [pg.amenities]);

  const topAmenities = amenitiesList.slice(0, 3);

  const handleCardClick = () => {
    setSelectedPG(pg);
    setCurrentView('PG_DETAIL');
  };

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 24 } }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(); }}
        className="rounded-2xl border bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer group"
      >
        {/* Cover Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={images[0] || PG_IMAGES[0]}
            alt={pg.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {pg.isVerified && (
              <span className="flex items-center gap-1 bg-green-500 text-white px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
                <ShieldCheck className="size-3" />
                Verified
              </span>
            )}
            <Badge
              variant="outline"
              className={`text-xs font-medium backdrop-blur-sm bg-white/80 ${GENDER_COLORS[pg.gender] || ''}`}
            >
              {GENDER_LABELS[pg.gender] || pg.gender}
            </Badge>
          </div>

          {/* Price tag */}
          <div className="absolute bottom-3 right-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-lg font-bold text-foreground">
                ₹{Math.round(pg.price).toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-muted-foreground">/mo</span>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-4 space-y-2.5">
          {/* Name + Rating */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground text-base truncate">{pg.name}</h3>
              <div className="flex items-center gap-1 mt-1 text-muted-foreground text-sm">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{pg.address}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg shrink-0">
              <Star className="size-4 text-amber-500 fill-amber-500" />
              <span className="font-semibold text-sm text-foreground">
                {pg.rating?.toFixed(1) ?? 'N/A'}
              </span>
              <span className="text-xs text-muted-foreground">({pg.totalReviews ?? 0})</span>
            </div>
          </div>

          {/* Top 3 Amenities */}
          {topAmenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topAmenities.map((amenity) => {
                const Icon = AMENITY_ICONS[amenity];
                return (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md text-xs font-medium"
                  >
                    {Icon && <Icon className="size-3" />}
                    {AMENITY_LABELS[amenity] || amenity}
                  </span>
                );
              })}
              {amenitiesList.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 bg-muted text-muted-foreground rounded-md text-xs font-medium">
                  +{amenitiesList.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* View Details button */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <BedDouble className="size-4 text-teal-600" />
              <span>{pg.city}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 rounded-lg"
            >
              View Details
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Advanced Filters Content (shared between Sheet/Dialog/Drawer)
// ---------------------------------------------------------------------------

function AdvancedFiltersContent({
  localFilters,
  setLocalFilters,
}: {
  localFilters: LocalFilterState;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFilterState>>;
}) {
  return (
    <div className="space-y-6 pb-4">
      {/* Price Range */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">Price Range</Label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Min (₹)</Label>
            <Input
              type="number"
              placeholder="0"
              value={localFilters.minPrice || ''}
              onChange={(e) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  minPrice: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="h-9"
            />
          </div>
          <span className="text-muted-foreground mt-5">—</span>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Max (₹)</Label>
            <Input
              type="number"
              placeholder="30000"
              value={localFilters.maxPrice || ''}
              onChange={(e) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  maxPrice: Math.min(30000, Number(e.target.value) || 0),
                }))
              }
              className="h-9"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Room Type */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">Room Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {ROOM_TYPES.map((rt) => (
            <button
              key={rt.value}
              onClick={() =>
                setLocalFilters((prev) => ({
                  ...prev,
                  roomType: prev.roomType === rt.value ? undefined : (rt.value as RoomType),
                }))
              }
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                localFilters.roomType === rt.value
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'bg-background border-border text-muted-foreground hover:border-teal-200 hover:bg-teal-50/50'
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Amenities */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">Amenities</Label>
        <div className="grid grid-cols-2 gap-2.5">
          {FILTERED_AMENITIES.map((amenity) => (
            <div key={amenity.id} className="flex items-center gap-2">
              <Checkbox
                id={`explore-${amenity.id}`}
                checked={localFilters.amenities.includes(amenity.id)}
                onCheckedChange={(checked) => {
                  setLocalFilters((prev) => ({
                    ...prev,
                    amenities: checked
                      ? [...prev.amenities, amenity.id]
                      : prev.amenities.filter((a) => a !== amenity.id),
                  }));
                }}
              />
              <Label
                htmlFor={`explore-${amenity.id}`}
                className="text-sm text-muted-foreground cursor-pointer font-normal"
              >
                {amenity.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local filter state type
// ---------------------------------------------------------------------------

interface LocalFilterState {
  query: string;
  city: string;
  gender: string;
  sortBy: string;
  priceRangeLabel: string | null;
  minPrice: number;
  maxPrice: number;
  amenities: string[];
  roomType?: RoomType;
}

const DEFAULT_LOCAL_FILTERS: LocalFilterState = {
  query: '',
  city: 'Bangalore',
  gender: 'ALL',
  sortBy: 'rating',
  priceRangeLabel: null,
  minPrice: 0,
  maxPrice: 30000,
  amenities: [],
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TenantExplore() {
  const {
    searchFilters,
    setSearchFilters,
    resetFilters,
    currentUser,
    setSelectedPG,
    setCurrentView,
  } = useAppStore();

  // -----------------------------------------------------------------------
  // Local filter state (synced with store on init)
  // -----------------------------------------------------------------------
  const [localFilters, setLocalFilters] = useState<LocalFilterState>(() => ({
    ...DEFAULT_LOCAL_FILTERS,
    city: searchFilters.city || currentUser?.city || 'Bangalore',
    gender: searchFilters.gender || 'ALL',
    sortBy: searchFilters.sortBy || 'rating',
    minPrice: searchFilters.minPrice || 0,
    maxPrice: searchFilters.maxPrice || 30000,
    amenities: searchFilters.amenities || [],
    query: searchFilters.query || '',
  }));

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(localFilters.query);

  // -----------------------------------------------------------------------
  // Debounce search query
  // -----------------------------------------------------------------------
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(localFilters.query);
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [localFilters.query]);

  // -----------------------------------------------------------------------
  // Derived flags
  // -----------------------------------------------------------------------
  const isSearching =
    debouncedQuery.trim() !== '' ||
    localFilters.gender !== 'ALL' ||
    localFilters.priceRangeLabel !== null ||
    localFilters.amenities.length > 0 ||
    localFilters.roomType !== undefined;

  const activeFilterCount =
    (localFilters.gender !== 'ALL' ? 1 : 0) +
    (localFilters.priceRangeLabel !== null ? 1 : 0) +
    (localFilters.sortBy !== 'rating' ? 1 : 0) +
    localFilters.amenities.length +
    (localFilters.roomType ? 1 : 0);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------
  const [pgs, setPGs] = useState<PG[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const fetchPGs = useCallback(async () => {
    // Cancel any in-flight request
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setIsLoading(true);
    setIsError(false);

    try {
      const params = new URLSearchParams();
      params.set('city', localFilters.city);
      if (debouncedQuery.trim()) params.set('query', debouncedQuery.trim());
      if (localFilters.gender !== 'ALL') params.set('gender', localFilters.gender);
      if (localFilters.minPrice > 0) params.set('minPrice', String(localFilters.minPrice));
      if (localFilters.maxPrice < 30000) params.set('maxPrice', String(localFilters.maxPrice));
      if (localFilters.sortBy) params.set('sortBy', localFilters.sortBy);
      if (localFilters.amenities.length > 0)
        params.set('amenities', localFilters.amenities.join(','));
      if (localFilters.roomType) params.set('roomType', localFilters.roomType);

      const res = await authFetch(`/api/pgs?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setPGs(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch PGs:', err);
      setIsError(true);
      setPGs([]);
    } finally {
      setIsLoading(false);
    }
  }, [localFilters.city, debouncedQuery, localFilters.gender, localFilters.minPrice, localFilters.maxPrice, localFilters.sortBy, localFilters.amenities, localFilters.roomType]);

  useEffect(() => {
    fetchPGs();
  }, [fetchPGs]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleSearch = () => {
    // Sync to store
    setSearchFilters({
      query: localFilters.query,
      gender: localFilters.gender as PGGender | 'ALL',
      sortBy: localFilters.sortBy as 'price_asc' | 'price_desc' | 'rating' | 'newest',
      minPrice: localFilters.minPrice,
      maxPrice: localFilters.maxPrice,
      amenities: localFilters.amenities,
      city: localFilters.city,
    });
    // Trigger fetch immediately
    setDebouncedQuery(localFilters.query);
  };

  const handleGenderChip = (value: string) => {
    setLocalFilters((prev) => ({ ...prev, gender: prev.gender === value ? 'ALL' : value }));
  };

  const handlePriceChip = (label: string, min: number, max: number) => {
    setLocalFilters((prev) => {
      const same = prev.priceRangeLabel === label;
      return {
        ...prev,
        priceRangeLabel: same ? null : label,
        minPrice: same ? 0 : min,
        maxPrice: same ? 30000 : max,
      };
    });
  };

  const handleSortChip = (value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      sortBy: prev.sortBy === value ? 'rating' : value,
    }));
  };

  const handleRemoveFilter = (type: string) => {
    setLocalFilters((prev) => {
      switch (type) {
        case 'gender':
          return { ...prev, gender: 'ALL' };
        case 'price':
          return { ...prev, priceRangeLabel: null, minPrice: 0, maxPrice: 30000 };
        case 'sort':
          return { ...prev, sortBy: 'rating' };
        case 'roomType':
          return { ...prev, roomType: undefined };
        default:
          return prev;
      }
    });
  };

  const handleRemoveAmenity = (amenityId: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenityId),
    }));
  };

  const handleResetAll = () => {
    const city = localFilters.city; // Keep current city
    setLocalFilters({
      ...DEFAULT_LOCAL_FILTERS,
      city,
    });
    resetFilters();
    toast.info('Filters cleared');
  };

  const handleApplyAdvanced = () => {
    // Sync to store
    setSearchFilters({
      query: localFilters.query,
      gender: localFilters.gender as PGGender | 'ALL',
      sortBy: localFilters.sortBy as 'price_asc' | 'price_desc' | 'rating' | 'newest',
      minPrice: localFilters.minPrice,
      maxPrice: localFilters.maxPrice,
      amenities: localFilters.amenities,
      city: localFilters.city,
    });
    setAdvancedOpen(false);
    toast.success('Filters applied');
  };

  const handleResetAdvanced = () => {
    const city = localFilters.city;
    setLocalFilters({
      ...DEFAULT_LOCAL_FILTERS,
      city,
    });
    toast.info('Filters reset');
  };

  const handleCityChange = (city: string) => {
    setLocalFilters((prev) => ({ ...prev, city }));
    setSearchFilters({ city });
  };

  const handlePopularCityClick = (cityName: string) => {
    handleCityChange(cityName);
    toast.success(`Exploring PGs in ${cityName}`);
  };

  // -----------------------------------------------------------------------
  // Active filter chips data
  // -----------------------------------------------------------------------
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; type: string; label: string }[] = [];
    if (localFilters.gender !== 'ALL') {
      chips.push({
        key: 'gender',
        type: 'gender',
        label: GENDER_OPTIONS.find((g) => g.value === localFilters.gender)?.label || localFilters.gender,
      });
    }
    if (localFilters.priceRangeLabel) {
      chips.push({
        key: 'price',
        type: 'price',
        label: localFilters.priceRangeLabel,
      });
    }
    if (localFilters.sortBy !== 'rating') {
      const sortLabel = SORT_OPTIONS.find((s) => s.value === localFilters.sortBy)?.label || localFilters.sortBy;
      chips.push({ key: 'sort', type: 'sort', label: `Sort: ${sortLabel}` });
    }
    if (localFilters.roomType) {
      const roomLabel = ROOM_TYPES.find((r) => r.value === localFilters.roomType)?.label || localFilters.roomType;
      chips.push({ key: 'roomType', type: 'roomType', label: `Room: ${roomLabel}` });
    }
    localFilters.amenities.forEach((a) => {
      chips.push({
        key: `amenity-${a}`,
        type: `amenity-${a}`,
        label: AMENITY_LABELS[a] || a,
      });
    });
    return chips;
  }, [localFilters.gender, localFilters.priceRangeLabel, localFilters.sortBy, localFilters.roomType, localFilters.amenities]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-muted/30">
      {/* ================================================================
          STICKY SEARCH BAR
          ================================================================ */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Search row */}
          <div className="flex items-center gap-2">
            {/* City Selector */}
            <div className="shrink-0">
              <Select value={localFilters.city} onValueChange={handleCityChange}>
                <SelectTrigger className="w-[120px] sm:w-[150px] h-10 text-sm">
                  <MapPin className="size-3.5 text-teal-600 mr-1 shrink-0" />
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={`Search PGs in ${localFilters.city}...`}
                value={localFilters.query}
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, query: e.target.value }))
                }
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="pl-9 h-10 text-sm"
              />
              {localFilters.query && (
                <button
                  onClick={() => setLocalFilters((prev) => ({ ...prev, query: '' }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              className="h-10 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm shrink-0"
            >
              <Search className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Search</span>
            </Button>

            {/* Filter Button - Opens Sheet/Drawer on mobile, Dialog on desktop */}
            <div className="hidden md:block">
              <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="relative h-10 gap-1.5 shrink-0">
                    <SlidersHorizontal className="size-4" />
                    <span className="hidden lg:inline">Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="size-5 min-w-[20px] bg-teal-600 text-white rounded-full text-[11px] flex items-center justify-center font-semibold">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle>Advanced Filters</DialogTitle>
                    <DialogDescription>
                      Narrow down your search to find the perfect PG
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-2">
                    <AdvancedFiltersContent
                      localFilters={localFilters}
                      setLocalFilters={setLocalFilters}
                    />
                  </ScrollArea>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleResetAdvanced}
                      className="flex-1"
                    >
                      <RotateCcw className="size-3.5 mr-1.5" />
                      Reset
                    </Button>
                    <Button
                      onClick={handleApplyAdvanced}
                      className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Mobile Filter Button (Drawer) */}
            <div className="md:hidden">
              <Drawer open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="icon" className="relative h-10 w-10 shrink-0">
                    <SlidersHorizontal className="size-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 size-4.5 min-w-[18px] bg-teal-600 text-white rounded-full text-[10px] flex items-center justify-center font-semibold">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Advanced Filters</DrawerTitle>
                    <DrawerDescription>
                      Narrow down your search to find the perfect PG
                    </DrawerDescription>
                  </DrawerHeader>
                  <ScrollArea className="max-h-[55vh] px-4">
                    <AdvancedFiltersContent
                      localFilters={localFilters}
                      setLocalFilters={setLocalFilters}
                    />
                  </ScrollArea>
                  <div className="flex gap-2 p-4 pt-0">
                    <Button
                      variant="outline"
                      onClick={handleResetAdvanced}
                      className="flex-1"
                    >
                      <RotateCcw className="size-3.5 mr-1.5" />
                      Reset
                    </Button>
                    <Button
                      onClick={handleApplyAdvanced}
                      className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                    >
                      Apply
                    </Button>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>

          {/* ================================================================
              FILTER CHIPS (horizontal scroll)
              ================================================================ */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mb-1">
            {/* Gender chips */}
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g.value}
                onClick={() => handleGenderChip(g.value)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  localFilters.gender === g.value
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {g.label}
              </button>
            ))}

            <Separator orientation="vertical" className="h-5 shrink-0 bg-border" />

            {/* Price chips */}
            {PRICE_RANGES.map((pr) => (
              <button
                key={pr.label}
                onClick={() => handlePriceChip(pr.label, pr.min, pr.max)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  localFilters.priceRangeLabel === pr.label
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {pr.label}
              </button>
            ))}

            <Separator orientation="vertical" className="h-5 shrink-0 bg-border" />

            {/* Sort chips */}
            {SORT_OPTIONS.map((so) => (
              <button
                key={so.value}
                onClick={() => handleSortChip(so.value)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  localFilters.sortBy === so.value
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {so.label}
              </button>
            ))}
          </div>

          {/* ================================================================
              ACTIVE FILTER CHIPS with X to remove
              ================================================================ */}
          <AnimatePresence>
            {activeFilterChips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 overflow-x-auto scrollbar-none"
              >
                <span className="text-xs text-muted-foreground shrink-0">Active:</span>
                {activeFilterChips.map((chip) => (
                  <motion.button
                    key={chip.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => {
                      if (chip.type.startsWith('amenity-')) {
                        handleRemoveAmenity(chip.type.replace('amenity-', ''));
                      } else {
                        handleRemoveFilter(chip.type);
                      }
                    }}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium hover:bg-teal-100 transition-colors"
                  >
                    {chip.label}
                    <X className="size-3" />
                  </motion.button>
                ))}
                <button
                  onClick={handleResetAll}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-muted-foreground hover:text-red-600 text-xs font-medium transition-colors"
                >
                  <FilterX className="size-3" />
                  Clear all
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ================================================================
          MAIN CONTENT
          ================================================================ */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* ---- Results Summary ---- */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-between mb-5"
        >
          <p className="text-sm text-muted-foreground">
            {!isLoading && !isError && (
              <>
                <span className="font-semibold text-foreground">{pgs.length}</span>{' '}
                {pgs.length === 1 ? 'PG found' : 'PGs found'} in{' '}
                <span className="font-medium">{localFilters.city}</span>
              </>
            )}
            {isLoading && (
              <span className="text-muted-foreground">Searching...</span>
            )}
          </p>
          {isError && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPGs}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className="size-3.5" />
              Retry
            </Button>
          )}
        </motion.div>

        {/* ---- Loading Skeletons ---- */}
        {isLoading && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <PGCardSkeleton key={i} />
            ))}
          </motion.div>
        )}

        {/* ---- Error State ---- */}
        {isError && !isLoading && (
          <motion.div
            variants={slideUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
          >
            <div className="size-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Building2 className="size-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Something went wrong
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm">
              We couldn&apos;t load the PG listings. Please check your connection and try again.
            </p>
            <Button
              onClick={fetchPGs}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
            >
              <RotateCcw className="size-4 mr-1.5" />
              Try Again
            </Button>
          </motion.div>
        )}

        {/* ---- Empty State ---- */}
        {!isLoading && !isError && pgs.length === 0 && isSearching && (
          <motion.div
            variants={slideUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
          >
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No PGs found matching your filters
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Try adjusting your filters or expanding your search area to find more options.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                className="border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                <FilterX className="size-3.5 mr-1.5" />
                Clear Filters
              </Button>
              <Button
                size="sm"
                onClick={handleResetAll}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                Browse All PGs
              </Button>
            </div>
          </motion.div>
        )}

        {/* ---- PG Results Grid ---- */}
        <AnimatePresence mode="wait">
          {!isLoading && !isError && pgs.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
            >
              {pgs.map((pg, index) => (
                <ExplorePGCard key={pg.id} pg={pg} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Popular Cities (shown when no search active) ---- */}
        <AnimatePresence>
          {!isLoading && !isSearching && (
            <motion.div
              variants={slideUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -10 }}
              className="mt-10"
            >
              <div className="flex items-center gap-2 mb-5">
                <Compass className="size-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-foreground">
                  Popular Cities
                </h2>
              </div>

              <div className="flex gap-4 overflow-x-auto scrollbar-none pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6">
                {POPULAR_CITIES.map((city, idx) => (
                  <motion.button
                    key={city.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.08, duration: 0.35 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handlePopularCityClick(city.name)}
                    className={`shrink-0 w-[200px] sm:w-[220px] rounded-2xl bg-gradient-to-br ${city.gradient} text-white p-5 text-left shadow-md hover:shadow-lg transition-shadow relative overflow-hidden group`}
                  >
                    {/* Decorative circle */}
                    <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors" />
                    <span className="text-2xl mb-2 block">{city.emoji}</span>
                    <h3 className="font-bold text-lg mb-1">{city.name}</h3>
                    <p className="text-white/80 text-xs mb-3">Find your perfect PG</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                      Explore
                      <ChevronRight className="size-3" />
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
