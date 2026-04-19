import type { CustomFieldDefinition } from "@prisma/client";
import { ClientStatus, CustomFieldValueType } from "@prisma/client";
import { z } from "zod";

import type { ClassificationRow } from "@/lib/data/classifications";

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const optionalDecimalString = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d+(\.\d+)?$/, "أدخل رقماً صحيحاً")
    .optional()
);

const requiredDecimalString = z
  .string()
  .min(1, "عرض السعر مطلوب")
  .regex(/^\d+(\.\d+)?$/, "أدخل رقماً صحيحاً في عرض السعر");

function selectOptionsFromDef(def: CustomFieldDefinition): string[] {
  const raw = def.options;
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    "choices" in raw &&
    Array.isArray((raw as { choices: unknown }).choices)
  ) {
    return (raw as { choices: unknown[] }).choices.filter(
      (x): x is string => typeof x === "string"
    );
  }
  return [];
}

function zodForCustomField(def: CustomFieldDefinition): z.ZodTypeAny {
  const key = `cf_${def.key}` as `cf_${string}`;
  const label = def.labelAr;

  switch (def.valueType) {
    case CustomFieldValueType.BOOLEAN: {
      const base = z.preprocess(
        (v) =>
          v === "true" ? true : v === "false" ? false : v === "" ? undefined : v,
        z.boolean().optional()
      );
      return def.isRequired
        ? z.preprocess(
            (v) => (v === "" || v === undefined ? false : v),
            z.boolean({ required_error: `${label} مطلوب` })
          )
        : base;
    }
    case CustomFieldValueType.NUMBER: {
      const num = z.preprocess(
        emptyToUndefined,
        z
          .string()
          .min(1, `${label} مطلوب`)
          .regex(/^-?\d+(\.\d+)?$/, "أدخل رقماً صحيحاً")
      );
      const opt = z.preprocess(
        emptyToUndefined,
        z
          .string()
          .regex(/^-?\d+(\.\d+)?$/, "أدخل رقماً صحيحاً")
          .optional()
      );
      return def.isRequired ? num : opt;
    }
    case CustomFieldValueType.DATE: {
      const req = z.string().min(1, `${label} مطلوب`);
      const opt = z.preprocess(emptyToUndefined, z.string().optional());
      return def.isRequired ? req : opt;
    }
    case CustomFieldValueType.SELECT: {
      const opts = selectOptionsFromDef(def);
      const none = "__none__" as const;
      const preprocess = z.preprocess((v) => {
        if (v === none || v === "" || v === null || v === undefined)
          return undefined;
        return v;
      }, z.string().optional());
      if (opts.length === 0) {
        return def.isRequired
          ? z.string().min(1, `${label} مطلوب`)
          : preprocess;
      }
      const e = z.enum([opts[0], ...opts.slice(1)] as [string, ...string[]]);
      return def.isRequired
        ? e
        : z.preprocess((v) => {
            if (v === none || v === "" || v === null || v === undefined)
              return undefined;
            return v;
          }, e.optional());
    }
    default: {
      return def.isRequired
        ? z.string().min(1, `${label} مطلوب`)
        : z.string().optional();
    }
  }
}

export function buildAddClientFormSchema(
  defs: CustomFieldDefinition[],
  classifications: ClassificationRow[]
) {
  const customShape = Object.fromEntries(
    defs.map((d) => [`cf_${d.key}`, zodForCustomField(d)])
  ) as Record<string, z.ZodTypeAny>;

  const base = z
    .object({
      /** مرجع واجهة فقط — لا يُحفظ في العميل */
      documentDate: z.preprocess(emptyToUndefined, z.string().optional()),

      visitAppointmentScheduled: z.coerce.boolean(),
      visitAppointmentDate: z.preprocess(emptyToUndefined, z.string().optional()),

      name: z.string().min(1, "اسم العميل مطلوب"),
      phone: z.string().min(3, "رقم الهاتف مطلوب"),
      phone2: z.preprocess(emptyToUndefined, z.string().optional()),
      company: z.string().min(1, "اسم الشركة مطلوب"),
      position: z.string().min(1, "المسمى الوظيفي مطلوب"),
      address: z.string().min(1, "العنوان مطلوب"),

      initialCallDate: z.string().min(1, "تاريخ الاتصال مطلوب"),

      quotePrice: requiredDecimalString,
      quoteDetail: z.string().min(1, "بيان تفصيلي بالموديولات مطلوب"),
      allowedDiscount: optionalDecimalString,

      adPlatform: z.string().min(1, "المنصة الإعلانية مطلوبة"),
      sourceAdName: z.string().min(1, "اسم الإعلان مطلوب"),

      /** cls:<id> أو won أو lost — يُشتق منها Client.status */
      pipelineChoice: z.string().min(1, "اختر تصنيف العميل أو الحالة"),

      /** معرّف تصنيف فرعي (من ClientClassification) عندما يكون الأساسي ليس B */
      classificationSubId: z.preprocess(emptyToUndefined, z.string().optional()),

      qqAnswer: z.enum(["yes", "no"], {
        required_error: "يجب اختيار QQ (نعم أو لا)",
      }),

      callSummary: z.string().min(1, "ملخص المكالمة مطلوب"),
      salesNotes: z.string().min(1, "ملاحظات السيلز مطلوبة"),
      clientWarmingText: z.string().min(1, "أدوات الـ Warming مطلوبة"),

      presentingEmployeeName: z.preprocess(emptyToUndefined, z.string().optional()),

      /** تاريخ ومتابعة — بدون افتراضي؛ المستخدم ملزَم بالاختيار */
      nextFollowUpAt: z.string().min(1, "تاريخ المتابعة التالي مطلوب"),

      contractValue: optionalDecimalString,
      saleDate: z.preprocess(emptyToUndefined, z.string().optional()),
      lossReason: z.string().optional(),
      closedLostAt: z.preprocess(emptyToUndefined, z.string().optional()),
      ...customShape,
    })
    .superRefine((data, ctx) => {
      if (data.visitAppointmentScheduled) {
        if (!data.visitAppointmentDate?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "أدخل تاريخ الزيارة المحدد عند تفعيل «تم تحديد موعد»",
            path: ["visitAppointmentDate"],
          });
        }
      }

      const choice = data.pipelineChoice as string;
      if (choice.startsWith("cls:")) {
        const cid = choice.slice(4);
        const main = classifications.find((c) => c.id === cid);
        if (!main) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "تصنيف غير صالح.",
            path: ["pipelineChoice"],
          });
        }
      } else if (choice !== "won" && choice !== "lost") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "اختر تصنيفاً صالحاً.",
          path: ["pipelineChoice"],
        });
      }

      if (choice === "won") {
        if (!data.contractValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "قيمة التعاقد مطلوبة عند اختيار تم البيع",
            path: ["contractValue"],
          });
        }
        if (!data.saleDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "تاريخ البيع مطلوب",
            path: ["saleDate"],
          });
        }
      }
      if (choice === "lost") {
        if (!data.lossReason?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "سبب الإغلاق مطلوب",
            path: ["lossReason"],
          });
        }
        if (!data.closedLostAt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "تاريخ الإغلاق مطلوب",
            path: ["closedLostAt"],
          });
        }
      }
    });

  return base;
}

export type AddClientFormInput = z.infer<
  ReturnType<typeof buildAddClientFormSchema>
>;

export function defaultAddClientValues(
  defs: CustomFieldDefinition[]
): Record<string, unknown> {
  const custom: Record<string, unknown> = {};
  for (const d of defs) {
    const k = `cf_${d.key}`;
    if (d.valueType === CustomFieldValueType.BOOLEAN) {
      custom[k] = false;
    } else {
      custom[k] = "";
    }
  }
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const docDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const callDate = docDate;

  return {
    documentDate: docDate,
    visitAppointmentScheduled: false,
    visitAppointmentDate: "",
    name: "",
    phone: "",
    phone2: "",
    company: "",
    position: "",
    address: "",
    initialCallDate: callDate,
    quotePrice: "",
    quoteDetail: "",
    allowedDiscount: "",
    adPlatform: "",
    sourceAdName: "",
    pipelineChoice: "",
    classificationSubId: "",
    qqAnswer: undefined,
    callSummary: "",
    salesNotes: "",
    clientWarmingText: "",
    presentingEmployeeName: "",
    nextFollowUpAt: "",
    contractValue: "",
    saleDate: "",
    lossReason: "",
    closedLostAt: "",
    ...custom,
  };
}

export function extractCustomFieldsPayload(
  data: Record<string, unknown>,
  defs: CustomFieldDefinition[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of defs) {
    const k = `cf_${d.key}`;
    const raw = data[k];
    if (d.valueType === CustomFieldValueType.BOOLEAN) {
      if (raw === undefined) continue;
      out[d.key] = Boolean(raw);
      continue;
    }
    if (raw === "__none__") continue;
    if (raw === undefined || raw === "" || raw === null) continue;
    switch (d.valueType) {
      case CustomFieldValueType.NUMBER:
        out[d.key] = typeof raw === "number" ? raw : Number(raw);
        break;
      case CustomFieldValueType.DATE:
        out[d.key] = raw;
        break;
      default:
        out[d.key] = raw;
    }
  }
  return out;
}
