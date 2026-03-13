'use client';

import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, UserCircle2, Loader2, Package2, ShieldAlert } from 'lucide-react';
import { inventoryApi, InventoryItem } from '../inventory/api';
import { posApi, Borrower } from './api';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

interface CartItem extends InventoryItem {
  cartQty: number;
}

export default function POSPage() {
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, borrowRes] = await Promise.all([
        inventoryApi.list(),
        posApi.getBorrowers()
      ]);
      setItems(invRes.data);
      setBorrowers(borrowRes.data);
    } catch (error: any) {
      toast.error("Failed to load POS data");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: InventoryItem) => {
    if (item.available_qty <= 0) {
        toast.error(`${item.name} is out of stock`);
        return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.item_id === item.item_id);
      if (existing) {
        if (existing.cartQty >= item.available_qty) {
            toast.warning(`Maximum available stock reached for ${item.name}`);
            return prev;
        }
        return prev.map(i => i.item_id === item.item_id ? { ...i, cartQty: i.cartQty + 1 } : i);
      }
      return [...prev, { ...item, cartQty: 1 }];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item_id === id) {
        const newQty = i.cartQty + delta;
        if (newQty > 0 && newQty <= i.available_qty) {
            return { ...i, cartQty: newQty };
        }
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.item_id !== id));
  };

  const handleClear = () => {
    setCart([]);
    setSelectedBorrower(null);
    setNotes('');
  };

  const handleCheckout = async () => {
    if (!selectedBorrower || cart.length === 0) return;
    setIsSubmitting(true);
    
    try {
      await posApi.createBatchBorrow({
        borrower_id: selectedBorrower.user_id,
        items: cart.map(i => ({ item_id: i.item_id, qty_requested: i.cartQty })),
        notes: notes || `POS checkout for ${selectedBorrower.username}`
      });
      
      setSuccess(true);
      toast.success(`Borrowed ${cart.length} items for ${selectedBorrower.username}`);
      
      setTimeout(() => {
        setSuccess(false);
        handleClear();
        fetchData(); // Refresh stock
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || "Failed to process borrow request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-8rem)] flex gap-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Inventory Section */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/50 bg-background/50 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold font-heading">Inventory Selection</h1>
            <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border">
              {items.length} Items Available
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="font-medium">Loading inventory...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <button
                  key={item.item_id}
                  disabled={item.available_qty <= 0}
                  onClick={() => addToCart(item)}
                  className={`text-left p-6 rounded-3xl border transition-all group relative overflow-hidden flex flex-col justify-between h-56 ${
                    item.available_qty <= 0 
                      ? 'bg-muted/50 border-border opacity-60 cursor-not-allowed' 
                      : 'border-border bg-background hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest border border-indigo-500/10">
                      {item.category}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xl text-foreground mb-2 font-heading group-hover:text-indigo-500 transition-colors line-clamp-2 leading-tight">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/30 w-fit px-2 py-1 rounded-lg">
                       <ShieldAlert className={`w-3 h-3 ${item.condition === 'Excellent' ? 'text-emerald-400' : 'text-amber-400'}`} />
                       {item.condition}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Available</span>
                      <span className={`text-2xl font-black ${item.available_qty <= 0 ? 'text-rose-500' : 'text-foreground'}`}>
                        {item.available_qty}
                      </span>
                    </div>
                    <div className={`p-3 rounded-2xl transition-all ${item.available_qty <= 0 ? 'bg-secondary' : 'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white shadow-lg shadow-indigo-500/0 group-hover:shadow-indigo-500/20'}`}>
                      <Plus className="w-6 h-6" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-[450px] flex flex-col bg-card border border-border rounded-3xl overflow-hidden shadow-sm relative">
        <div className="p-6 border-b border-border/50 bg-background/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-500/25">
                <ShoppingCart className="w-6 h-6" />
             </div>
             <h2 className="text-2xl font-bold font-heading">Borrow Cart</h2>
          </div>
          <button 
            onClick={handleClear}
            className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Ordering For Section */}
        <div className="p-6 bg-muted/30 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ordering For</h3>
             {selectedBorrower && (
               <button onClick={() => setSelectedBorrower(null)} className="text-xs font-bold text-indigo-500">Change</button>
             )}
          </div>
          
          {!selectedBorrower ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {borrowers.map(b => (
                <button
                  key={b.user_id}
                  onClick={() => setSelectedBorrower(b)}
                  className="flex flex-col items-center gap-2 min-w-[80px] group"
                >
                  <div className="w-12 h-12 rounded-full bg-background border-2 border-border group-hover:border-indigo-500 transition-all flex items-center justify-center text-muted-foreground group-hover:text-indigo-500">
                    <UserCircle2 className="w-8 h-8" />
                  </div>
                  <span className="text-[10px] font-bold truncate w-full text-center group-hover:text-indigo-500">{b.username}</span>
                </button>
              ))}
              <div className="min-w-[80px] flex flex-col items-center gap-2 opacity-50">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold">Other</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-background p-3 rounded-2xl border border-indigo-500/20 shadow-sm animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <UserCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">{selectedBorrower.username}</h4>
                <p className="text-xs text-muted-foreground">{selectedBorrower.email}</p>
              </div>
              <div className="ml-auto p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {/* User Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-30">
              <Package2 className="w-16 h-16" />
              <p className="font-bold text-lg text-center font-heading">Cart is Empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.item_id} className="p-4 rounded-2xl border border-border/50 bg-background flex items-center gap-4 shadow-sm group">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-colors">
                  <Package2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground truncate font-heading">{item.name}</h4>
                  <p className="text-[10px] font-black uppercase text-indigo-400">STOCK: {item.available_qty}</p>
                </div>
                <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
                  <button 
                    onClick={() => updateCartQty(item.item_id, -1)} 
                    className="p-1.5 hover:bg-background rounded-lg transition-all text-muted-foreground hover:text-foreground active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 font-black text-center text-sm">{item.cartQty}</span>
                  <button 
                    onClick={() => updateCartQty(item.item_id, 1)} 
                    className="p-1.5 hover:bg-background rounded-lg transition-all text-muted-foreground hover:text-foreground active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => removeFromCart(item.item_id)} 
                  className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer / Checkout */}
        <div className="p-6 border-t border-border bg-background/50 space-y-6">
          <div className="flex items-center justify-between text-lg">
            <span className="font-bold text-muted-foreground font-heading">Total Items</span>
            <span className="font-black text-2xl px-4 py-1 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
              {cart.reduce((acc, curr) => acc + curr.cartQty, 0)}
            </span>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || !selectedBorrower || isSubmitting}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 group"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                Submit Borrow
              </>
            )}
          </button>
        </div>

        {/* Success Overlay */}
        {success && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-6 border-2 border-emerald-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-black font-heading text-foreground mb-2">Request Sent!</h3>
            <p className="text-muted-foreground font-medium text-center max-w-[250px]">
              Borrow request for <span className="text-indigo-500">{selectedBorrower?.username}</span> has been processed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const XCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
)
