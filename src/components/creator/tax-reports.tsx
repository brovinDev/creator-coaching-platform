"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Period {
  year: number;
  month: number;
}

export function TaxReports({ periods }: { periods: Period[] }) {
  const years = [...new Set(periods.map((p) => p.year))];
  const [year, setYear] = useState(years[0]);
  const months = periods.filter((p) => p.year === year);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tax Reports</h1>
        {years.length > 0 && (
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Year"
            className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
      </div>

      {periods.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No tax reports yet"
          description="A report for a month appears here once you have a sale in it."
        />
      ) : (
        <Card>
          <div className="flex px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-400">
            <span className="flex-1">Month</span>
            <span>Action</span>
          </div>
          {months.map((p) => (
            <div key={p.month} className="flex items-center border-t border-gray-100 px-6 py-3 text-sm text-gray-800">
              <span className="flex-1">{MONTHS[p.month - 1]}</span>
              <a href={`/api/tax-reports?year=${p.year}&month=${p.month}`} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm" type="button" tabIndex={-1}>
                  Download Report
                </Button>
              </a>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
