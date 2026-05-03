"use client";

import { useEffect, useState } from "react";

import { ArabicDateField } from "@/components/ui/arabic-date-field";

export function WonReportContractDateFields({
  defaultFrom,
  defaultTo,
}: {
  defaultFrom: string;
  defaultTo: string;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  useEffect(() => {
    setFrom(defaultFrom);
  }, [defaultFrom]);
  useEffect(() => {
    setTo(defaultTo);
  }, [defaultTo]);

  return (
    <>
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="to" value={to} />
      <div>
        <label className="text-xs text-muted-foreground">
          من (تاريخ التعاقد)
        </label>
        <div className="mt-0.5 min-w-[10rem]">
          <ArabicDateField
            valueYmd={from}
            onValueChange={setFrom}
            buttonClassName="h-9 w-full justify-center font-semibold shadow-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">إلى</label>
        <div className="mt-0.5 min-w-[10rem]">
          <ArabicDateField
            valueYmd={to}
            onValueChange={setTo}
            buttonClassName="h-9 w-full justify-center font-semibold shadow-sm"
          />
        </div>
      </div>
    </>
  );
}
