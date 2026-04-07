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
  submittedByEmployeeName: string | null;
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
  disabled?: boolean;
}

function FormInput({
  icon: Icon,
  label,
  required,
  placeholder,
  value,
  onChange,
  autoFocus,
  disabled,
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
          disabled={disabled}
          className={`w-full h-14 pl-12 pr-4 rounded-2xl border-2 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500/50 transition-all ${disabled
              ? 'bg-muted/40 border-border/50 text-muted-foreground cursor-not-allowed'
              : 'bg-background border-border/60'
            }`}
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
  submittedByEmployeeName,
  onOpenPinModal,
}: CheckoutViewProps) {
  const isPinVerified = Boolean(employeePin.trim());
  const isFormValid =
    cart.length > 0 &&
    employeeId.trim() &&
    employeePin.trim() &&
    customerName.trim() &&
    locationName.trim();

  return (
    <div className="flex gap-6 h-full p-2 animate-in slide-in-from-right-8 duration-700">
      {/* ---- Order Summary ---- */}
      <div className="flex-1 flex flex-col bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl relative group/summary">
        <div className="px-8 py-7 border-b border-border/50 flex items-center justify-between bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-12 h-12 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-2xl transition-all active:scale-90 border border-border/50"
              aria-label="Return to selection"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight">Request Summary</h1>
              <p className="text-xs text-muted-foreground/60 font-medium">Verify your deployment payload</p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-[11px] font-black text-primary uppercase tracking-widest">
            {cart.length} Unique Classes
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-hide">
          {cart.map((item, idx) => (
            <div
              key={item.item_id}
              className="flex items-center gap-5 p-5 rounded-[2rem] border border-border/50 bg-card/60 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 hover:border-primary/30 transition-all group/item"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10 group-hover/item:scale-110 transition-transform duration-300">
                <Package2 className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[15px] text-foreground truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {formatCategoryLabel(item.category)}
                  </span>
                  <span className="text-xs text-muted-foreground/40 font-bold">&middot;</span>
                  <span className="text-[11px] text-muted-foreground/60 font-bold uppercase tracking-tight">
                    {item.available_qty} Units Stored
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Requesting</span>
                <span className="inline-flex items-center justify-center min-w-[3rem] h-11 px-3 rounded-xl bg-primary text-primary-foreground text-[17px] font-black tabular-nums shadow-lg shadow-primary/20">
                  {item.cartQty}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-8 py-6 border-t border-border/50 flex items-center justify-between bg-gradient-to-tr from-primary/[0.02] to-transparent">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Payload Weight</span>
            <span className="text-sm text-foreground font-black">
              {totalCartItems} Units Total
            </span>
          </div>
          <div className="w-12 h-1 border-t-2 border-dashed border-border/50 mx-4 hidden sm:block" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">Submission Ready</span>
            <span className="text-2xl font-black text-primary tabular-nums tracking-tighter">
              {totalCartItems} <span className="text-sm opacity-60">QTY</span>
            </span>
          </div>
        </div>
      </div>

      {/* ---- Request Form ---- */}
      <div className="w-[440px] shrink-0 flex flex-col bg-card/50 backdrop-blur-xl border border-border/50 rounded-[2.5rem] shadow-2xl relative overflow-hidden group/form">
        <div className="px-8 py-7 border-b border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
              <BadgeCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Secure Finalize</h2>
              <p className="text-xs text-muted-foreground/60 font-medium">Authentication required for logs</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 scrollbar-hide">
          {/* Employee Identity */}
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-4 bg-primary rounded-full" />
              <span className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Authorized Personnel</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative group/input">
                  <Hash className="absolute left-5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/30 group-focus-within/input:text-primary transition-colors pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Personnel Identifier"
                    value={employeeId}
                    onChange={(e) => onEmployeeIdChange(e.target.value)}
                    autoFocus
                    className="w-full h-14 pl-14 pr-5 rounded-2xl bg-background border border-border/50 text-[15px] font-bold placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenPinModal}
                className={`w-full h-14 rounded-2xl border-2 border-dashed text-[13px] font-black flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${employeePin
                    ? 'border-emerald-500/30 bg-emerald-500/[0.03] text-emerald-600 shadow-lg shadow-emerald-500/5'
                    : 'border-primary/20 bg-primary/[0.02] text-primary hover:bg-primary/[0.05] hover:border-primary/40'
                  }`}
              >
                {employeePin ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>AUTHENTICATED</span>
                    <span className="text-xs font-black tracking-widest opacity-40 ml-2">••••••</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>VERIFY SECURITY PIN</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="h-px bg-border/40 w-full" />

          {/* Logistics Data */}
          <div className={`space-y-6 transition-all duration-500 animate-in slide-in-from-bottom-4 ${isPinVerified ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none scale-[0.98]'
            }`} style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-4 bg-primary rounded-full" />
              <span className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Logistics Metadata</span>
            </div>

            <div className="space-y-4">
              <div className="relative group/input">
                <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/30 group-focus-within/input:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Target Client / Account"
                  value={customerName}
                  onChange={(e) => onCustomerNameChange(e.target.value)}
                  disabled={!isPinVerified}
                  className="w-full h-14 pl-14 pr-5 rounded-2xl bg-background border border-border/50 text-[15px] font-bold placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm disabled:bg-muted/30"
                />
              </div>

              <div className="relative group/input">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/30 group-focus-within/input:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Operational Site / Branch"
                  value={locationName}
                  onChange={(e) => onLocationNameChange(e.target.value)}
                  disabled={!isPinVerified}
                  className="w-full h-14 pl-14 pr-5 rounded-2xl bg-background border border-border/50 text-[15px] font-bold placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm disabled:bg-muted/30"
                />
              </div>

              <div className="relative group/input">
                <Users className="absolute left-5 top-5 w-[18px] h-[18px] text-muted-foreground/30 group-focus-within/input:text-primary transition-colors" />
                <textarea
                  placeholder="Deployment Collaborators (Optional)"
                  value={collaborators}
                  onChange={(e) => onCollaboratorsChange(e.target.value)}
                  disabled={!isPinVerified}
                  className="w-full min-h-[90px] pl-14 pr-5 py-4 rounded-2xl bg-background border border-border/50 text-[15px] font-bold placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm disabled:bg-muted/30 resize-none"
                />
              </div>

              <div className="relative group/input">
                <StickyNote className="absolute left-5 top-5 w-[18px] h-[18px] text-muted-foreground/30 group-focus-within/input:text-primary transition-colors" />
                <textarea
                  placeholder="Deployment Logic / Memo (Optional)"
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  disabled={!isPinVerified}
                  className="w-full min-h-[100px] pl-14 pr-5 py-4 rounded-2xl bg-background border border-border/50 text-[15px] font-bold placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm disabled:bg-muted/30 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="p-8 border-t border-border/50 bg-gradient-to-tr from-primary/[0.04] to-transparent">
          <button
            onClick={onSubmit}
            disabled={!isFormValid || isSubmitting}
            className="group relative w-full h-16 rounded-[1.25rem] bg-primary text-primary-foreground text-[15px] font-black disabled:opacity-20 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="flex items-center justify-center gap-3 relative z-10">
              {isSubmitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span>TRANSMIT DEPLOYMENT REQUEST</span>
                </>
              )}
            </div>
          </button>

          <p className="text-[10px] text-center text-muted-foreground/40 mt-4 font-bold tracking-widest uppercase">
            Final Step: Infrastructure Authorization
          </p>
        </div>

        {/* Success Overlay */}
        {success && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 ring-4 ring-emerald-500/20">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="absolute -inset-8 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
            </div>
            <h3 className="text-3xl font-black tracking-tight text-center">TRANSMISSION<br />SUCCESSFUL</h3>
            <div className="h-1 w-12 bg-primary rounded-full my-6" />
            <p className="text-sm text-muted-foreground/60 font-bold text-center max-w-[280px] leading-relaxed">
              Deployment log authorized by{' '}
              <span className="text-primary">
                {submittedByEmployeeName ?? employeeId}
              </span>.
              Infrastructure tray has been flushed.
            </p>

            <button
              className="mt-10 px-8 h-12 rounded-xl bg-muted text-[11px] font-black tracking-[0.2em] uppercase hover:bg-muted/80 transition-colors"
              onClick={() => window.location.reload()}
            >
              System Restart
            </button>
          </div>
        )}

        {/* Decorative background element */}
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 group-hover/form:bg-primary/10 transition-colors duration-1000" />
      </div>
    </div>
  );
}
