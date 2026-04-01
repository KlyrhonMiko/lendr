import type { CartItem } from './types';

interface BorrowSubmissionInput {
  cart: CartItem[];
  employeeId: string;
  employeePin: string;
  customerName: string;
  locationName: string;
}

export function validatePinVerificationInput(employeeId: string, pinDraft: string): string | null {
  if (!employeeId.trim()) {
    return 'Employee ID is required to verify PIN';
  }

  const cleanedPin = pinDraft.replace(/\D/g, '');
  if (cleanedPin.length !== 6) {
    return 'Employee PIN must be 6 digits';
  }

  return null;
}

export function validateBorrowSubmission(input: BorrowSubmissionInput): string | null {
  if (input.cart.length === 0) {
    return 'Add at least one item to the request';
  }

  for (const cartItem of input.cart) {
    if (cartItem.cartQty <= 0) {
      return `Invalid quantity for ${cartItem.name}`;
    }

    if (cartItem.cartQty > cartItem.available_qty) {
      return `Requested quantity for ${cartItem.name} exceeds available stock`;
    }
  }

  if (!input.employeeId.trim()) {
    return 'Employee ID is required';
  }

  if (input.employeePin.trim().length !== 6) {
    return 'Employee PIN must be 6 digits';
  }

  if (!input.customerName.trim()) {
    return 'Client name is required';
  }

  if (!input.locationName.trim()) {
    return 'Client location is required';
  }

  return null;
}
