'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FormSelectOption {
    key: string;
    label: string;
}

interface FormSelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: FormSelectOption[];
    placeholder: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
    autoWidth?: boolean;
}

export function FormSelect({
    label,
    value,
    onChange,
    options,
    placeholder,
    required,
    disabled,
    className,
    triggerClassName,
    autoWidth = true,
}: FormSelectProps) {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((o) => o.key === value);
    const displayValue = selectedOption?.label ?? placeholder;

    return (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <label className="block text-sm font-medium text-foreground">
                    {label}
                    {required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'w-full h-11 px-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium cursor-pointer flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                        triggerClassName
                    )}
                >
                    <span className={cn('truncate text-left', !value && 'text-muted-foreground')}>{displayValue}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    sideOffset={4}
                    className={cn(
                        'p-1 max-h-60 overflow-y-auto',
                        autoWidth ? 'w-[var(--radix-popover-trigger-width)]' : 'w-56'
                    )}
                >
                    {options.map((opt) => (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                                onChange(opt.key);
                                setOpen(false);
                            }}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
                                value === opt.key ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                            )}
                        >
                            <Check className={cn('w-4 h-4 shrink-0', value === opt.key ? 'opacity-100' : 'opacity-0')} />
                            {opt.label}
                        </button>
                    ))}
                </PopoverContent>
            </Popover>
        </div>
    );
}
