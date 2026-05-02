'use client';

import { useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  staggerContainer,
  staggerItem,
  shimmer,
  tapBounce,
  hoverLift,
} from '@/lib/animations';
import {
  Star,
  MapPin,
  BedDouble,
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
  Users,
  Tv,
  Refrigerator,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/store/use-app-store';
import { PG_IMAGES, BADGE_BORDER } from '@/lib/constants';
import type { PG } from '@/lib/types';

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
  food: 'Meals',
  laundry: 'Laundry',
  parking: 'Parking',
  gym: 'Gym',
  cctv: 'CCTV',
  power_backup: 'Power Backup',
  water_heater: 'Water Heater',
  study_table: 'Study Table',
  wardrobe: 'Wardrobe',
  housekeeping: 'Housekeeping',
  common_room: 'Common Room',
  tv: 'TV Lounge',
  refrigerator: 'Refrigerator',
};

const GENDER_COLORS: Record<string, string> = {
  MALE: BADGE_BORDER.blue,
  FEMALE: BADGE_BORDER.pink,
  UNISEX: BADGE_BORDER.purple,
};

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Boys',
  FEMALE: 'Girls',
  UNISEX: 'Unisex',
};

interface PGCardProps {
  pg: PG;
  index?: number;
}

export default function PGCard({ pg, index = 0 }: PGCardProps) {
  const { setSelectedPG, setCurrentView } = useAppStore();
  const [currentImage, setCurrentImage] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Parallax image effect based on mouse position over the card
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 200, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 200, damping: 20 });
  const imageX = useTransform(springX, [0, 1], [8, -8]);
  const imageY = useTransform(springY, [0, 1], [8, -8]);

  const images = useMemo(() => {
    if (!pg?.images) return PG_IMAGES;
    // Already an array
    if (Array.isArray(pg.images) && pg.images.length > 0) return pg.images;
    // It's a string
    const str = String(pg.images);
    if (!str.trim()) return PG_IMAGES;
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Not JSON - try comma-separated or single URL
    }
    const imgs = str.split(',').map((s) => s.trim()).filter(Boolean);
    return imgs.length > 0 ? imgs : PG_IMAGES;
  }, [pg?.images]);

  const amenitiesList = useMemo(() => {
    if (typeof pg.amenities === 'string') {
      return pg.amenities.split(',').filter(Boolean);
    }
    if (Array.isArray(pg.amenities)) {
      return pg.amenities;
    }
    return [];
  }, [pg.amenities]);

  const visibleAmenities = amenitiesList.slice(0, 4);
  const remainingAmenities = amenitiesList.length - 4;

  const availableBeds = useMemo(() => {
    if (!pg.rooms) return 0;
    return pg.rooms.reduce((total, room) => {
      const available = room.beds?.filter((b) => b.status === 'AVAILABLE').length || 0;
      return total + available;
    }, 0);
  }, [pg.rooms]);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleBookNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPG(pg);
    setCurrentView('PG_DETAIL');
  };

  const handleCardMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleCardMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={hoverLift}
      onMouseMove={handleCardMouseMove}
      onMouseLeave={handleCardMouseLeave}
      className="group"
    >
      <Card className="overflow-hidden border border-gold/20 shadow-gold-sm hover:shadow-gold transition-shadow duration-300 rounded-2xl relative">
        {/* Shine / shimmer sweep on hover */}
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none"
          variants={shimmer}
          initial="initial"
          whileHover="animate"
          style={{
            background:
              'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 55%, transparent 60%)',
          }}
        />

        {/* Image Carousel with parallax */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl">
          <motion.div
            className="absolute inset-0"
            style={{ x: imageX, y: imageY, scale: 1.05 }}
          >
            <Image
              src={images[currentImage]}
              alt={pg.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </motion.div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Image navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <ChevronLeft className="size-4 text-foreground" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <ChevronRight className="size-4 text-foreground" />
              </button>
            </>
          )}

          {/* Dots */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImage(i);
                  }}
                  className={`rounded-full transition-all ${
                    i === currentImage
                      ? 'w-5 h-1.5 bg-white'
                      : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          )}

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
              className={`text-xs font-medium ${GENDER_COLORS[pg.gender]}`}
            >
              {GENDER_LABELS[pg.gender]}
            </Badge>
          </div>

          {/* Price tag — staggered entrance */}
          <motion.div
            className="absolute bottom-3 right-3"
            variants={staggerItem}
            custom={0}
          >
            <div className="bg-card rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-lg font-bold text-foreground">
                ₹{Math.round(pg.price).toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-muted-foreground">/mo</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="p-4 space-y-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Name & Rating */}
          <motion.div className="flex items-start justify-between gap-2" variants={staggerItem}>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground text-base truncate">
                {pg.name}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-muted-foreground text-sm">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{pg.address}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-brand-sage/10 px-2 py-1 rounded-lg shrink-0">
              <Star className="size-4 text-brand-sage fill-brand-sage" />
              <span className="font-semibold text-sm text-foreground">{pg.rating?.toFixed(1) ?? 'N/A'}</span>
              <span className="text-xs text-muted-foreground">({(pg.totalReviews ?? 0)})</span>
            </div>
          </motion.div>

          {/* Amenities — staggered entrance */}
          {visibleAmenities.length > 0 && (
            <motion.div className="flex flex-wrap gap-1.5" variants={staggerItem}>
              {visibleAmenities.map((amenity) => {
                const Icon = AMENITY_ICONS[amenity];
                return (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-teal/10 text-brand-teal rounded-md text-xs font-medium"
                  >
                    {Icon && <Icon className="size-3" />}
                    {AMENITY_LABELS[amenity] || amenity}
                  </span>
                );
              })}
              {remainingAmenities > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 bg-muted text-muted-foreground rounded-md text-xs font-medium">
                  +{remainingAmenities} more
                </span>
              )}
            </motion.div>
          )}

          {/* Available Beds & Book Button — staggered entrance */}
          <motion.div className="flex items-center justify-between pt-1" variants={staggerItem}>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <BedDouble className="size-4 text-brand-lime" />
              <span>
                {availableBeds > 0 ? (
                  <span className="text-brand-lime font-medium">{availableBeds} beds available</span>
                ) : (
                  <span className="text-red-500 font-medium">No beds available</span>
                )}
              </span>
            </div>
            <motion.div whileTap={tapBounce}>
              <Button
                onClick={handleBookNow}
                disabled={availableBeds === 0}
                size="sm"
                className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white rounded-lg shadow-sm"
              >
                Book Now
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
        </Card>
    </motion.div>
  );
}
