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
  onProceed: () => void;
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
  onProceed,
}: SelectionViewProps) {
  return (
    <div className="flex gap-6 h-full p-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Main Content: Item Selection */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header/Search Area */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search equipment, tools, or categories..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-14 pl-14 pr-12 rounded-2xl bg-card/50 backdrop-blur-md border border-border/50 text-[15px] font-medium placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2 px-6 h-14 rounded-2xl bg-card/50 backdrop-blur-md border border-border/50 text-[13px] font-bold text-muted-foreground shadow-sm">
            <PackageOpen className="w-4 h-4 opacity-50" />
            <span className="tabular-nums">{totalItems}</span>
            <span className="opacity-60 ml-1">Items Available</span>
          </div>
        </div>

        {/* Categories Scroller */}
        <div className="flex gap-2.5 mb-6 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-6 h-11 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all shrink-0 active:scale-[0.96] shadow-sm ${isActive
                    ? 'bg-primary text-primary-foreground shadow-primary/20'
                    : 'bg-card/50 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
              >
                {cat === 'All' ? 'Explore All' : formatCategoryLabel(cat)}
              </button>
            );
          })}
        </div>

        {/* Item Grid */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 -mr-1">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl -z-10 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-bold text-foreground">Loading Registry</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Synchronizing inventory cache...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground/20 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center border-2 border-dashed border-muted">
                <PackageOpen className="w-12 h-12" />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-bold text-muted-foreground/40">No items detected</p>
                <p className="text-xs text-muted-foreground/30 mt-1">Adjust your filters or try a different search</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {items.map((item) => {
                const inCart = cart.find((c) => c.item_id === item.item_id);
                const outOfStock = item.available_qty <= 0;
                return (
                  <button
                    key={item.item_id}
                    onClick={() => onAddToCart(item)}
                    className={`group relative flex flex-col text-left p-5 rounded-3xl border transition-all duration-300 min-h-[12rem] ${inCart
                        ? 'bg-primary/[0.03] border-primary shadow-lg shadow-primary/5'
                        : 'bg-card/40 backdrop-blur-sm border-border/50 hover:border-primary/40 hover:bg-card hover:shadow-xl hover:-translate-y-1'
                      } ${outOfStock ? 'opacity-60 ring-2 ring-orange-500/10' : ''}`}
                  >
                    {inCart && (
                      <div className="absolute top-4 right-4 h-7 min-w-[1.75rem] px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg shadow-primary/25 animate-in zoom-in-50 duration-300 tabular-nums">
                        {inCart.cartQty}
                      </div>
                    )}

                    <div className="flex-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase mb-3 text-ellipsis truncate max-w-full">
                        {formatCategoryLabel(item.category)}
                      </span>
                      <h3 className="font-bold text-[15px] text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-0.5">Availability</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-2xl font-black tabular-nums tracking-tight ${outOfStock ? 'text-orange-500' : 'text-foreground'}`}>
                            {item.available_qty}
                          </span>
                          <span className="text-[11px] font-bold text-muted-foreground/40 uppercase">Units</span>
                        </div>
                      </div>

                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${inCart
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                          : outOfStock
                            ? 'bg-orange-500/10 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'
                            : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20'
                        }`}>
                        <Plus className="w-5 h-5" />
                      </div>
                    </div>

                    {outOfStock && (
                      <div className="absolute inset-0 rounded-3xl bg-orange-500/[0.02] pointer-events-none border-2 border-orange-500/10" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar: Cart Controls */}
      <div className="w-[340px] xl:w-[380px] shrink-0 flex flex-col bg-card/50 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl relative group/sidebar">
        {/* Sidebar Header */}
        <div className="px-7 py-7 border-b border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-[17px]">Request Tray</h2>
                <p className="text-xs text-muted-foreground/60 font-medium">
                  {totalCartItems === 0
                    ? 'Queue is currently empty'
                    : `${totalCartItems} Item${totalCartItems !== 1 ? 's' : ''} Staged`}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={onClear}
                className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all active:scale-90"
                title="Clear staging area"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 animate-in fade-in duration-700">
              <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center border-2 border-dashed border-muted group-hover/sidebar:scale-110 transition-transform duration-500">
                <ShoppingCart className="w-8 h-8 text-muted-foreground/20" />
              </div>
              <div className="text-center max-w-[200px]">
                <p className="text-[15px] font-bold text-muted-foreground/40 leading-tight">Your tray is empty</p>
                <p className="text-[11px] text-muted-foreground/30 mt-2">Tap items on the left to begin staging your request</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, idx) => (
                <div
                  key={item.item_id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm animate-in slide-in-from-right-4 duration-300 fill-mode-both hover:border-primary/30 hover:shadow-md transition-all"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                    <Package2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground/50 mt-1 tracking-wider uppercase">
                      {item.available_qty} Units In Field
                    </p>
                  </div>
                  <div className="flex items-center bg-muted/50 rounded-xl p-1 gap-1 border border-border/30">
                    <button
                      onClick={() => onUpdateCartQty(item.item_id, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-card hover:text-primary transition-all active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-[13px] font-black tabular-nums text-foreground">
                      {item.cartQty}
                    </span>
                    <button
                      onClick={() => onUpdateCartQty(item.item_id, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-card hover:text-primary transition-all active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemoveFromCart(item.item_id)}
                    className="w-9 h-9 flex items-center justify-center text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Summary & Action */}
        <div className="p-7 border-t border-border/50 bg-gradient-to-tr from-primary/[0.02] to-transparent">
          <div className="flex items-center justify-between px-2 mb-6">
            <span className="text-[13px] font-bold text-muted-foreground/60 uppercase tracking-widest">Total Quantity</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground tabular-nums tracking-tighter">
                {totalCartItems}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground/40 uppercase">Units</span>
            </div>
          </div>

          <button
            onClick={onProceed}
            disabled={cart.length === 0}
            className="group relative w-full h-16 rounded-[1.25rem] bg-primary text-primary-foreground text-[15px] font-black disabled:opacity-20 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="flex items-center justify-center gap-3 relative z-10">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span>Review & Finalize</span>
            </div>
          </button>

          <p className="text-[10px] text-center text-muted-foreground/40 mt-4 font-bold tracking-widest uppercase">
            Step 1 of 2: Deployment Selection
          </p>
        </div>

        {/* Decorative background element */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 group-hover/sidebar:bg-primary/10 transition-colors duration-1000" />
      </div>
    </div>
  );
}
