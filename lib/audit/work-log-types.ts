export type AuditWorkEvent = {
  id: string;
  createdAt: string;
  lines: string[];
};

export type AuditWorkClientGroup = {
  clientId: string;
  clientName: string;
  phone: string;
  events: AuditWorkEvent[];
};
