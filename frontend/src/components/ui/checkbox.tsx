'use client';

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends CheckboxPrimitive.Root.Props { }

/**
 * Standardized Checkbox component using @base-ui/react.
 * Provides a modern look and consistent behavior across the application.
 */
const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
    ({ className, ...props }, ref) => {
        return (
            <CheckboxPrimitive.Root
                ref={ref}
                className={cn(
                    "peer h-5 w-5 shrink-0 rounded-lg border border-border bg-muted/20 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary hover:bg-muted/30 cursor-pointer flex items-center justify-center",
                    className
                )}
                {...props}
            >
                <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current animate-in zoom-in-50 duration-200">
                    <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
        );
    }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
