import type { TicketPriority, TicketStatus } from "@prisma/client";

export function ticketStatusLabelAr(s: TicketStatus): string {
  switch (s) {
    case "OPEN":
      return "مفتوحة";
    case "IN_PROGRESS":
      return "قيد المعالجة";
    case "CLOSED":
      return "مغلقة";
    default:
      return s;
  }
}

export function ticketPriorityLabelAr(p: TicketPriority): string {
  switch (p) {
    case "LOW":
      return "منخفضة";
    case "MEDIUM":
      return "متوسطة";
    case "HIGH":
      return "عالية";
    case "URGENT":
      return "عاجلة";
    default:
      return p;
  }
}
