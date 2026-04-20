export type AuditWorkEvent = {
  id: string;
  createdAt: string;
  lines: string[];
};

export type AuditWorkClientGroup = {
  clientId: string;
  clientName: string;
  /** اسم الشركة / المسؤول — للعرض في سجل العمل */
  company: string | null;
  events: AuditWorkEvent[];
};
