import * as React from "react";
import {Check, ChevronsUpDown, Search} from "lucide-react";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";

/**
 * SearchableSelect Component
 * Dropdown dengan search functionality untuk memilih customer
 *
 * Props:
 * - value: selected value
 * - onValueChange: callback ketika value berubah
 * - options: array of {value, label} objects
 * - placeholder: placeholder text
 * - searchPlaceholder: search input placeholder
 * - emptyText: text ketika tidak ada hasil
 */
export function SearchableSelect({
    value,
    onValueChange,
    options = [],
    placeholder = "Pilih...",
    searchPlaceholder = "Cari...",
    emptyText = "Tidak ditemukan",
    disabled = false,
    className
}) {
    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn("w-full justify-between", !value && "text-muted-foreground", className)}
                >
                    {selectedOption ? selectedOption.label : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                        />
                    </div>
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {options
                                .filter(opt => {
                                    if (!searchValue) return true;
                                    return opt.label.toLowerCase().includes(searchValue.toLowerCase());
                                })
                                .map(option => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        onSelect={currentValue => {
                                            onValueChange(currentValue === value ? "" : currentValue);
                                            setOpen(false);
                                            setSearchValue("");
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === option.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {option.label}
                                    </CommandItem>
                                ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default SearchableSelect;
