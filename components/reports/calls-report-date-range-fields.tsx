"use client";

import { useEffect, useState } from "react";

import { ArabicDateField } from "@/components/ui/arabic-date-field";

export function CallsReportDateRangeFields({
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
      <label className="flex flex-col gap-1">
        من تاريخ
        <ArabicDateField
          valueYmd={from}
          allowEmpty={false}
          onValueChange={setFrom}
          buttonClassName="h-9 justify-center font-semibold"
        />
      </label>
      <label className="flex flex-col gap-1">
        إلى تاريخ
        <ArabicDateField
          valueYmd={to}
          allowEmpty={false}
          onValueChange={setTo}
          buttonClassName="h-9 justify-center font-semibold"
        />
      </label>
    </>
  );
}
