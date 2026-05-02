'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  ShieldCheck,
  BedDouble,
  Users,
  Wifi,
  Snowflake,
  UtensilsCrossed,
  Shirt,
  Car,
  Dumbbell,
  Camera,
  Zap,
  Thermometer,
  BookOpen,
  Archive,
  Sparkles,
  Tv,
  Refrigerator,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  MessageSquare,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { PG_IMAGES } from '@/lib/constants';
import { STATUSES, BADGE_BORDER } from '@/lib/constants';
import type { PG, Bed } from '@/lib/types';

const AMENITY_ICONS: Record<string, React.ElementType> = {
  wifi: Wifi,
  ac: Snowflake,
  food: UtensilsCrossed,
  laundry: Shirt,
  parking: Car,
  gym: Dumbbell,
  cctv: Camera,
  power_backup: Zap,
  water_heater: Thermometer,
  study_table: BookOpen,
  wardrobe: Archive,
  housekeeping: Sparkles,
  common_room: Users,
  tv: Tv,
  refrigerator: Refrigerator,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  ac: 'AC',
  food: 'Meals Included',
  laundry: 'Laundry Service',
  parking: 'Parking',
  gym: 'Gym',
  cctv: 'CCTV Security',
  power_backup: 'Power Backup',
  water_heater: 'Water Heater',
  study_table: 'Study Table',
  wardrobe: 'Wardrobe',
  housekeeping: 'Housekeeping',
  common_room: 'Common Room',
  tv: 'TV Lounge',
  refrigerator: 'Refrigerator',
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  SINGLE: 'Single',
  DOUBLE: 'Double Sharing',
  TRIPLE: 'Triple Sharing',
  DORMITORY: 'Dormitory',
};

export default function PGDetail() {
  const { selectedPG, setCurrentView, setSelectedPG, setSelectedBed } = useAppStore();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: pg } = useQuery<PG>({
    queryKey: ['pg-detail', selectedPG?.id],
    queryFn: async () => {
      if (!selectedPG?.id) return null;
      const res = await authFetch(`/api/pgs/${selectedPG.id}`);
      if (!res.ok) throw new Error('Failed to fetch PG');
      return res.json();
    },
    enabled: !!selectedPG?.id,
  });

  // Reset image index when PG changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional reset when PG data changes
    setSelectedImageIndex(0);
  }, [pg?.id]);

  const images = useMemo(() => {
    if (!pg) return PG_IMAGES;
    // Already an array
    if (Array.isArray(pg.images) && pg.images.length > 0) return pg.images;
    // It's a string
    const str = String(pg.images || '');
    if (!str.trim()) return PG_IMAGES;
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Not JSON - try comma-separated or single URL
    }
    const imgs = str.split(',').map((s) => s.trim()).filter(Boolean);
    return imgs.length > 0 ? imgs : PG_IMAGES;
  }, [pg]);

  const amenitiesList = useMemo(() => {
    if (!pg) return [];
    if (typeof pg.amenities === 'string') return pg.amenities.split(',').filter(Boolean);
    if (Array.isArray(pg.amenities)) return pg.amenities;
    return [];
  }, [pg]);

  const handleSelectBed = (bed: Bed) => {
    setSelectedBed(bed);
    setSelectedPG(pg || null);
    setCurrentView('BOOKING');
  };

  if (!selectedPG && !pg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-muted-foreground">No PG selected</p>
          <Button onClick={() => setCurrentView('PG_LISTING')} className="mt-4">
            Browse PGs
          </Button>
        </div>
      </div>
    );
  }

  const pgData = pg || selectedPG;
  const rooms = pgData?.rooms || [];

  return (
    <div className="bg-muted">
      {/* Top Navigation */}
      <div className="sticky top-0 z-30 bg-background border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentView('PG_LISTING')}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to listings
          </Button>
          <div className="flex items-center gap-2">
            {pgData?.isVerified && (
              <Badge className={`${BADGE_BORDER.green} gap-1`}>
                <ShieldCheck className="size-3" />
                Verified Property
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Image Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-3 rounded-2xl overflow-hidden">
            {/* Main Image */}
            <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[400px]">
              <Image
                src={images[selectedImageIndex]}
                alt={pgData?.name || 'PG'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 70vw"
                priority
              />
              <button
                onClick={() => setSelectedImageIndex((p) => (p === 0 ? images.length - 1 : p - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background backdrop-blur-sm rounded-full p-2 shadow-lg"
              >
                <ChevronLeft className="size-5 text-foreground" />
              </button>
              <button
                onClick={() => setSelectedImageIndex((p) => (p === images.length - 1 ? 0 : p + 1))}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background backdrop-blur-sm rounded-full p-2 shadow-lg"
              >
                <ChevronRight className="size-5 text-foreground" />
              </button>
              <div className="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                {selectedImageIndex + 1} / {images.length}
              </div>
            </div>

            {/* Thumbnails */}
            <div className="hidden md:grid grid-rows-3 gap-3">
              {images.slice(0, 3).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImageIndex(i)}
                  className={`relative rounded-xl overflow-hidden ${
                    i === selectedImageIndex ? 'ring-2 ring-brand-teal' : 'opacity-70 hover:opacity-100'
                  } transition-all`}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Thumbnails */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImageIndex(i)}
                className={`relative shrink-0 w-20 h-16 rounded-lg overflow-hidden ${
                  i === selectedImageIndex ? 'ring-2 ring-brand-teal' : 'opacity-60'
                } transition-all`}
              >
                <Image src={img} alt={`Thumb ${i + 1}`} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>

          {/* PG Info */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {pgData?.name}
                    </h1>
                    {pgData?.isVerified && (
                      <ShieldCheck className="size-6 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground mb-3">
                    <MapPin className="size-4" />
                    <span>{pgData?.address}{pgData?.city ? `, ${pgData.city}` : ''}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 bg-brand-sage/10 px-3 py-1.5 rounded-lg">
                      <Star className="size-5 text-brand-sage fill-brand-sage" />
                      <span className="font-bold text-foreground">{pgData?.rating?.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({pgData?.totalReviews} reviews)</span>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {pgData?.gender === 'MALE' ? 'Boys' : pgData?.gender === 'FEMALE' ? 'Girls' : 'Unisex'}
                    </Badge>
                  </div>
                </div>

                {/* Price Section */}
                <div className="bg-brand-teal/10 rounded-2xl p-5 min-w-[200px] text-center lg:text-right border border-gold/20 shadow-gold-sm">
                  <div className="text-sm text-muted-foreground mb-1">Starting from</div>
                  <div className="flex items-baseline justify-center lg:justify-end gap-1">
                    <IndianRupee className="size-5 text-brand-teal" />
                    <span className="text-3xl font-bold text-foreground">
                      {pgData?.price?.toLocaleString('en-IN')}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <Separator className="my-3 bg-brand-teal/15" />
                  <div className="text-sm text-muted-foreground">
                    Security Deposit:{' '}
                    <span className="font-semibold text-foreground">
                      ₹{pgData?.securityDeposit?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {pgData?.description && (
                <p className="mt-4 text-muted-foreground leading-relaxed">{pgData.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Owner Info */}
          {pgData?.owner && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Property Owner</h2>
                <div className="flex items-center gap-4">
                  <Avatar className="size-14">
                    <AvatarImage src={pgData.owner.avatar} alt={pgData.owner.name} />
                    <AvatarFallback className="bg-brand-teal/15 text-brand-teal text-lg font-semibold">
                      {pgData.owner.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{pgData.owner.name}</div>
                    <div className="text-sm text-muted-foreground">Property Owner</div>
                  </div>
                  {pgData.owner.phone && (
                    <Button variant="outline" className="gap-2 border-brand-teal/25 text-brand-teal hover:bg-brand-teal/10">
                      <Phone className="size-4" />
                      {pgData.owner.phone}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Amenities */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Amenities & Facilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {amenitiesList.map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity] || Check;
                  return (
                    <div
                      key={amenity}
                      className="flex items-center gap-3 p-3 bg-brand-teal/10 rounded-xl border border-brand-teal/20"
                    >
                      <div className="size-9 bg-brand-teal/15 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="size-4 text-brand-teal" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {AMENITY_LABELS[amenity] || amenity}
                      </span>
                    </div>
                  );
                })}
              </div>
              {amenitiesList.length === 0 && (
                <p className="text-muted-foreground text-sm">No amenities listed</p>
              )}
            </CardContent>
          </Card>

          {/* Room & Bed Listing */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BedDouble className="size-5 text-brand-teal" />
                Rooms & Bed Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rooms.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  No room information available yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Room</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden sm:table-cell">Floor</TableHead>
                        <TableHead>Beds</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rooms.map((room) => (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">{room.roomCode}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{ROOM_TYPE_LABELS[room.roomType] || room.roomType}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{room.floor}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {room.beds?.map((bed) => (
                                <span
                                  key={bed.id}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUSES.BED[bed.status]?.color || ''}`}
                                >
                                  Bed {bed.bedNumber}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{room.beds?.[0]?.price
                              ? Math.round(room.beds[0].price).toLocaleString('en-IN')
                              : pgData?.price?.toLocaleString('en-IN')}
                            <span className="text-xs font-normal text-muted-foreground">/mo</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end flex-wrap">
                              {room.beds?.filter((b) => b.status === 'AVAILABLE').map((bed) => (
                                <Button
                                  key={bed.id}
                                  size="sm"
                                  onClick={() => handleSelectBed(bed)}
                                  className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white text-xs"
                                >
                                  Select Bed {bed.bedNumber}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Complaint Access */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-brand-teal/15 rounded-xl flex items-center justify-center">
                    <MessageSquare className="size-5 text-brand-teal" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Facing an issue?</h3>
                    <p className="text-sm text-muted-foreground">Raise a complaint about this property</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-brand-teal/25 text-brand-teal hover:bg-brand-teal/10"
                  onClick={() => setCurrentView('COMPLAINTS')}
                >
                  Raise Complaint
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
