'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrainFront,
  Hospital,
  UtensilsCrossed,
  ShoppingBag,
  TreePine,
  Dumbbell,
  Landmark,
  Pill,
  MapPin,
  Navigation,
  Star,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NEARBY_SERVICES } from '@/lib/constants';
import { authFetch } from '@/lib/api-client';
import { useAppStore } from '@/store/use-app-store';
import type { PG } from '@/lib/types';

const ICON_MAP: Record<string, React.ElementType> = {
  TrainFront,
  Hospital,
  UtensilsCrossed,
  ShoppingBag,
  TreePine,
  Dumbbell,
  Landmark,
  Pill,
};

const SERVICE_COLORS: Record<string, { bg: string; text: string; iconBg: string }> = {
  'Metro Station': { bg: 'bg-brand-teal/10', text: 'text-brand-teal', iconBg: 'bg-brand-teal/15' },
  Hospitals: { bg: 'bg-destructive/10', text: 'text-destructive', iconBg: 'bg-destructive/15' },
  Restaurants: { bg: 'bg-brand-teal/10', text: 'text-brand-teal', iconBg: 'bg-brand-teal/15' },
  'Shopping Malls': { bg: 'bg-chart-3/10', text: 'text-chart-3', iconBg: 'bg-chart-3/15' },
  Parks: { bg: 'bg-brand-lime/15', text: 'text-brand-lime', iconBg: 'bg-brand-lime/20' },
  Gyms: { bg: 'bg-brand-sage/10', text: 'text-brand-sage', iconBg: 'bg-brand-sage/15' },
  'Banks & ATMs': { bg: 'bg-brand-teal/10', text: 'text-brand-teal', iconBg: 'bg-brand-teal/15' },
  Pharmacies: { bg: 'bg-chart-5/10', text: 'text-chart-5', iconBg: 'bg-chart-5/15' },
};

function GoogleMapEmbed({ pg }: { pg: PG | null }) {
  const searchQuery = pg ? encodeURIComponent(`${pg.address || pg.name || 'Bangalore India'}`) : 'Bangalore+India';
  const src = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0QoqESs5S8PjHhVyGg3Z0sTa9Q5bOJM4w&zoom=14&maptype=roadmap&q=${searchQuery}&output=embed`;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-brand-lime/20 min-h-[400px]">
      <iframe
        src={src}
        width="100%"
        height="400"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full"
        title="Nearby Map"
      />
      {/* PG Location Badge */}
      {pg && (
        <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm flex items-center gap-2 max-w-[80%]">
          <div className="size-8 rounded-full bg-brand-teal flex items-center justify-center shrink-0">
            <MapPin className="size-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{pg.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{pg.address || pg.city}</div>
          </div>
        </div>
      )}
      {/* Google Maps link */}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${searchQuery}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 bg-card/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm flex items-center gap-2 text-sm font-medium text-foreground hover:bg-card transition-colors"
      >
        <Navigation className="size-4 text-brand-teal" />
        Open in Maps
      </a>
    </div>
  );
}

/** Build contextual "Popular Places" from PG amenities and location */
function buildPopularPlaces(pg: PG) {
  let amenities: string[] = [];
  try {
    amenities = JSON.parse(pg.amenities || '[]');
  } catch {
    amenities = [];
  }

  const location = pg.address || pg.city || 'Bangalore';
  const mapsBase = (query: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query + ' near ' + location)}`;

  const places: {
    name: string;
    type: string;
    distance: string;
    rating: number;
    icon: React.ElementType;
    color: string;
    mapsUrl: string;
  }[] = [];

  // Map amenities to nearby place suggestions
  const amenityToPlace: Record<string, { name: string; type: string; distance: string; rating: number; icon: React.ElementType; color: string }> = {
    'Metro Access': { name: 'Nearest Metro Station', type: 'Metro', distance: '0.8 km', rating: 4.5, icon: TrainFront, color: 'text-brand-teal bg-brand-teal/10' },
    'Hospital Nearby': { name: 'Nearest Hospital', type: 'Hospital', distance: '1.2 km', rating: 4.3, icon: Hospital, color: 'text-destructive bg-destructive/10' },
    'Kitchen': { name: 'Popular Restaurants', type: 'Restaurant', distance: '0.5 km', rating: 4.6, icon: UtensilsCrossed, color: 'text-brand-teal bg-brand-teal/10' },
    'Shopping': { name: 'Shopping Mall', type: 'Shopping', distance: '2.1 km', rating: 4.4, icon: ShoppingBag, color: 'text-chart-3 bg-chart-3/10' },
    'Park': { name: 'Nearest Park', type: 'Park', distance: '1.5 km', rating: 4.7, icon: TreePine, color: 'text-brand-lime bg-brand-lime/15' },
    'Gym': { name: 'Fitness Center', type: 'Gym', distance: '0.6 km', rating: 4.2, icon: Dumbbell, color: 'text-brand-sage bg-brand-sage/10' },
    'ATM': { name: 'Banks & ATMs', type: 'Bank', distance: '0.3 km', rating: 4.0, icon: Landmark, color: 'text-brand-teal bg-brand-teal/10' },
    'Medical Store': { name: 'Pharmacy', type: 'Pharmacy', distance: '0.4 km', rating: 4.1, icon: Pill, color: 'text-chart-5 bg-chart-5/10' },
    'WiFi': { name: 'Nearest Cafe (WiFi)', type: 'Cafe', distance: '0.7 km', rating: 4.4, icon: UtensilsCrossed, color: 'text-brand-teal bg-brand-teal/10' },
    'Parking': { name: 'Public Parking', type: 'Parking', distance: '0.2 km', rating: 3.8, icon: Building2, color: 'text-muted-foreground bg-muted' },
    'Laundry': { name: 'Laundry Service', type: 'Laundry', distance: '0.3 km', rating: 4.0, icon: ShoppingBag, color: 'text-chart-3 bg-chart-3/10' },
  };

  // Match amenities to places
  for (const amenity of amenities) {
    const match = amenityToPlace[amenity];
    if (match) {
      places.push({ ...match, mapsUrl: mapsBase(match.name) });
    }
  }

  // Always add a few essential places if not already present
  const essentialPlaces = [
    { name: 'Nearest Metro Station', type: 'Metro', distance: '0.8 km', rating: 4.5, icon: TrainFront, color: 'text-brand-teal bg-brand-teal/10' },
    { name: 'Nearest Hospital', type: 'Hospital', distance: '1.2 km', rating: 4.3, icon: Hospital, color: 'text-destructive bg-destructive/10' },
    { name: 'Popular Restaurants', type: 'Restaurant', distance: '0.5 km', rating: 4.6, icon: UtensilsCrossed, color: 'text-brand-teal bg-brand-teal/10' },
    { name: 'Shopping Mall', type: 'Shopping', distance: '2.1 km', rating: 4.4, icon: ShoppingBag, color: 'text-chart-3 bg-chart-3/10' },
    { name: 'Nearest Park', type: 'Park', distance: '1.5 km', rating: 4.7, icon: TreePine, color: 'text-brand-lime bg-brand-lime/15' },
  ];

  for (const essential of essentialPlaces) {
    if (!places.find((p) => p.type === essential.type)) {
      places.push({ ...essential, mapsUrl: mapsBase(essential.name) });
    }
  }

  return places.slice(0, 6);
}

/** Loading skeleton */
function LoadingState() {
  return (
    <div className="min-h-screen bg-muted/50">
      <div className="bg-background border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="size-10 bg-muted rounded-xl animate-pulse" />
            <div>
              <div className="h-6 w-40 bg-muted rounded animate-pulse" />
              <div className="h-4 w-56 bg-muted rounded animate-pulse mt-1" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="w-full h-[400px] bg-muted rounded-2xl animate-pulse" />
        <div>
          <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="bg-card rounded-lg p-5 space-y-3">
          <div className="h-5 w-48 bg-muted rounded animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Empty state when no active booking */
function EmptyState() {
  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center">
      <div className="text-center space-y-4 px-4">
        <div className="size-16 bg-brand-teal/10 rounded-2xl flex items-center justify-center mx-auto">
          <Building2 className="size-8 text-brand-teal" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">No Active Stay Found</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            You need an active booking to see nearby services. Explore PGs and book your stay first!
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NearbyServices() {
  const { currentUser, selectedPG } = useAppStore();
  const [activePG, setActivePG] = useState<PG | null>(null);
  const [loading, setLoading] = useState(true);
  const [noBooking, setNoBooking] = useState(false);

  useEffect(() => {
    async function fetchActivePG() {
      setLoading(true);
      setNoBooking(false);

      // If a PG is already selected in the store, use it
      if (selectedPG) {
        setActivePG(selectedPG);
        setLoading(false);
        return;
      }

      if (!currentUser?.id) {
        setLoading(false);
        setNoBooking(true);
        return;
      }

      try {
        // Fetch user's bookings and find an ACTIVE one
        const bookingsRes = await authFetch(`/api/bookings?userId=${currentUser.id}`);
        const bookings = await bookingsRes.json();
        const activeBooking = Array.isArray(bookings)
          ? bookings.find((b: { status: string }) => b.status === 'ACTIVE')
          : null;

        if (activeBooking?.pgId) {
          // Fetch the PG details
          const pgRes = await authFetch(`/api/pgs/${activeBooking.pgId}`);
          const pg = await pgRes.json();
          setActivePG(pg || null);
        } else {
          setNoBooking(true);
        }
      } catch (err) {
        console.error('Failed to fetch active PG:', err);
        setNoBooking(true);
      } finally {
        setLoading(false);
      }
    }

    fetchActivePG();
  }, [currentUser?.id, selectedPG]);

  if (loading) return <LoadingState />;
  if (noBooking) return <EmptyState />;

  const popularPlaces = activePG ? buildPopularPlaces(activePG) : [];

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="size-10 bg-brand-teal/15 rounded-xl flex items-center justify-center">
              <MapPin className="size-5 text-brand-teal" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nearby Services</h1>
              <p className="text-sm text-muted-foreground">
                Explore essential services near your PG
                {activePG ? ` · ${activePG.name}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Map Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GoogleMapEmbed pg={activePG} />
        </motion.div>

        {/* Service Categories Grid */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Navigation className="size-5 text-brand-teal" />
            Service Categories
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {NEARBY_SERVICES.map((service, index) => {
              const Icon = ICON_MAP[service.icon] || MapPin;
              const colors = SERVICE_COLORS[service.name] || {
                bg: 'bg-muted',
                text: 'text-muted-foreground',
                iconBg: 'bg-muted',
              };

              return (
                <motion.div
                  key={service.name}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.08 }}
                  whileHover={{ y: -2 }}
                  onClick={() => {
                    const location = activePG?.address || activePG?.city || 'Bangalore';
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.name + ' near ' + location)}`,
                      '_blank'
                    );
                  }}
                >
                  <Card className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer ${colors.bg}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div
                        className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${colors.iconBg}`}
                      >
                        <Icon className={`size-6 ${colors.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-foreground">{service.name}</div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {service.count} nearby
                          </Badge>
                        </div>
                      </div>
                      <ExternalLink className="size-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Popular Nearby */}
        <Card className="border-0 shadow-sm">
          <div className="p-5">
            <h3 className="font-semibold text-foreground mb-4">Popular Places Nearby</h3>
            <div className="space-y-3">
              {popularPlaces.map((place, i) => {
                const PlaceIcon = place.icon;
                return (
                  <motion.div
                    key={place.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => window.open(place.mapsUrl, '_blank')}
                  >
                    <div className={`size-10 rounded-xl flex items-center justify-center ${place.color}`}>
                      <PlaceIcon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">{place.name}</div>
                      <div className="text-xs text-muted-foreground">{place.type}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        {place.distance}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-brand-sage">
                        <Star className="size-3 fill-brand-sage text-brand-sage" />
                        {place.rating}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
