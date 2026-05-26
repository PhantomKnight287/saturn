"use client";

import React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { currencies as AllCurrencies } from "country-data-list";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";
import { allCurrencies } from "@/data/currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface Currency {
  code: string;
  decimals: number;
  name: string;
  number: string;
  symbol?: string;
}

interface CurrencySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onCurrencySelect?: (currency: Currency) => void;
  name: string;
  placeholder?: string;
  currencies?: "custom" | "all";
  variant?: "default" | "small";
  valid?: boolean;
  disabled?: boolean;
  className?: string;
}

const CurrencySelect = React.forwardRef<HTMLButtonElement, CurrencySelectProps>(
  (
    {
      value,
      onValueChange,
      onCurrencySelect,
      name,
      placeholder = "Select currency",
      currencies = "all",
      variant = "default",
      valid = true,
      disabled,
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");

    const uniqueCurrencies = React.useMemo<Currency[]>(() => {
      const currencyMap = new Map<string, Currency>();

      AllCurrencies.all.forEach((currency: Currency) => {
        if (currency.code && currency.name && currency.symbol) {
          const shouldInclude =
            currencies === "custom"
              ? allCurrencies.includes(currency.code)
              : !allCurrencies.includes(currency.code);

          if (shouldInclude) {
            currencyMap.set(currency.code, {
              code: currency.code,
              name: currency.code === "EUR" ? "Euro" : currency.name,
              symbol: currency.symbol,
              decimals: currency.decimals,
              number: currency.number,
            });
          }
        }
      });

      return Array.from(currencyMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }, [currencies]);

    const filtered = React.useMemo(() => {
      const query = search.trim().toLowerCase();
      if (!query) return uniqueCurrencies;
      return uniqueCurrencies.filter(
        (curr) =>
          curr.code.toLowerCase().includes(query) ||
          curr.name.toLowerCase().includes(query) ||
          (curr.symbol ?? "").toLowerCase().includes(query),
      );
    }, [uniqueCurrencies, search]);

    const selected = React.useMemo(
      () => uniqueCurrencies.find((c) => c.code === value),
      [uniqueCurrencies, value],
    );

    const handleSelect = (currency: Currency) => {
      onValueChange?.(currency.code);
      onCurrencySelect?.(currency);
      setOpen(false);
      setSearch("");
    };

    return (
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            data-valid={valid}
            name={name}
            className={cn(
              "w-full justify-between font-normal h-9",

              !selected && "text-muted-foreground",
              className,
            )}
          >
            {selected ? (
              variant === "small" ? (
                <span>{selected.code}</span>
              ) : (
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-semibold">{selected.code}</span>
                  <span className="truncate text-muted-foreground">
                    {selected.name}
                  </span>
                </span>
              )
            ) : (
              <span>{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0"
          align="start"
        >
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search currencies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8"
                autoFocus
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No currencies found.
            </div>
          ) : (
            <VirtualizedCurrencyList
              currencies={filtered}
              selectedValue={value}
              onSelect={handleSelect}
            />
          )}
        </PopoverContent>
      </Popover>
    );
  },
);

const ITEM_HEIGHT = 36;
const MAX_HEIGHT = 300;

const VirtualizedCurrencyList = React.memo<{
  currencies: Currency[];
  selectedValue: string | undefined;
  onSelect: (currency: Currency) => void;
}>(({ currencies, selectedValue, onSelect }) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: currencies.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 8,
  });

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto overscroll-contain p-1"
      style={{
        height: `${Math.min(currencies.length * ITEM_HEIGHT + 8, MAX_HEIGHT)}px`,
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const currency = currencies[virtualItem.index];
          if (!currency) return null;
          const isSelected = currency.code === selectedValue;
          return (
            <button
              type="button"
              key={virtualItem.key}
              onClick={() => onSelect(currency)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                isSelected && "bg-accent text-accent-foreground",
              )}
            >
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  isSelected ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="w-12 shrink-0 text-left text-xs font-semibold text-muted-foreground truncate">
                {currency.code}
              </span>
              <span className="flex-1 truncate text-left">{currency.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {currency.symbol}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedCurrencyList.displayName = "VirtualizedCurrencyList";
CurrencySelect.displayName = "CurrencySelect";

export { CurrencySelect };
