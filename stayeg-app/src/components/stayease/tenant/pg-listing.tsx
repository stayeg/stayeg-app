'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Building2,
  MapPin,
  ArrowUpDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { AMENITIES_LIST } from '@/lib/constants';
import PGCard from './pg-card';
import type { PG } from '@/lib/types';

function PGCardSkeleton() {
  return (
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
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

type FilterState = {
  query: string;
  gender: string;
  sortBy: string;
  priceRange: number[];
  amenities: string[];
};

function FilterContent({
  filters,
  setFilters,
  onClose,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Gender */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-2 block">Gender</Label>
        <Select
          value={filters.gender}
          onValueChange={(v) => setFilters((p) => ({ ...p, gender: v }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Genders</SelectItem>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="UNISEX">Unisex</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-2 block">
          Price Range: ₹{filters.priceRange[0].toLocaleString('en-IN')} - ₹{filters.priceRange[1].toLocaleString('en-IN')}
        </Label>
        <Slider
          value={filters.priceRange}
          onValueChange={(v) => setFilters((p) => ({ ...p, priceRange: v }))}
          min={0}
          max={30000}
          step={500}
          className="mt-3"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>₹0</span>
          <span>₹30,000</span>
        </div>
      </div>

      {/* Amenities */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">Amenities</Label>
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {AMENITIES_LIST.map((amenity) => (
            <div key={amenity.id} className="flex items-center gap-2">
              <Checkbox
                id={amenity.id}
                checked={filters.amenities.includes(amenity.id)}
                onCheckedChange={(checked) => {
                  setFilters((prev) => ({
                    ...prev,
                    amenities: checked
                      ? [...prev.amenities, amenity.id]
                      : prev.amenities.filter((a) => a !== amenity.id),
                  }));
                }}
              />
              <Label htmlFor={amenity.id} className="text-sm text-muted-foreground cursor-pointer font-normal">
                {amenity.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-2 block">Sort By</Label>
        <Select
          value={filters.sortBy}
          onValueChange={(v) => setFilters((p) => ({ ...p, sortBy: v }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Top Rated</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {onClose && (
        <Button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep hover:to-brand-teal text-white"
        >
          Apply Filters
        </Button>
      )}
    </div>
  );
}

export default function PGListing() {
  const { searchFilters, setCurrentView } = useAppStore();

  const [filters, setFilters] = useState<FilterState>({
    query: searchFilters.query || '',
    gender: searchFilters.gender || 'ALL',
    sortBy: searchFilters.sortBy || 'rating',
    priceRange: [searchFilters.minPrice || 0, searchFilters.maxPrice || 30000],
    amenities: searchFilters.amenities || [],
  });

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (searchFilters.city) params.set('city', searchFilters.city);
    if (filters.query) params.set('query', filters.query);
    if (filters.gender && filters.gender !== 'ALL') params.set('gender', filters.gender);
    if (filters.priceRange[0] > 0) params.set('minPrice', String(filters.priceRange[0]));
    if (filters.priceRange[1] < 30000) params.set('maxPrice', String(filters.priceRange[1]));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.amenities.length > 0) params.set('amenities', filters.amenities.join(','));
    return params.toString();
  }, [searchFilters.city, filters]);

  const {
    data: pgs = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<PG[]>({
    queryKey: ['pgs', searchFilters.city, filters],
    queryFn: async () => {
      const qs = buildQueryString();
      const res = await authFetch(`/api/pgs?${qs}`);
      if (!res.ok) throw new Error('Failed to fetch PGs');
      return res.json();
    },
    staleTime: 30000,
  });

  const clearFilters = () => {
    setFilters({
      query: '',
      gender: 'ALL',
      sortBy: 'rating',
      priceRange: [0, 30000],
      amenities: [],
    });
  };

  const hasActiveFilters =
    filters.gender !== 'ALL' ||
    filters.query !== '' ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 30000 ||
    filters.amenities.length > 0;

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-30 bg-background border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('LANDING')}
              className="shrink-0"
            >
              <ChevronDown className="size-4 rotate-90" />
            </Button>

            {/* Search Input */}
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={`Search PGs in ${searchFilters.city || 'Bangalore'}...`}
                value={filters.query}
                onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
                className="pl-9 h-10"
              />
            </div>

            {/* Sort */}
            <div className="hidden sm:block">
              <Select
                value={filters.sortBy}
                onValueChange={(v) => setFilters((p) => ({ ...p, sortBy: v as typeof p.sortBy }))}
              >
                <SelectTrigger className="w-[160px]">
                  <ArrowUpDown className="size-4 mr-1" />
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Button (desktop) */}
            <div className="hidden lg:block relative">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <SlidersHorizontal className="size-4" />
                    Filters
                    {hasActiveFilters && (
                      <span className="size-5 bg-brand-teal text-white rounded-full text-xs flex items-center justify-center">
                        {filters.amenities.length + (filters.gender !== 'ALL' ? 1 : 0)}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent
                      filters={filters}
                      setFilters={setFilters}
                      onClose={() => setMobileFilterOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Mobile Filter Button */}
            <div className="lg:hidden">
              <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <SlidersHorizontal className="size-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 size-4 bg-brand-teal text-white rounded-full text-[10px] flex items-center justify-center">
                        !
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent
                      filters={filters}
                      setFilters={setFilters}
                      onClose={() => setMobileFilterOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Active Filters & City */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 text-brand-teal" />
              <span className="font-medium">{searchFilters.city || 'Bangalore'}</span>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-brand-teal gap-1 h-7 px-2"
              >
                <X className="size-3" />
                Clear all
              </Button>
            )}
            {filters.amenities.slice(0, 3).map((a) => {
              const amenityLabel = AMENITIES_LIST.find((am) => am.id === a)?.label || a;
              return (
                <button
                  key={a}
                  onClick={() =>
                    setFilters((p) => ({
                      ...p,
                      amenities: p.amenities.filter((x) => x !== a),
                    }))
                  }
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-teal/10 text-brand-teal rounded-full text-xs font-medium hover:bg-brand-teal/15 transition-colors"
                >
                  {amenityLabel}
                  <X className="size-3" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground"
          >
            {!isLoading && (
              <span>
                <span className="font-semibold text-foreground">{pgs.length}</span>{' '}
                {pgs.length === 1 ? 'PG found' : 'PGs found'} in{' '}
                <span className="font-medium">{searchFilters.city || 'Bangalore'}</span>
              </span>
            )}
          </motion.div>

          {isError && (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          )}
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <PGCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="text-center py-20">
            <Building2 className="size-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Something went wrong
            </h3>
            <p className="text-muted-foreground mb-4">
              We couldn&apos;t load the PG listings. Please try again.
            </p>
            <Button onClick={() => refetch()} className="bg-brand-teal hover:bg-brand-deep">
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && pgs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-4"
          >
            <div className="size-16 rounded-full bg-brand-teal/10 flex items-center justify-center mb-4">
              <Building2 className="size-8 text-brand-teal" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No PGs found in {searchFilters.city || 'Bangalore'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Try adjusting your filters or searching in a different area to find more options.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="border-brand-teal/30 text-brand-teal hover:bg-brand-teal/10"
              >
                Clear Filters
              </Button>
              <Button
                size="sm"
                onClick={() => setCurrentView('LANDING')}
                className="bg-brand-teal hover:bg-brand-deep"
              >
                Explore Other Cities
              </Button>
            </div>
          </motion.div>
        )}

        {/* PG Grid */}
        <AnimatePresence>
          {!isLoading && !isError && pgs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pgs.map((pg, index) => (
                <PGCard key={pg.id} pg={pg} index={index} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
