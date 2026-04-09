"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-4", className)}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2100, 11)}
            classNames={{
                months: "relative px-2",
                month: "space-y-4",
                month_caption: "flex justify-center pt-1 relative items-center h-9 mb-2 px-10 gap-1",
                caption_label: "text-sm font-medium hidden",
                dropdowns: "flex gap-1 items-center",
                dropdown: "hidden",
                nav: "flex items-center",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-0 top-1 z-10"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-0 top-1 z-10"
                ),
                month_grid: "w-full border-collapse space-y-1",
                weekdays: "flex",
                weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex items-center justify-center",
                week: "flex w-full mt-2",
                day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                ),
                range_end: "day-range-end",
                selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                today: "bg-accent text-accent-foreground",
                outside: "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
                disabled: "text-muted-foreground opacity-50",
                range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
                    return <Icon className="h-4 w-4" />;
                },
                Dropdown: ({ value, onChange, options }: DropdownProps) => {
                    const selectedOption = options?.find((opt) => opt.value === value);

                    return (
                        <PopoverPrimitive.Root>
                            <PopoverPrimitive.Trigger className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-primary h-8">
                                {selectedOption?.label}
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </PopoverPrimitive.Trigger>
                            <PopoverPrimitive.Portal>
                                <PopoverPrimitive.Positioner sideOffset={4} align="center" className="z-[110]">
                                    <PopoverPrimitive.Popup className="bg-popover text-popover-foreground border border-border rounded-lg shadow-xl w-[140px] max-h-[300px] overflow-y-auto p-1 animate-in fade-in-0 zoom-in-95">
                                        {options?.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    const event = {
                                                        target: { value: option.value },
                                                    } as unknown as React.ChangeEvent<HTMLSelectElement>;
                                                    onChange?.(event);
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors text-foreground",
                                                    option.value === value
                                                        ? "bg-primary text-primary-foreground font-semibold"
                                                        : "hover:bg-muted font-medium"
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </PopoverPrimitive.Popup>
                                </PopoverPrimitive.Positioner>
                            </PopoverPrimitive.Portal>
                        </PopoverPrimitive.Root>
                    );
                },
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
