'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ShieldCheck, CheckCircle2, X, Delete, Loader2 } from 'lucide-react';
import { posApi, BorrowCatalogItem } from './api';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { CartItem } from './lib/types';
import { validateBorrowSubmission, validatePinVerificationInput } from './lib/validation';
import { SelectionView } from './components/SelectionView';
import { CheckoutView } from './components/CheckoutView';

export default function BorrowPage() {
  const [items, setItems] = useState<BorrowCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [employeePin, setEmployeePin] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [collaborators, setCollaborators] = useState('');
  const [notes, setNotes] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [step, setStep] = useState<'selection' | 'checkout'>('selection');
  const [success, setSuccess] = useState(false);
  const [submittedByEmployeeName, setSubmittedByEmployeeName] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const invRes = await posApi.listCatalog({ per_page: 200 });
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

  const addToCart = (item: BorrowCatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item_id === item.item_id);
      if (existing) {
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
          if (newQty > 0) {
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
    setIsPinVerifying(false);
    setPinDraft('');
  };

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pinDigits = useMemo(() => {
    const digits = pinDraft.split('');
    return Array.from({ length: 6 }, (_, i) => digits[i] || '');
  }, [pinDraft]);

  const handleOpenPinModal = () => {
    // Invalidate any previously verified PIN while re-entering.
    const currentDraft = employeePin;
    setEmployeePin('');
    setPinDraft(currentDraft);
    setIsPinModalOpen(true);
    setIsPinVerifying(false);
    setTimeout(() => pinInputRefs.current[currentDraft ? 5 : 0]?.focus(), 100);
  };

  const handleClosePinModal = () => {
    setIsPinModalOpen(false);
    setIsPinVerifying(false);
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

  const handleConfirmPin = async () => {
    const pinValidationError = validatePinVerificationInput(employeeId, pinDraft);
    if (pinValidationError) {
      toast.error(pinValidationError);
      return;
    }

    const cleaned = pinDraft.replace(/\D/g, '');

    setIsPinVerifying(true);
    try {
      const loginRes = await api.borrowerLogin({
        username: employeeId.trim(),
        password: cleaned,
      });

      // Revoke verification session immediately; request submission will open a fresh session.
      auth.setToken(loginRes.access_token);
      try {
        await api.post('/auth/logout');
      } catch {
        // Keep flow usable even if logout request fails; local token is still cleared below.
      } finally {
        auth.clearToken();
      }

      setEmployeePin(cleaned);
      setIsPinModalOpen(false);
      setPinDraft('');
      toast.success('PIN verified');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid PIN';
      toast.error(message);
    } finally {
      setIsPinVerifying(false);
    }
  };

  const handleClearPin = () => {
    setPinDraft('');
    pinInputRefs.current[0]?.focus();
  };

  const handleSubmit = async () => {
    const validationError = validateBorrowSubmission({
      cart,
      employeeId,
      employeePin,
      customerName,
      locationName,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);

    let hasBorrowerSession = false;

    try {
      // 1. Validate credentials (Login) as borrower
      const loginRes = await api.borrowerLogin({
        username: employeeId.trim(),
        password: employeePin.trim(),
      });

      // 2. Set token temporarily for the borrow request
      auth.setToken(loginRes.access_token);
      hasBorrowerSession = true;

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

      let displayName = employeeId.trim();
      try {
        const borrowerUser = await auth.getUser();
        if (borrowerUser) {
          displayName =
            [borrowerUser.first_name, borrowerUser.last_name].filter(Boolean).join(' ').trim() ||
            borrowerUser.username;
        }
      } catch {
        // Continue with fallback display name when profile lookup fails.
      }

      // Explicitly revoke the session server-side, then clear local token for shared devices.
      try {
        await api.post('/auth/logout');
      } catch {
        // Ensure local logout still happens even if network/session revoke fails.
      }
      auth.clearToken();

      setSubmittedByEmployeeName(displayName);
      setSuccess(true);
      toast.success(`Borrow request submitted for ${cart.length} item(s) by ${displayName}`);

      // Delay clearing and fetching to allow success animation
      setTimeout(() => {
        handleClear();
        fetchData();
        setStep('selection');
        setSuccess(false);
        setSubmittedByEmployeeName(null);
      }, 3000);
    } catch (error: unknown) {
      if (hasBorrowerSession) {
        try {
          await api.post('/auth/logout');
        } catch {
          // Clear local token even if remote revoke fails.
        }
      }

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
    <div className="h-screen p-4 animate-in fade-in duration-300 relative bg-[#fcfcfc] dark:bg-[#0a0a0b]">
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
          onProceed={() => setStep('checkout')}
        />
      ) : (
        <CheckoutView
          cart={cart}
          totalCartItems={totalCartItems}
          employeeId={employeeId}
          onEmployeeIdChange={setEmployeeId}
          employeePin={employeePin}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          locationName={locationName}
          onLocationNameChange={setLocationName}
          collaborators={collaborators}
          onCollaboratorsChange={setCollaborators}
          notes={notes}
          onNotesChange={setNotes}
          onBack={() => setStep('selection')}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          success={success}
          submittedByEmployeeName={submittedByEmployeeName}
          onOpenPinModal={handleOpenPinModal}
        />
      )}

      {isPinModalOpen && (
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
                aria-label="Close PIN modal"
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
                      className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 bg-background transition-all focus:outline-none tabular-nums ${pinDigits[i]
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
                    className={`h-1 rounded-full transition-all duration-200 ${pinDigits[i]
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
                disabled={pinDraft.replace(/\D/g, '').length !== 6 || isPinVerifying}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isPinVerifying ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4.5 h-4.5" />
                )}
                {isPinVerifying ? 'Verifying...' : 'Confirm PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
