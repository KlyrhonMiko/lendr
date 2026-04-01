'use client';

import type { BorrowCatalogItem } from '../api';
import { CartItem } from '../lib/types';
import { formatCategoryLabel } from '../lib/utils';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Package2,
  X,
  PackageOpen,
  Sparkles,
  Hash,
  Building2,
  MapPin,
  Users,
  StickyNote,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface SelectionViewProps {
  items: BorrowCatalogItem[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (v: string) => void;
  totalItems: number;
  cart: CartItem[];
  totalCartItems: number;
  onAddToCart: (item: BorrowCatalogItem) => void;
  onUpdateCartQty: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
  onClear: () => void;
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
  onOpenPinModal: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function SelectionView({
  items,
  loading,
  search,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  totalItems,
  cart,
  totalCartItems,
  onAddToCart,
  onUpdateCartQty,
  onRemoveFromCart,
  onClear,
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
  onOpenPinModal,
  onSubmit,
  isSubmitting,
}: SelectionViewProps) {
  const isPinVerified = Boolean(employeePin.trim());
  const isFormValid =
    cart.length > 0 &&
    employeeId.trim().length > 0 &&
    employeePin.trim().length === 6 &&
    customerName.trim().length > 0 &&
    locationName.trim().length > 0;

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search items by name or category..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-14 pl-12 pr-12 rounded-2xl bg-card border-2 border-border/60 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-xs font-bold text-muted-foreground bg-card border-2 border-border/60 rounded-2xl px-5 h-14 flex items-center whitespace-nowrap select-none tabular-nums">
            {totalItems} items
          </div>
        </div>

        <div className="flex gap-2.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-5 h-11 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 active:scale-[0.97] ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-card border-2 border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20'
                }`}
              >
                {cat === 'All' ? 'All Items' : formatCategoryLabel(cat)}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide rounded-2xl">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Loading inventory</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Fetching available items...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/30">
              <PackageOpen className="w-14 h-14" />
              <div className="text-center">
                <p className="text-sm font-bold text-muted-foreground/50">No items found</p>
                <p className="text-xs text-muted-foreground/40 mt-1">Try adjusting your search or filter</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((item) => {
                const inCart = cart.find((c) => c.item_id === item.item_id);
                const outOfStock = item.available_qty <= 0;
                return (
                  <button
                    key={item.item_id}
                    onClick={() => onAddToCart(item)}
                    className={`relative text-left p-5 rounded-2xl border-2 transition-all group flex flex-col justify-between min-h-[10.5rem] ${
                      inCart
                        ? 'border-indigo-500/50 bg-indigo-500/[0.04] shadow-sm'
                        : outOfStock
                          ? 'bg-card border-border/60 hover:border-orange-500/40 hover:shadow-lg active:scale-[0.97] opacity-80'
                          : 'bg-card border-border/60 hover:border-indigo-500/40 hover:shadow-lg active:scale-[0.97]'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-3.5 right-3.5 min-w-7 h-7 px-2 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-indigo-500/20 tabular-nums">
                        {inCart.cartQty}
                      </span>
                    )}

                    <div>
                      <span className="inline-block text-[11px] font-semibold text-muted-foreground/70 tracking-wide uppercase">
                        {formatCategoryLabel(item.category)}
                      </span>
                      <h3 className="font-bold text-sm text-foreground mt-1.5 line-clamp-2 leading-snug font-heading">
                        {item.name}
                      </h3>
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-xl font-extrabold tabular-nums ${
                            outOfStock ? 'text-orange-500' : 'text-foreground'
                          }`}
                        >
                          {item.available_qty}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase">
                          avail
                        </span>
                      </div>
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          inCart
                            ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                            : outOfStock
                              ? 'bg-orange-500/20 text-orange-600 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-orange-500/20'
                              : 'bg-secondary/80 text-muted-foreground group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-500/20'
                        }`}
                      >
                        <Plus className="w-5 h-5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="w-[22rem] xl:w-[24rem] shrink-0 flex flex-col bg-card border-2 border-border/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base font-heading">Cart</h2>
              <p className="text-xs text-muted-foreground">
                {totalCartItems === 0
                  ? 'No items yet'
                  : `${totalCartItems} item${totalCartItems !== 1 ? 's' : ''} selected`}
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={onClear}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors active:scale-95"
              title="Clear cart"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-muted-foreground/20" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-muted-foreground/40">Empty cart</p>
                <p className="text-xs text-muted-foreground/30 mt-1">Tap items on the left to add</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.item_id}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-background border-2 border-border/40 animate-in slide-in-from-right-2 duration-200"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                    <Package2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium">
                      {item.available_qty} in stock {item.available_qty <= 0 && '(Pre-Request)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-secondary/60 rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => onUpdateCartQty(item.item_id, -1)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background transition-colors text-muted-foreground active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums text-foreground">
                      {item.cartQty}
                    </span>
                    <button
                      onClick={() => onUpdateCartQty(item.item_id, 1)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background transition-colors text-muted-foreground active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemoveFromCart(item.item_id)}
                    className="w-9 h-9 flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0 active:scale-95"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="h-px bg-border/60 my-3" />

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Validate Credentials
                </p>

                <div className="relative group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Employee ID"
                    value={employeeId}
                    onChange={(e) => onEmployeeIdChange(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-border/60 bg-background text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={onOpenPinModal}
                  className={`w-full h-12 rounded-xl border-2 border-dashed text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    isPinVerified
                      ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10'
                      : 'border-indigo-500/40 bg-indigo-500/[0.03] text-indigo-600 hover:bg-indigo-500/10 hover:border-indigo-500/60'
                  }`}
                >
                  {isPinVerified ? (
                    <>
                      <CheckCircle2 className="w-4.5 h-4.5" />
                      <span>PIN Verified</span>
                      <span className="text-xs font-normal text-emerald-500/70">••••••</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4.5 h-4.5" />
                      <span>Enter 6-Digit PIN</span>
                    </>
                  )}
                </button>

                <div
                  className={`space-y-3 transition-opacity ${
                    isPinVerified ? 'opacity-100' : 'opacity-50 pointer-events-none'
                  }`}
                  aria-disabled={!isPinVerified}
                >
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Client name"
                      value={customerName}
                      onChange={(e) => onCustomerNameChange(e.target.value)}
                      disabled={!isPinVerified}
                      className={`w-full h-12 pl-12 pr-4 rounded-xl border-2 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:border-indigo-500/50 transition-all ${
                        isPinVerified
                          ? 'bg-background border-border/60'
                          : 'bg-muted/40 border-border/50 text-muted-foreground cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Client location"
                      value={locationName}
                      onChange={(e) => onLocationNameChange(e.target.value)}
                      disabled={!isPinVerified}
                      className={`w-full h-12 pl-12 pr-4 rounded-xl border-2 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:border-indigo-500/50 transition-all ${
                        isPinVerified
                          ? 'bg-background border-border/60'
                          : 'bg-muted/40 border-border/50 text-muted-foreground cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div className="relative group">
                    <Users className="absolute left-4 top-3.5 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                    <textarea
                      placeholder="Collaborators (optional)"
                      value={collaborators}
                      onChange={(e) => onCollaboratorsChange(e.target.value)}
                      disabled={!isPinVerified}
                      className={`w-full min-h-[68px] pl-12 pr-4 py-3 rounded-xl border-2 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:border-indigo-500/50 transition-all resize-none ${
                        isPinVerified
                          ? 'bg-background border-border/60'
                          : 'bg-muted/40 border-border/50 text-muted-foreground cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div className="relative group">
                    <StickyNote className="absolute left-4 top-3.5 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                    <textarea
                      placeholder="Notes (optional)"
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                      disabled={!isPinVerified}
                      className={`w-full min-h-[74px] pl-12 pr-4 py-3 rounded-xl border-2 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:border-indigo-500/50 transition-all resize-none ${
                        isPinVerified
                          ? 'bg-background border-border/60'
                          : 'bg-muted/40 border-border/50 text-muted-foreground cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-muted-foreground">Total Items</span>
            <span className="text-2xl font-extrabold text-foreground tabular-nums">
              {totalCartItems}
            </span>
          </div>
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
      </div>
    </div>
  );
}
