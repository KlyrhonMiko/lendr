'use client';

import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2 } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  description: string;
  available_quantity: number;
  category: string;
  status: string;
}

interface CartItem extends Equipment {
  checkoutQuantity: number;
}

export default function POSPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [borrowerName, setBorrowerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/equipment');
      const data = await res.json();
      setEquipment(data);
    } catch (error) {
      console.error('Failed to fetch equipment:', error);
    }
  };

  const filteredEquipment = equipment.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) && e.status !== 'OUT_OF_STOCK'
  );

  const addToCart = (item: Equipment) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.checkoutQuantity >= item.available_quantity) return prev;
        return prev.map(i => i.id === item.id ? { ...i, checkoutQuantity: i.checkoutQuantity + 1 } : i);
      }
      return [...prev, { ...item, checkoutQuantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQ = i.checkoutQuantity + delta;
        if (newQ > 0 && newQ <= i.available_quantity) return { ...i, checkoutQuantity: newQ };
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleCheckout = async () => {
    if (!borrowerName || cart.length === 0) return;
    setIsSubmitting(true);
    
    try {
      // In a real app, you might want a batch endpoint. We'll do sequential here for simplicity.
      for (const item of cart) {
        for (let i = 0; i < item.checkoutQuantity; i++) {
          await fetch('http://localhost:5000/api/borrows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              equipment_id: item.id,
              borrower_name: borrowerName,
              expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
            })
          });
        }
      }
      
      setSuccess(true);
      setCart([]);
      setBorrowerName('');
      setTimeout(() => {
        setSuccess(false);
        fetchEquipment(); // Refresh stock
      }, 3000);
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-8rem)] flex gap-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/50 bg-background/50">
          <h1 className="text-2xl font-bold font-heading mb-4">Select Equipment</h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all font-medium text-lg"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEquipment.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="text-left p-5 rounded-2xl border border-border bg-background hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <h3 className="font-semibold text-lg text-foreground mb-1 font-heading">{item.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
                      {item.category || 'General'}
                    </span>
                    <span className="text-indigo-400 font-bold text-sm bg-indigo-500/10 px-3 py-1 rounded-full">
                      {item.available_quantity} available
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {filteredEquipment.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground font-medium">
                No equipment found. Try a different search.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart & Checkout Area */}
      <div className="w-[400px] flex flex-col bg-card border border-border rounded-3xl overflow-hidden shadow-sm relative">
        <div className="p-6 border-b border-border/50 bg-background/50 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold font-heading">Borrow Cart</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p className="font-medium text-center">Cart is empty.<br/>Select items to borrow.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="p-4 rounded-xl border border-border/50 bg-background flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate font-heading">{item.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{item.available_quantity} max</p>
                </div>
                <div className="flex items-center gap-3 bg-secondary rounded-lg p-1 border border-border">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-4 font-bold text-center text-sm">{item.checkoutQuantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-border bg-background/50 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Borrower Name / ID</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all font-medium"
              />
            </div>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || !borrowerName || isSubmitting}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Processing...' : 'Submit Request'}
          </button>
        </div>

        {/* Success Overlay */}
        {success && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold font-heading text-foreground mb-2">Request Submitted</h3>
            <p className="text-muted-foreground font-medium text-center">Equipment has been requested.<br/>Pending review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
