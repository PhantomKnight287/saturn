import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "./calendar";

export default function DatePicker({
  onChange,
  value,
  disablePastDates = true,
  disableFutureDates = false,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disablePastDates?: boolean;
  disableFutureDates?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
          size="lg"
          type="button"
          variant="outline"
        >
          <CalendarIcon className="size-4" />
          {value ? format(value, "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          disabled={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (disablePastDates && date < today) return true;
            if (disableFutureDates && date > today) return true;
            return false;
          }}
          mode="single"
          onSelect={onChange}
          selected={value}
        />
      </PopoverContent>
    </Popover>
  );
}
