'use client';

import { CartItem } from '../lib/types';
import { formatCategoryLabel } from '../lib/utils';
import {
  ArrowLeft,
  Package2,
  BadgeCheck,
  Hash,
  Building2,
  MapPin,
  Users,
  StickyNote,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type React from 'react';

interface CheckoutViewProps {
  cart: CartItem[];
  totalCartItems: number;
  employeeId: string;
  onEmployeeIdChange: (v: string) => void;
  employeePin: string;
  onEmployeePinChange: (v: string) => void;
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  locationName: string;
  onLocationNameChange: (v: string) => void;
  collaborators: string;
  onCollaboratorsChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  success: boolean;
  currentUser: { username?: string; first_name?: string; last_name?: string } | null;
  onOpenPinModal: () => void;
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

interface FormInputProps {
  icon: React.ElementType;
  label: string;
  required?: boolean;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}

function FormInput({
  icon: Icon,
  label,
  required,
  placeholder,
  value,
  onChange,
  autoFocus,
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
        {label}
        {required && <span className="text-destructive text-[10px]">*</span>}
      </label>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          className="w-full h-14 pl-12 pr-4 rounded-2xl bg-background border-2 border-border/60 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500/50 transition-all"
        />
      </div>
    </div>
  );
}

export function CheckoutView({
  cart,
  totalCartItems,
  employeeId,
  onEmployeeIdChange,
  employeePin,
  onEmployeePinChange,
  customerName,
  onCustomerNameChange,
  locationName,
  onLocationNameChange,
  collaborators,
  onCollaboratorsChange,
  notes,
  onNotesChange,
  onBack,
  onSubmit,
  isSubmitting,
  success,
  currentUser,
  onOpenPinModal,
}: CheckoutViewProps) {
  const isFormValid =
    cart.length > 0 &&
    employeeId.trim() &&
    employeePin.trim() &&
    customerName.trim() &&
    locationName.trim();

  return (
    <div className="flex gap-4 h-full animate-in slide-in-from-right-4 duration-300">
      {/* ---- Order Summary ---- */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold font-heading">Order Summary</h1>
            <p className="text-xs text-muted-foreground">Review items before submitting</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {cart.map((item, idx) => (
            <div
              key={item.item_id}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background animate-in fade-in slide-in-from-bottom-1 duration-200"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                <Package2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCategoryLabel(item.category)} &middot; {item.condition} &middot;{' '}
                  {item.available_qty} in stock
                </p>
              </div>
              <span className="inline-flex items-center justify-center min-w-10 h-10 px-2 rounded-lg bg-indigo-500 text-white text-sm font-bold shrink-0 tabular-nums">
                &times;{item.cartQty}
              </span>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">
            {cart.length} unique item{cart.length !== 1 ? 's' : ''}
          </span>
          <span className="text-xl font-bold text-indigo-500 tabular-nums">
            {totalCartItems} total
          </span>
        </div>
      </div>

      {/* ---- Request Form ---- */}
      <div className="w-[440px] shrink-0 flex flex-col bg-card border border-border rounded-2xl overflow-hidden relative">
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-indigo-500/[0.03] to-purple-500/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-heading">Complete Request</h2>
              <p className="text-xs text-muted-foreground">Fill in the required details below</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-hide">
          {/* Employee section */}
          <div>
            <SectionHeader icon={ShieldCheck} title="Employee Verification" subtitle="Identify yourself to proceed" />
            <div className="space-y-3">
              <FormInput
                icon={Hash}
                label="Employee ID"
                required
                placeholder="Enter your employee ID"
                value={employeeId}
                onChange={onEmployeeIdChange}
                autoFocus
              />
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                  Security PIN
                  <span className="text-destructive text-[10px]">*</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenPinModal}
                  className={`w-full h-14 rounded-2xl border-2 border-dashed text-sm font-semibold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] ${
                    employeePin
                      ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10'
                      : 'border-indigo-500/40 bg-indigo-500/[0.03] text-indigo-600 hover:bg-indigo-500/10 hover:border-indigo-500/60'
                  }`}
                >
                  {employeePin ? (
                    <>
                      <CheckCircle2 className="w-4.5 h-4.5" />
                      <span>PIN Verified</span>
                      <span className="text-xs font-normal text-emerald-500/70 ml-1">
                        ••••••
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4.5 h-4.5" />
                      <span>Tap to Enter 6-Digit PIN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Client section */}
          <div>
            <SectionHeader icon={Building2} title="Client Information" subtitle="Who is this request for?" />
            <div className="space-y-3">
              <FormInput
                icon={Building2}
                label="Client Name"
                required
                placeholder="Enter client or company name"
                value={customerName}
                onChange={onCustomerNameChange}
              />
              <FormInput
                icon={MapPin}
                label="Location / Branch"
                required
                placeholder="Enter site location or branch"
                value={locationName}
                onChange={onLocationNameChange}
              />
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Additional info */}
          <div>
            <SectionHeader icon={StickyNote} title="Additional Details" subtitle="Optional information" />
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                  Collaborators
                </label>
                <div className="relative group">
                  <Users className="absolute left-4 top-4 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                  <textarea
                    placeholder="Team members working on this project..."
                    value={collaborators}
                    onChange={(e) => onCollaboratorsChange(e.target.value)}
                    className="w-full min-h-[72px] pl-12 pr-4 py-3.5 rounded-2xl bg-background border-2 border-border/60 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500/50 transition-all resize-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                  Notes
                </label>
                <div className="relative group">
                  <StickyNote className="absolute left-4 top-4 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                  <textarea
                    placeholder="Any special instructions or notes..."
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    className="w-full min-h-[90px] pl-12 pr-4 py-3.5 rounded-2xl bg-background border-2 border-border/60 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500/50 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="p-5 border-t border-border bg-gradient-to-r from-indigo-500/[0.02] to-purple-500/[0.02]">
          <button
            onClick={onSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[15px] font-bold disabled:opacity-25 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Submit Borrow Request
              </>
            )}
          </button>
        </div>

        {/* Success Overlay */}
        {success && (
          <div className="absolute inset-0 bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-5 ring-2 ring-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold font-heading">Request Submitted!</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-[260px]">
              Borrow request for{' '}
              <span className="text-indigo-500 font-semibold">
                {currentUser?.username ?? 'user'}
              </span>{' '}
              has been successfully sent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
