'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ShieldCheck, CheckCircle2, X, Delete } from 'lucide-react';
import { inventoryApi, InventoryItem } from '@/app/inventory/items/api';
import { posApi } from './api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { CartItem } from './lib/types';
import { SelectionView } from './components/SelectionView';
import { CheckoutView } from './components/CheckoutView';

type Step = 'selection' | 'checkout';

export default function BorrowPage() {
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<Step>('selection');

  const [employeeId, setEmployeeId] = useState('');
  const [employeePin, setEmployeePin] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [collaborators, setCollaborators] = useState('');
  const [notes, setNotes] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const invRes = await inventoryApi.list();
      setItems(invRes.data);
    } catch {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [items]);

  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredItems = useMemo(
    () =>
      items.filter((i) => {
        const matchesSearch =
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.category.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || i.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [items, search, selectedCategory],
  );

  const totalCartItems = cart.reduce((acc, curr) => acc + curr.cartQty, 0);

  const addToCart = (item: InventoryItem) => {
    if (item.available_qty <= 0) {
      toast.error(`${item.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.item_id === item.item_id);
      if (existing) {
        if (existing.cartQty >= item.available_qty) {
          toast.warning(`Maximum available stock reached for ${item.name}`);
          return prev;
        }
        return prev.map((i) =>
          i.item_id === item.item_id ? { ...i, cartQty: i.cartQty + 1 } : i,
        );
      }
      return [...prev, { ...item, cartQty: 1 }];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.item_id === id) {
          const newQty = i.cartQty + delta;
          if (newQty > 0 && newQty <= i.available_qty) {
            return { ...i, cartQty: newQty };
          }
        }
        return i;
      }),
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.item_id !== id));
  };

  const handleClear = () => {
    setCart([]);
    setNotes('');
    setCustomerName('');
    setLocationName('');
    setCollaborators('');
    setEmployeeId('');
    setEmployeePin('');
    setIsPinModalOpen(false);
    setPinDraft('');
    setStep('selection');
  };

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pinDigits = useMemo(() => {
    const digits = pinDraft.split('');
    return Array.from({ length: 6 }, (_, i) => digits[i] || '');
  }, [pinDraft]);

  const handleOpenPinModal = () => {
    setPinDraft(employeePin);
    setIsPinModalOpen(true);
    setTimeout(() => pinInputRefs.current[employeePin ? 5 : 0]?.focus(), 100);
  };

  const handleClosePinModal = () => {
    setIsPinModalOpen(false);
    setPinDraft('');
  };

  const handlePinDigitChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setPinDraft((prev) => {
      const digits = prev.split('');
      while (digits.length < 6) digits.push('');
      digits[index] = digit;
      return digits.join('').replace(/\s/g, '');
    });
    if (digit && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handlePinKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        e.preventDefault();
        setPinDraft((prev) => {
          const digits = prev.split('');
          digits[index - 1] = '';
          return digits.join('');
        });
        pinInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  }, [pinDigits]);

  const handlePinPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setPinDraft(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    setTimeout(() => pinInputRefs.current[focusIdx]?.focus(), 0);
  }, []);

  const handleConfirmPin = () => {
    const cleaned = pinDraft.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      toast.error('Employee PIN must be 6 digits');
      return;
    }
    setEmployeePin(cleaned);
    setIsPinModalOpen(false);
    toast.success('Employee PIN captured');
  };

  const handleClearPin = () => {
    setPinDraft('');
    pinInputRefs.current[0]?.focus();
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      toast.error('Add at least one item to proceed');
      return;
    }
    setStep('checkout');
  };

  const handleBackToSelection = () => {
    setStep('selection');
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (!employeeId.trim()) {
      toast.error('Employee ID is required');
      return;
    }
    if (employeePin.trim().length !== 6) {
      toast.error('Employee PIN must be 6 digits');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (!locationName.trim()) {
      toast.error('Client location is required');
      return;
    }
    setIsSubmitting(true);

    try {
      // 1. Validate credentials (Login) as borrower
      const loginRes = await api.borrowerLogin({
        username: employeeId.trim(),
        password: employeePin.trim(),
      });

      // 2. Set token temporarily for the borrow request
      auth.setToken(loginRes.access_token);

      // 3. Submit borrow request
      await posApi.createBatchBorrow({
        items: cart.map((i) => ({ item_id: i.item_id, qty_requested: i.cartQty })),
        notes: [
          `Employee ID: ${employeeId.trim()}`,
          collaborators.trim() ? `Collaborators: ${collaborators.trim()}` : '',
          notes ? notes.trim() : '',
        ]
          .filter(Boolean)
          .join(' | '),
        customer_name: customerName.trim(),
        location_name: locationName.trim(),
      });

      // 4. Clear token (Security - shared kiosk)
      auth.clearToken();

      setSuccess(true);
      toast.success(`Borrow request submitted for ${cart.length} item(s)`);

      setTimeout(() => {
        setSuccess(false);
        handleClear();
        fetchData();
      }, 3000);
    } catch (error: unknown) {
      // Ensure token is cleared even on error
      auth.clearToken();
      const message =
        error instanceof Error ? error.message : 'Failed to process borrow request';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen p-4 animate-in fade-in duration-300 relative">
      {step === 'selection' ? (
        <SelectionView
          items={filteredItems}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          totalItems={items.length}
          cart={cart}
          totalCartItems={totalCartItems}
          onAddToCart={addToCart}
          onUpdateCartQty={updateCartQty}
          onRemoveFromCart={removeFromCart}
          onClear={handleClear}
          onProceedToCheckout={handleProceedToCheckout}
        />
      ) : (
        <CheckoutView
          cart={cart}
          totalCartItems={totalCartItems}
          employeeId={employeeId}
          onEmployeeIdChange={setEmployeeId}
          employeePin={employeePin}
          onEmployeePinChange={setEmployeePin}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          locationName={locationName}
          onLocationNameChange={setLocationName}
          collaborators={collaborators}
          onCollaboratorsChange={setCollaborators}
          notes={notes}
          onNotesChange={setNotes}
          onBack={handleBackToSelection}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          success={success}
          currentUser={currentUser}
          onOpenPinModal={handleOpenPinModal}
        />
      )}

      {step === 'checkout' && isPinModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleClosePinModal}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-7 pt-7 pb-5 text-center relative">
              <button
                onClick={handleClosePinModal}
                className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 mx-auto mb-4">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold font-heading">Enter Your PIN</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Type your 6-digit employee security PIN
              </p>
            </div>

            {/* PIN Boxes */}
            <div className="px-7 pb-2">
              <div className="flex justify-center gap-3" onPaste={handlePinPaste}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="relative">
                    <input
                      ref={(el) => { pinInputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={pinDigits[i] ? '•' : ''}
                      onChange={(e) => handlePinDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                      className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 bg-background transition-all focus:outline-none tabular-nums ${
                        pinDigits[i]
                          ? 'border-indigo-500/50 text-foreground'
                          : 'border-border/80 text-muted-foreground'
                      } focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)]`}
                    />
                    {!pinDigits[i] && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-2 h-2 rounded-full bg-border" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Progress indicator */}
              <div className="flex justify-center mt-4 gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-200 ${
                      pinDigits[i]
                        ? 'w-5 bg-indigo-500'
                        : 'w-3 bg-border'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-7 pt-5 pb-7 flex gap-3">
              <button
                onClick={handleClearPin}
                className="h-12 px-5 rounded-xl border-2 border-border/60 bg-muted/40 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 active:scale-[0.98]"
              >
                <Delete className="w-4 h-4" />
                Clear
              </button>
              <button
                onClick={handleConfirmPin}
                disabled={pinDraft.replace(/\D/g, '').length !== 6}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4.5 h-4.5" />
                Confirm PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
