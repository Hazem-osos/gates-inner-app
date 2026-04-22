export type AuditWorkEvent = {
  id: string;
  createdAt: string;
  lines: string[];
};

export type AuditWorkClientGroup = {
  clientId: string;
  clientName: string;
  /** مندوب المبيعات المسند إليه العميل */
  assignedSalesName: string | null;
  /** اسم الشركة / المسؤول — للعرض في سجل العمل */
  company: string | null;
  events: AuditWorkEvent[];
};
