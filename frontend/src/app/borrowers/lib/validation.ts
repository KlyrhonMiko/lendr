export function sanitizePin(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function validatePinChangeInput(input: {
  currentPin: string;
  newPin: string;
  confirmPin: string;
}): string | null {
  if (!isValidPin(input.currentPin)) {
    return 'Current PIN must be exactly 6 digits';
  }

  if (!isValidPin(input.newPin)) {
    return 'New PIN must be exactly 6 digits';
  }

  if (input.newPin !== input.confirmPin) {
    return 'New PIN and confirmation PIN do not match';
  }

  if (input.newPin === input.currentPin) {
    return 'New PIN must be different from current PIN';
  }

  return null;
}
