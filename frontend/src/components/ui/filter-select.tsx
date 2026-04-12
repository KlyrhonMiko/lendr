'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FilterSelectOption {
    key: string;
    label: string;
}

interface FilterSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: FilterSelectOption[];
    placeholder: string;
    className?: string;
    contentClassName?: string;
    align?: 'start' | 'center' | 'end';
}

export function FilterSelect({
    value,
    onChange,
    options,
    placeholder,
    className,
    contentClassName,
    align = 'end',
}: FilterSelectProps) {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((o) => o.key === value);
    const displayValue = selectedOption?.label ?? placeholder;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                type="button"
                className={cn(
                    'h-9 px-3 rounded-xl bg-muted/50 border border-border text-xs font-medium cursor-pointer flex items-center gap-1.5 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                    className
                )}
            >
                <span className={cn('truncate', !value && 'text-muted-foreground')}>{displayValue}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            </PopoverTrigger>
            <PopoverContent
                align={align}
                sideOffset={4}
                className={cn('w-44 p-1 max-h-52 overflow-y-auto', contentClassName)}
            >
                <button
                    type="button"
                    onClick={() => {
                        onChange('');
                        setOpen(false);
                    }}
                    className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left',
                        !value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                    )}
                >
                    <Check className={cn('w-3.5 h-3.5 shrink-0', !value ? 'opacity-100' : 'opacity-0')} />
                    {placeholder}
                </button>
                {options.map((opt) => (
                    <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                            onChange(opt.key);
                            setOpen(false);
                        }}
                        className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left',
                            value === opt.key ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                        )}
                    >
                        <Check className={cn('w-3.5 h-3.5 shrink-0', value === opt.key ? 'opacity-100' : 'opacity-0')} />
                        {opt.label}
                    </button>
                ))}
            </PopoverContent>
        </Popover>
    );
}
