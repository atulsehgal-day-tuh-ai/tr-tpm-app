"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export type Filters = {
  retailer: string;
  division: string;
  year: number;
};

const retailers = ["Publix", "Kroger"];
const divisionsByRetailer: Record<string, string[]> = {
  Publix: ["Atlanta Division", "Florida Division"],
  Kroger: ["Cincinnati Division", "Atlanta Division"],
};

const years = [2025, 2026, 2027, 2028];

export function FiltersBar({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
}) {
  const divisions = divisionsByRetailer[value.retailer] ?? [];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-muted-foreground">Retailer</div>
        <div className="w-[180px]">
          <Select
            value={value.retailer}
            onValueChange={(retailer) => {
              const nextDiv = (divisionsByRetailer[retailer] ?? [])[0] ?? "";
              onChange({ ...value, retailer, division: nextDiv });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select retailer" />
            </SelectTrigger>
            <SelectContent>
              {retailers.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator orientation="vertical" className="h-7" />

      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-muted-foreground">Division</div>
        <div className="w-[220px]">
          <Select
            value={value.division}
            onValueChange={(division) => onChange({ ...value, division })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select division" />
            </SelectTrigger>
            <SelectContent>
              {divisions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator orientation="vertical" className="h-7" />

      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-muted-foreground">Year</div>
        <div className="w-[120px]">
          <Select
            value={String(value.year)}
            onValueChange={(y) => onChange({ ...value, year: Number(y) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="ml-auto hidden text-xs text-muted-foreground md:block">
        4-4-5 fiscal periods • dense spreadsheet view
      </div>
    </div>
  );
}

