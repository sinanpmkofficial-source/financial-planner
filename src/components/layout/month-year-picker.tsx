"use client";

import { useUIStore } from "@/stores/ui-store";
import { MONTHS } from "@/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthYearPicker() {
  const { selectedMonth, selectedYear, setMonthYear } = useUIStore();

  const handlePrev = () => {
    if (selectedMonth === 1) {
      setMonthYear(12, selectedYear - 1);
    } else {
      setMonthYear(selectedMonth - 1, selectedYear);
    }
  };

  const handleNext = () => {
    if (selectedMonth === 12) {
      setMonthYear(1, selectedYear + 1);
    } else {
      setMonthYear(selectedMonth + 1, selectedYear);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </span>
        <button
          onClick={handleNext}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <Select
          value={String(selectedMonth)}
          onValueChange={(v) => v && setMonthYear(Number(v), selectedYear)}
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => v && setMonthYear(selectedMonth, Number(v))}
        >
          <SelectTrigger className="h-8 text-xs w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 7 }, (_, i) => 2024 + i).map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
