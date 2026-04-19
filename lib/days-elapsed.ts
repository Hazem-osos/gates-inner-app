import { differenceInCalendarDays } from "date-fns";

/** عدد الأيام بين تاريخ الاتصال الأول واليوم المرجعي */
export function daysElapsedSinceContact(
  initialCallDate: Date | null | undefined,
  reference: Date = new Date()
): number | null {
  if (!initialCallDate) return null;
  const d = differenceInCalendarDays(reference, initialCallDate);
  return d < 0 ? 0 : d;
}
