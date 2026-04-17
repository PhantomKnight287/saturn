import React from "react";
import { cn } from "@/lib/utils";
import { currencies as AllCurrencies } from "country-data-list";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type SelectProps } from "@radix-ui/react-select";
import { allCurrencies } from "@/data/currencies";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface Currency {
  code: string;
  decimals: number;
  name: string;
  number: string;
  symbol?: string;
}

interface CurrencySelectProps extends Omit<SelectProps, "onValueChange"> {
  onValueChange?: (value: string) => void;
  onCurrencySelect?: (currency: Currency) => void;
  name: string;
  placeholder?: string;
  currencies?: "custom" | "all";
  variant?: "default" | "small";
  valid?: boolean;
}

const CurrencySelect = React.forwardRef<HTMLButtonElement, CurrencySelectProps>(
  (
    {
      value,
      onValueChange,
      onCurrencySelect,
      name,
      placeholder = "Select currency",
      currencies = "withdrawal",
      variant = "default",
      valid = true,
      ...props
    },
    ref,
  ) => {
    const [selectedCurrency, setSelectedCurrency] =
      React.useState<Currency | null>(null);

    const uniqueCurrencies = React.useMemo<Currency[]>(() => {
      const currencyMap = new Map<string, Currency>();

      AllCurrencies.all.forEach((currency: Currency) => {
        if (currency.code && currency.name && currency.symbol) {
          let shouldInclude = false;

          switch (currencies) {
            case "custom":
              shouldInclude = allCurrencies.includes(currency.code);
              break;
            case "all":
              shouldInclude = !allCurrencies.includes(currency.code);
              break;
            default:
              shouldInclude = !allCurrencies.includes(currency.code);
          }

          if (shouldInclude) {
            // Special handling for Euro
            if (currency.code === "EUR") {
              currencyMap.set(currency.code, {
                code: currency.code,
                name: "Euro",
                symbol: currency.symbol,
                decimals: currency.decimals,
                number: currency.number,
              });
            } else {
              currencyMap.set(currency.code, {
                code: currency.code,
                name: currency.name,
                symbol: currency.symbol,
                decimals: currency.decimals,
                number: currency.number,
              });
            }
          }
        }
      });

      // Convert the map to an array and sort by currency name
      return Array.from(currencyMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }, [currencies]);

    const handleValueChange = (newValue: string) => {
      const fullCurrencyData = uniqueCurrencies.find(
        (curr) => curr.code === newValue,
      );
      if (fullCurrencyData) {
        setSelectedCurrency(fullCurrencyData);
        if (onValueChange) {
          onValueChange(newValue);
        }
        if (onCurrencySelect) {
          onCurrencySelect(fullCurrencyData);
        }
      }
    };

    void selectedCurrency;

    return (
      <Select
        value={value}
        onValueChange={handleValueChange}
        {...props}
        name={name}
        data-valid={valid}
      >
        <SelectTrigger
          className={cn("w-full", variant === "small" && "w-fit gap-2")}
          data-valid={valid}
          ref={ref}
        >
          {value && variant === "small" ? (
            <SelectValue placeholder={placeholder}>
              <span>{value}</span>
            </SelectValue>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent className="w-full" >
          <SelectGroup>
            <VirtualizedCurrencyList
              currencies={uniqueCurrencies}
              selectedValue={value}
            />
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  },
);

// Virtualized currency list component
const VirtualizedCurrencyList = React.memo<{
  currencies: Currency[];
  selectedValue: string | undefined;
}>(({ currencies, selectedValue }) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Separate selected currency from the list
  const selectedCurrency = selectedValue
    ? currencies.find((curr) => curr.code === selectedValue)
    : null;

  const nonSelectedCurrencies = currencies.filter(
    (curr) => curr.code !== selectedValue,
  );

  const virtualizer = useVirtualizer({
    count: nonSelectedCurrencies.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Estimated height of each currency item
    overscan: 5, // Number of items to render outside the visible area
  });
  return (
    <div
      ref={parentRef}
      className="max-h-[300px] overflow-auto w-full"
      style={{
        height: `${Math.min(currencies.length * 40, 300)}px`,
      }}
    >
      {/* Force render selected item at the top */}
      {selectedCurrency && (
        <div className="sticky top-0 z-10 bg-background border-b w-full">
          <SelectItem value={selectedCurrency.code || ""}>
            <div className="flex items-center w-full gap-2">
              <span className="text-sm text-muted-foreground w-8 text-left">
                {selectedCurrency.code}
              </span>
              <span className="hidden">{selectedCurrency.symbol}</span>
              <span>{selectedCurrency.name}</span>
            </div>
          </SelectItem>
        </div>
      )}

      {/* Virtualized list for non-selected items */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const currency = nonSelectedCurrencies[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <SelectItem value={currency?.code || ""}>
                <div className="flex items-center w-full gap-2">
                  <span className="text-sm text-muted-foreground w-8 text-left">
                    {currency?.code}
                  </span>
                  <span className="hidden">{currency?.symbol}</span>
                  <span>{currency?.name}</span>
                </div>
              </SelectItem>
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedCurrencyList.displayName = "VirtualizedCurrencyList";

CurrencySelect.displayName = "CurrencySelect";

export { CurrencySelect };
