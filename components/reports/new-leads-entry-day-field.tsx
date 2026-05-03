"use client";

import { useEffect, useState } from "react";

import { ArabicDateField } from "@/components/ui/arabic-date-field";

export function NewLeadsEntryDayField({ defaultYmd }: { defaultYmd: string }) {
  const [date, setDate] = useState(defaultYmd);
  useEffect(() => {
    setDate(defaultYmd);
  }, [defaultYmd]);

  return (
    <>
      <input type="hidden" name="date" value={date} />
      <label className="flex flex-col gap-1">
        يوم العمل
        <ArabicDateField
          valueYmd={date}
          allowEmpty={false}
          onValueChange={setDate}
          buttonClassName="h-9 min-w-[11rem] justify-center font-semibold"
        />
      </label>
    </>
  );
}
