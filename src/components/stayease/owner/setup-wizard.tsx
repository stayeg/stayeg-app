'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, BedDouble, Users, ArrowRight, ArrowLeft, Plus, X, Check,
  ChevronRight, Sparkles, Crown, Zap, Star, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/use-app-store';
import { authFetch } from '@/lib/api-client';
import { CITIES, AMENITIES_LIST, PRICING_PLANS } from '@/lib/constants';
import type { RoomType, WorkerRole, WorkerShift } from '@/lib/types';

// ==============================
// Types
// ==============================
interface PGFormData {
  name: string;
  address: string;
  city: string;
  gender: string;
  description: string;
  amenities: string[];
  monthlyRent: string;
  securityDeposit: string;
}

interface RoomFormData {
  roomCode: string;
  roomType: string;
  floor: string;
  hasAC: boolean;
  hasAttachedBath: boolean;
  numBeds: string;
  pricePerBed: string;
}

interface StaffFormData {
  name: string;
  role: string;
  phone: string;
  shift: string;
}

// ==============================
// Progress Stepper
// ==============================
const STEPS = [
  { id: 1, title: 'PG Details', icon: Building2 },
  { id: 2, title: 'Rooms & Beds', icon: BedDouble },
  { id: 3, title: 'Staff & Plans', icon: Users },
];

function ProgressStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const StepIcon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isActive
                    ? 'var(--brand-deep)'
                    : isCompleted
                      ? 'var(--brand-teal)'
                      : 'var(--muted)',
                }}
                className={`relative flex items-center justify-center size-10 rounded-full text-white transition-colors ${
                  isActive
                    ? 'ring-2 ring-brand-deep/30'
                    : ''
                }`}
              >
                {isCompleted ? (
                  <Check className="size-5" />
                ) : (
                  <StepIcon className="size-5" />
                )}
                {isActive && (
                  <motion.div
                    layoutId="step-pulse"
                    className="absolute inset-0 rounded-full bg-brand-deep/30"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? 'text-brand-deep'
                    : isCompleted
                      ? 'text-brand-teal'
                      : 'text-muted-foreground'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-20 mx-2 rounded-full transition-colors ${
                  index < currentStep ? 'bg-brand-teal' : 'bg-muted'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==============================
// Step 1: PG Details
// ==============================
function StepPGDetails({
  data,
  onChange,
}: {
  data: PGFormData;
  onChange: (updates: Partial<PGFormData>) => void;
}) {
  const toggleAmenity = (id: string) => {
    const updated = data.amenities.includes(id)
      ? data.amenities.filter((a) => a !== id)
      : [...data.amenities, id];
    onChange({ amenities: updated });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">List Your First PG</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in the details about your PG property
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pg-name">PG Name *</Label>
          <Input
            id="pg-name"
            placeholder="e.g., Sunrise PG"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pg-address">Address *</Label>
          <Input
            id="pg-address"
            placeholder="Full street address"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>City *</Label>
          <Select
            value={data.city}
            onValueChange={(v) => onChange({ city: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select city" />
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

        <div className="space-y-2">
          <Label>Gender Type *</Label>
          <Select
            value={data.gender}
            onValueChange={(v) => onChange({ gender: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="UNISEX">Unisex</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pg-desc">Description</Label>
          <Textarea
            id="pg-desc"
            placeholder="Describe your PG property..."
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pg-rent">Monthly Rent (₹) *</Label>
          <Input
            id="pg-rent"
            type="number"
            placeholder="e.g., 8000"
            value={data.monthlyRent}
            onChange={(e) => onChange({ monthlyRent: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pg-deposit">Security Deposit (₹) *</Label>
          <Input
            id="pg-deposit"
            type="number"
            placeholder="e.g., 16000"
            value={data.securityDeposit}
            onChange={(e) => onChange({ securityDeposit: e.target.value })}
          />
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-3">
        <Label>Amenities</Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {AMENITIES_LIST.map((amenity) => (
            <label
              key={amenity.id}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors text-xs"
            >
              <Checkbox
                checked={data.amenities.includes(amenity.id)}
                onCheckedChange={() => toggleAmenity(amenity.id)}
              />
              {amenity.label}
            </label>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ==============================
// Step 2: Rooms & Beds
// ==============================
function StepRoomsBeds({
  rooms,
  onAddRoom,
  onRemoveRoom,
  onUpdateRoom,
}: {
  rooms: RoomFormData[];
  onAddRoom: () => void;
  onRemoveRoom: (index: number) => void;
  onUpdateRoom: (index: number, updates: Partial<RoomFormData>) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Add Rooms & Beds</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the rooms in your PG property
        </p>
      </div>

      <AnimatePresence>
        {rooms.map((room, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-gold/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BedDouble className="size-4 text-brand-deep" />
                    Room {index + 1}
                  </CardTitle>
                  {rooms.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveRoom(index)}
                      className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Room Code *</Label>
                    <Input
                      placeholder="e.g., A101"
                      value={room.roomCode}
                      onChange={(e) =>
                        onUpdateRoom(index, { roomCode: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Room Type *</Label>
                    <Select
                      value={room.roomType}
                      onValueChange={(v) =>
                        onUpdateRoom(index, { roomType: v })
                      }
                    >
                      <SelectTrigger className="w-full h-8 text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE">Single</SelectItem>
                        <SelectItem value="DOUBLE">Double</SelectItem>
                        <SelectItem value="TRIPLE">Triple</SelectItem>
                        <SelectItem value="DORMITORY">Dormitory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Floor Number</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={room.floor}
                      onChange={(e) =>
                        onUpdateRoom(index, { floor: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Number of Beds *</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={room.numBeds}
                      onChange={(e) =>
                        onUpdateRoom(index, { numBeds: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Price per Bed (₹) *</Label>
                    <Input
                      type="number"
                      placeholder="8000"
                      value={room.pricePerBed}
                      onChange={(e) =>
                        onUpdateRoom(index, { pricePerBed: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={room.hasAC}
                      onCheckedChange={(checked) =>
                        onUpdateRoom(index, { hasAC: !!checked })
                      }
                    />
                    <span className="text-xs font-medium">AC</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={room.hasAttachedBath}
                      onCheckedChange={(checked) =>
                        onUpdateRoom(index, {
                          hasAttachedBath: !!checked,
                        })
                      }
                    />
                    <span className="text-xs font-medium">
                      Attached Bathroom
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      <Button
        variant="outline"
        onClick={onAddRoom}
        className="w-full border-dashed border-2 border-gold/30 hover:border-brand-deep hover:bg-brand-deep/5 h-11"
      >
        <Plus className="size-4 mr-2" />
        Add Another Room
      </Button>
    </motion.div>
  );
}

// ==============================
// Step 3: Staff & Services
// ==============================
function StepStaffPlans({
  staff,
  onAddStaff,
  onRemoveStaff,
  onUpdateStaff,
  selectedPlan,
  onSelectPlan,
  pgData,
  rooms,
}: {
  staff: StaffFormData[];
  onAddStaff: () => void;
  onRemoveStaff: (index: number) => void;
  onUpdateStaff: (index: number, updates: Partial<StaffFormData>) => void;
  selectedPlan: string;
  onSelectPlan: (id: string) => void;
  pgData: PGFormData;
  rooms: RoomFormData[];
}) {
  const totalBeds = rooms.reduce(
    (sum, r) => sum + (parseInt(r.numBeds) || 0),
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold">Staff & Services</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add your staff members and choose a subscription plan
        </p>
      </div>

      {/* Staff Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Staff Members</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddStaff}
            className="border-gold/20"
          >
            <Plus className="size-3.5 mr-1" />
            Add Staff
          </Button>
        </div>

        <AnimatePresence>
          {staff.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="border-gold/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Staff #{index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveStaff(index)}
                      className="size-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        placeholder="Staff name"
                        value={member.name}
                        onChange={(e) =>
                          onUpdateStaff(index, { name: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Role</Label>
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          onUpdateStaff(index, { role: v })
                        }
                      >
                        <SelectTrigger className="w-full h-8 text-sm">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COOK">Cook</SelectItem>
                          <SelectItem value="CLEANER">Cleaner</SelectItem>
                          <SelectItem value="SECURITY">Security</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="MAINTENANCE">
                            Maintenance
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        placeholder="Phone number"
                        value={member.phone}
                        onChange={(e) =>
                          onUpdateStaff(index, { phone: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Shift</Label>
                      <Select
                        value={member.shift}
                        onValueChange={(v) =>
                          onUpdateStaff(index, { shift: v })
                        }
                      >
                        <SelectTrigger className="w-full h-8 text-sm">
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MORNING">Morning</SelectItem>
                          <SelectItem value="EVENING">Evening</SelectItem>
                          <SelectItem value="NIGHT">Night</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {staff.length === 0 && (
          <div className="text-center py-8 rounded-lg border-2 border-dashed border-muted">
            <Users className="size-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No staff added yet. Click &quot;Add Staff&quot; to get started.
            </p>
          </div>
        )}
      </div>

      {/* Subscription Plans */}
      <div className="space-y-3">
        <Label className="text-base">Choose Your Plan</Label>
        <div className="space-y-3">
          {PRICING_PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <motion.div
                key={plan.id}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                <Card
                  className={`cursor-pointer transition-all border-2 ${
                    isSelected
                      ? 'border-brand-deep shadow-gold-md bg-brand-deep/5'
                      : 'border-gold/20 hover:border-gold/50'
                  }`}
                  onClick={() => onSelectPlan(plan.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{plan.name}</h4>
                          {plan.badge && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {plan.badge}
                            </Badge>
                          )}
                          {plan.popular && (
                            <Badge className="bg-brand-teal text-white text-[10px] px-1.5 py-0">
                              <Star className="size-2.5 mr-0.5" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {plan.duration} plan
                        </p>
                        <p className="text-lg font-bold mt-1">
                          ₹{plan.price.toLocaleString('en-IN')}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            + ₹{plan.setupFee.toLocaleString('en-IN')} setup
                          </span>
                        </p>
                      </div>
                      <div
                        className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                          isSelected
                            ? 'bg-brand-deep border-brand-deep'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {isSelected && (
                          <Check className="size-3 text-white" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Review Summary */}
      <Card className="border-gold/30 bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="size-4 text-brand-sage" />
            Setup Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1.5 text-muted-foreground">
          <div className="flex justify-between">
            <span>PG Name</span>
            <span className="font-medium text-foreground">
              {pgData.name || '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>City</span>
            <span className="font-medium text-foreground">
              {pgData.city || '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Gender</span>
            <span className="font-medium text-foreground">
              {pgData.gender || '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Rooms</span>
            <span className="font-medium text-foreground">{rooms.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Beds</span>
            <span className="font-medium text-foreground">{totalBeds}</span>
          </div>
          <div className="flex justify-between">
            <span>Staff</span>
            <span className="font-medium text-foreground">{staff.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Amenities</span>
            <span className="font-medium text-foreground">
              {pgData.amenities.length > 0
                ? `${pgData.amenities.length} selected`
                : 'None'}
            </span>
          </div>
          {selectedPlan && (
            <div className="flex justify-between pt-1 border-t">
              <span>Plan</span>
              <span className="font-medium text-brand-deep">
                {PRICING_PLANS.find((p) => p.id === selectedPlan)?.name} — ₹
                {PRICING_PLANS.find((p) => p.id === selectedPlan)?.price.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==============================
// Success Animation
// ==============================
function SuccessView() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 200 }}
      className="flex flex-col items-center justify-center py-12 text-center space-y-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
        className="relative"
      >
        <div className="size-24 rounded-full bg-gradient-to-br from-brand-deep to-brand-teal flex items-center justify-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', damping: 10 }}
          >
            <Check className="size-12 text-white" strokeWidth={3} />
          </motion.div>
        </div>
        {/* Confetti particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: 0,
              y: 0,
              scale: 0,
              opacity: 1,
            }}
            animate={{
              x: Math.cos((i / 8) * Math.PI * 2) * 60,
              y: Math.sin((i / 8) * Math.PI * 2) * 60,
              scale: [0, 1.2, 0],
              opacity: [1, 1, 0],
            }}
            transition={{
              delay: 0.6,
              duration: 0.8,
              ease: 'easeOut',
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full"
            style={{
              backgroundColor:
                i % 2 === 0
                  ? 'var(--brand-deep)'
                  : i % 3 === 0
                    ? 'var(--brand-sage)'
                    : 'var(--brand-teal)',
            }}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h2 className="text-2xl font-bold">Setup Complete! 🎉</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Your PG has been set up successfully. You can now manage rooms,
          tenants, and more from your dashboard.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ==============================
// Main Wizard Component
// ==============================
export default function OwnerSetupWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { setCurrentView, currentUser, showToast } = useAppStore();
  const [step, setStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<string>('');

  // Form state
  const [pgData, setPgData] = useState<PGFormData>({
    name: '',
    address: '',
    city: '',
    gender: '',
    description: '',
    amenities: [],
    monthlyRent: '',
    securityDeposit: '',
  });

  const [rooms, setRooms] = useState<RoomFormData[]>([
    {
      roomCode: '',
      roomType: '',
      floor: '0',
      hasAC: false,
      hasAttachedBath: false,
      numBeds: '',
      pricePerBed: '',
    },
  ]);

  const [staff, setStaff] = useState<StaffFormData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  const resetState = useCallback(() => {
    setStep(0);
    setShowSuccess(false);
    setSubmitProgress('');
    setPgData({
      name: '',
      address: '',
      city: '',
      gender: '',
      description: '',
      amenities: [],
      monthlyRent: '',
      securityDeposit: '',
    });
    setRooms([
      {
        roomCode: '',
        roomType: '',
        floor: '0',
        hasAC: false,
        hasAttachedBath: false,
        numBeds: '',
        pricePerBed: '',
      },
    ]);
    setStaff([]);
    setSelectedPlan('yearly');
  }, []);

  // Validation
  const validateStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0:
        return !!(
          pgData.name.trim() &&
          pgData.address.trim() &&
          pgData.city &&
          pgData.gender &&
          pgData.monthlyRent &&
          pgData.securityDeposit
        );
      case 1:
        return rooms.every(
          (r) =>
            r.roomCode.trim() &&
            r.roomType &&
            r.numBeds &&
            r.pricePerBed
        );
      case 2:
        return !!selectedPlan;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      // Step 2 (final): persist PG, rooms, beds, and staff to backend
      setIsSubmitting(true);
      const warnings: string[] = [];
      try {
        // 1. Create the PG
        setSubmitProgress('Creating your PG...');
        const pgPayload = {
          name: pgData.name,
          ownerId: currentUser?.id,
          description: pgData.description,
          address: pgData.address,
          city: pgData.city,
          gender: pgData.gender,
          price: Number(pgData.monthlyRent) || 0,
          securityDeposit: Number(pgData.securityDeposit) || 0,
          amenities: pgData.amenities,
          images: [],
        };
        const pgRes = await authFetch('/api/pgs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pgPayload),
        });
        if (!pgRes.ok) {
          const errBody = await pgRes.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errBody.error || 'Failed to create PG');
        }
        const pg = await pgRes.json();
        const pgId = pg.id;

        // 2. Create rooms (and their beds)
        setSubmitProgress('Creating rooms...');
        for (let i = 0; i < rooms.length; i++) {
          const room = rooms[i];
          try {
            const roomAmenities: string[] = [];
            if (room.hasAC) roomAmenities.push('AC');
            if (room.hasAttachedBath) roomAmenities.push('ATTACHED_BATHROOM');

            const roomPayload = {
              pgId,
              roomCode: room.roomCode,
              roomType: room.roomType,
              capacity: parseInt(room.numBeds) || 1,
              floor: room.floor ? parseInt(room.floor) : undefined,
              amenities: roomAmenities.length > 0 ? roomAmenities : undefined,
              pricePerBed: Number(room.pricePerBed) || undefined,
            };

            const roomRes = await authFetch('/api/rooms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(roomPayload),
            });
            if (!roomRes.ok) {
              const errBody = await roomRes.json().catch(() => ({ error: 'Unknown error' }));
              warnings.push(`Room ${room.roomCode || i + 1}: ${errBody.error || 'Failed to create'}`);
              continue;
            }
            const createdRoom = await roomRes.json();
            const roomId = createdRoom.id;

            // 3. Create beds for this room
            const numBeds = parseInt(room.numBeds) || 1;
            for (let b = 1; b <= numBeds; b++) {
              try {
                const bedPayload = {
                  roomId,
                  bedNumber: b,
                  bedType: 'SINGLE',
                  price: Number(room.pricePerBed) || undefined,
                  status: 'AVAILABLE',
                };
                const bedRes = await authFetch('/api/beds', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(bedPayload),
                });
                if (!bedRes.ok) {
                  const errBody = await bedRes.json().catch(() => ({ error: 'Unknown error' }));
                  warnings.push(`Bed ${b} in ${room.roomCode || `Room ${i + 1}`}: ${errBody.error || 'Failed to create'}`);
                }
              } catch {
                warnings.push(`Bed ${b} in ${room.roomCode || `Room ${i + 1}`}: Network error`);
              }
            }
          } catch {
            warnings.push(`Room ${room.roomCode || i + 1}: Network error`);
          }
        }

        // 4. Create staff / workers
        if (staff.length > 0) {
          setSubmitProgress('Adding staff...');
          for (let i = 0; i < staff.length; i++) {
            const member = staff[i];
            try {
              const workerPayload = {
                name: member.name,
                phone: member.phone || undefined,
                role: member.role,
                pgId,
                shift: member.shift || undefined,
                status: 'ACTIVE',
              };
              const workerRes = await authFetch('/api/workers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workerPayload),
              });
              if (!workerRes.ok) {
                const errBody = await workerRes.json().catch(() => ({ error: 'Unknown error' }));
                warnings.push(`Staff ${member.name || i + 1}: ${errBody.error || 'Failed to create'}`);
              }
            } catch {
              warnings.push(`Staff ${member.name || i + 1}: Network error`);
            }
          }
        }

        // Show success
        setSubmitProgress('');
        if (warnings.length > 0) {
          showToast(`Setup complete with ${warnings.length} warning(s). Some items may need manual setup.`);
        }
        setShowSuccess(true);
        setTimeout(() => {
          setCurrentView('OWNER_DASHBOARD');
          resetState();
          onClose();
        }, 3000);
      } catch (err) {
        setSubmitProgress('');
        showToast(err instanceof Error ? err.message : 'Failed to save PG. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleAddRoom = () => {
    setRooms([
      ...rooms,
      {
        roomCode: '',
        roomType: '',
        floor: '0',
        hasAC: false,
        hasAttachedBath: false,
        numBeds: '',
        pricePerBed: '',
      },
    ]);
  };

  const handleRemoveRoom = (index: number) => {
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const handleUpdateRoom = (index: number, updates: Partial<RoomFormData>) => {
    setRooms(rooms.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const handleAddStaff = () => {
    setStaff([...staff, { name: '', role: '', phone: '', shift: '' }]);
  };

  const handleRemoveStaff = (index: number) => {
    setStaff(staff.filter((_, i) => i !== index));
  };

  const handleUpdateStaff = (
    index: number,
    updates: Partial<StaffFormData>
  ) => {
    setStaff(staff.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl max-h-[90vh] bg-card rounded-2xl shadow-2xl shadow-gold-md border border-gold/20 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Crown className="size-5 text-brand-sage" />
                Owner Setup Wizard
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get your PG listed in 3 easy steps
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                resetState();
                onClose();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </Button>
          </div>

          {!showSuccess && <ProgressStepper currentStep={step} />}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <SuccessView key="success" />
            ) : step === 0 ? (
              <StepPGDetails
                key="step-0"
                data={pgData}
                onChange={(updates) =>
                  setPgData((prev) => ({ ...prev, ...updates }))
                }
              />
            ) : step === 1 ? (
              <StepRoomsBeds
                key="step-1"
                rooms={rooms}
                onAddRoom={handleAddRoom}
                onRemoveRoom={handleRemoveRoom}
                onUpdateRoom={handleUpdateRoom}
              />
            ) : (
              <StepStaffPlans
                key="step-2"
                staff={staff}
                onAddStaff={handleAddStaff}
                onRemoveStaff={handleRemoveStaff}
                onUpdateStaff={handleUpdateStaff}
                selectedPlan={selectedPlan}
                onSelectPlan={setSelectedPlan}
                pgData={pgData}
                rooms={rooms}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!showSuccess && (
          <div className="px-6 py-4 border-t flex items-center justify-between shrink-0">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 0}
              className="border-gold/20"
            >
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!validateStep(step) || isSubmitting}
              className="bg-gradient-to-r from-brand-deep to-brand-teal text-white hover:opacity-90 min-w-[120px]"
            >
              {step === 2 ? (
                isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" />
                    {submitProgress || 'Saving...'}
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Sparkles className="size-4 ml-1" />
                  </>
                )
              ) : (
                <>
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
