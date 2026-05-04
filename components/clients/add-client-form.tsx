"use client";

import type { CustomFieldDefinition } from "@prisma/client";
import { CustomFieldValueType } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import type { Resolver } from "react-hook-form";
import { Controller, useForm, useFormState } from "react-hook-form";

import { createClientAction } from "@/app/actions/clients";
import { updateClientAction } from "@/app/actions/client-update";
import { Button } from "@/components/ui/button";
import { ArabicDateField } from "@/components/ui/arabic-date-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateArabicLong } from "@/lib/date-arabic";
import type { ClassificationRow } from "@/lib/data/classifications";
import { sanitizeDisplayLabel } from "@/lib/display-text";
import {
  buildAddClientFormSchema,
  defaultAddClientValues,
} from "@/lib/validations/add-client";

function coreLabel(
  map: Record<string, string> | undefined,
  key: string,
  fallback: string
) {
  return map?.[key] ?? fallback;
}

type ClientFormEditCueContextValue = {
  enabled: boolean;
  dirtyFields: Partial<Readonly<Record<string, unknown>>>;
  savedFlash: ReadonlySet<string>;
};

const ClientFormEditCueContext =
  createContext<ClientFormEditCueContextValue | null>(null);

function useClientFormEditCue(trackId?: string): "pending" | "saved" | null {
  const ctx = useContext(ClientFormEditCueContext);
  if (!ctx?.enabled || !trackId) return null;
  const dirty = ctx.dirtyFields as Record<string, unknown>;
  const v = dirty[trackId];
  const isDirty =
    v === true ||
    (v != null && typeof v === "object" && Object.keys(v as object).length > 0);
  if (isDirty) return "pending";
  if (ctx.savedFlash.has(trackId)) return "saved";
  return null;
}

function flattenDirtyKeys(dirty: Record<string, unknown> | undefined): string[] {
  if (!dirty) return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(dirty)) {
    if (v === true) keys.push(k);
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const sub of flattenDirtyKeys(v as Record<string, unknown>)) {
        keys.push(`${k}.${sub}`);
      }
    }
  }
  return keys;
}

function labelForSavedField(
  key: string,
  coreLabels: Record<string, string> | undefined,
  defs: CustomFieldDefinition[]
): string {
  const base = key.includes(".") ? key.slice(0, key.indexOf(".")) : key;
  if (base.startsWith("cf_")) {
    const short = base.slice(3);
    const def = defs.find((d) => d.key === short);
    return def?.labelAr ?? base;
  }
  const fallbacks: Record<string, string> = {
    documentDate: "تاريخ اليوم",
    visitAppointmentScheduled: "تم تحديد موعد زيارة",
    visitAppointmentDate: "تاريخ الزيارة المحدد",
    name: "اسم العميل",
    phone: "رقم الهاتف",
    phone2: "رقم هاتف ثاني",
    company: "اسم الشركة",
    position: "المسمى الوظيفي",
    address: "العنوان",
    activity: "النشاط",
    initialCallDate: "تاريخ الاتصال",
    quotePrice: "عرض السعر",
    quoteDetail: "بيان تفصيلي بالموديولات",
    allowedDiscount: "الخصم المسموح",
    adPlatform: "المنصة الإعلانية",
    sourceAdName: "اسم الإعلان",
    pipelineChoice: "تصنيف العميل",
    classificationSubId: "التصنيف الفرعي",
    qqAnswer: "QQ",
    callSummary: "ملخص المكالمة",
    salesNotes: "ملاحظات السيلز",
    clientWarmingText: "أدوات الـ Warming",
    presentingEmployeeName: "موظف العرض",
    nextFollowUpAt: "تاريخ المتابعة التالي",
    contractValue: "قيمة التعاقد",
    saleDate: "تاريخ البيع",
    lossReason: "سبب الإغلاق",
    closedLostAt: "تاريخ الإغلاق",
  };
  return coreLabel(coreLabels, base, fallbacks[base] ?? base);
}

function EditCueInline({ trackId }: { trackId: string }) {
  const cue = useClientFormEditCue(trackId);
  if (cue === "pending") {
    return (
      <span
        className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
        title="لم يُحفَظ بعد"
      >
        بانتظار الحفظ
      </span>
    );
  }
  if (cue === "saved") {
    return (
      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
        ✓ تم الحفظ
      </span>
    );
  }
  return null;
}

type Props = {
  fieldDefinitions: CustomFieldDefinition[];
  classifications: ClassificationRow[];
  clientId?: string;
  initialValues?: Record<string, unknown>;
  coreLabels?: Record<string, string>;
  /** ربط مع ليد من تقرير الليدات — يُمرَّر لإجراء الإنشاء ويُحدَّث الليد بعد الحفظ */
  linkedNewLeadId?: string;
};

export function AddClientForm({
  fieldDefinitions,
  classifications,
  clientId,
  initialValues,
  coreLabels,
  linkedNewLeadId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savedId, setSavedId] = useState<string | null>(null);

  const schema = useMemo(
    () => buildAddClientFormSchema(fieldDefinitions, classifications),
    [fieldDefinitions, classifications]
  );

  const defaultValues = useMemo(
    () =>
      (initialValues ??
        defaultAddClientValues(fieldDefinitions)) as Record<string, unknown>,
    [fieldDefinitions, initialValues]
  );

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema) as unknown as Resolver<
      Record<string, unknown>
    >,
    defaultValues: defaultValues as Record<string, unknown>,
  });

  const { dirtyFields } = useFormState({ control: form.control });
  const [savedFlash, setSavedFlash] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (savedFlash.size === 0) return;
    const t = window.setTimeout(() => setSavedFlash(new Set()), 4500);
    return () => window.clearTimeout(t);
  }, [savedFlash]);

  const editCueValue = useMemo<ClientFormEditCueContextValue>(
    () =>
      clientId
        ? { enabled: true, dirtyFields, savedFlash }
        : { enabled: false, dirtyFields: {}, savedFlash: new Set() },
    [clientId, dirtyFields, savedFlash]
  );

  const pipelineChoice = (form.watch("pipelineChoice") as string) || "";
  const visitScheduled = Boolean(form.watch("visitAppointmentScheduled"));

  const pipelineChoiceDisplay = useMemo(() => {
    const m = new Map<string, { label: string; color: string }>();
    for (const c of classifications) {
      m.set(`cls:${c.id}`, {
        label: sanitizeDisplayLabel(c.label),
        color: c.color,
      });
    }
    return m;
  }, [classifications]);
  const docDateStr = form.watch("documentDate") as string | undefined;

  const docDatePreview = useMemo(() => {
    if (!docDateStr) return "";
    const d = new Date(docDateStr + "T12:00:00");
    return Number.isNaN(d.getTime()) ? "" : formatDateArabicLong(d);
  }, [docDateStr]);

  function onSubmit(values: Record<string, unknown>) {
    form.clearErrors("root");
    setSavedId(null);
    startTransition(async () => {
      if (clientId) {
        const res = await updateClientAction(clientId, values);
        if (res.ok) {
          const keys = flattenDirtyKeys(
            form.formState.dirtyFields as Record<string, unknown>
          );
          form.reset(values as Record<string, unknown>);
          setSavedFlash(new Set(keys));
          setSavedId(clientId);
          const labelList = keys.map((k) =>
            labelForSavedField(k, coreLabels, fieldDefinitions)
          );
          toast.success(
            keys.length > 0
              ? `تم الحفظ: ${labelList.join("، ")}`
              : "تم حفظ التعديلات"
          );
          router.refresh();
        } else {
          form.setError("root", { message: res.message });
        }
        return;
      }
      const payload = linkedNewLeadId
        ? { ...values, newLeadId: linkedNewLeadId }
        : values;
      const res = await createClientAction(payload);
      if (res.ok) {
        setSavedId(res.id);
        toast.success("تم إنشاء العميل");
        form.reset(defaultAddClientValues(fieldDefinitions));
        router.push(`/clients/${res.id}`);
      } else {
        form.setError("root", { message: res.message });
      }
    });
  }

  const req = true;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-1 border-b border-border/60 pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight md:text-xl">
          {clientId ? "تعديل بيانات العميل" : "البيانات"}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          الحقول ذات النجمة الحمراء مطلوبة وفق المواصفات.
        </CardDescription>
      </CardHeader>
      <ClientFormEditCueContext.Provider value={editCueValue}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
        <CardContent className="grid gap-6 pt-6">
          {savedId ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-100">
              {clientId ? "تم حفظ التعديلات بنجاح." : "تم الحفظ."}{" "}
              {!clientId ? (
                <span className="font-mono" dir="ltr">
                  {savedId}
                </span>
              ) : null}
            </p>
          ) : null}
          {form.formState.errors.root?.message ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          ) : null}

          <section className="grid gap-4 rounded-xl border-2 border-primary/30 bg-muted/30 p-4 md:grid-cols-2">
            <Field
              label="تاريخ اليوم"
              htmlFor="documentDate"
              trackId="documentDate"
              required={req}
              hint={
                docDatePreview
                  ? `عرض: ${docDatePreview}`
                  : "قيمة افتراضية: اليوم — يُعرض بالتقويم العربي للمراجعة"
              }
            >
              <Controller
                control={form.control}
                name="documentDate"
                render={({ field }) => (
                  <ArabicDateField
                    valueYmd={String(field.value ?? "")}
                    onValueChange={field.onChange}
                    allowEmpty={false}
                    compact
                    className="w-full max-w-[13.5rem]"
                    buttonClassName="h-8 w-full justify-center font-semibold"
                  />
                )}
              />
            </Field>
            <div className="flex flex-col gap-3 md:col-span-2">
              <Controller
                control={form.control}
                name="visitAppointmentScheduled"
                render={({ field }) => (
                  <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    تم تحديد موعد زيارة
                    <EditCueInline trackId="visitAppointmentScheduled" />
                  </label>
                )}
              />
              {visitScheduled ? (
                <Field
                  label="تاريخ الزيارة المحدد"
                  htmlFor="visitAppointmentDate"
                  trackId="visitAppointmentDate"
                  required
                  error={
                    form.formState.errors.visitAppointmentDate?.message as
                      | string
                      | undefined
                  }
                >
                  <Controller
                    control={form.control}
                    name="visitAppointmentDate"
                    render={({ field }) => (
                      <ArabicDateField
                        valueYmd={String(field.value ?? "")}
                        onValueChange={field.onChange}
                        allowEmpty={false}
                        compact
                        className="w-full max-w-[13.5rem]"
                        buttonClassName="h-8 w-full justify-center font-semibold"
                      />
                    )}
                  />
                </Field>
              ) : null}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Field
              label={coreLabel(coreLabels, "name", "اسم العميل")}
              htmlFor="name"
              trackId="name"
              required={req}
              error={form.formState.errors.name?.message}
            >
              <Input id="name" {...form.register("name")} dir="rtl" />
            </Field>
            <Field
              label={coreLabel(coreLabels, "phone", "رقم الهاتف")}
              htmlFor="phone"
              trackId="phone"
              required={req}
              error={form.formState.errors.phone?.message}
            >
              <Input id="phone" {...form.register("phone")} dir="ltr" />
            </Field>
            <Field
              label="رقم هاتف ثاني"
              htmlFor="phone2"
              trackId="phone2"
              hint="اختياري"
              error={form.formState.errors.phone2?.message}
            >
              <Input id="phone2" {...form.register("phone2")} dir="ltr" />
            </Field>
            <Field
              label={coreLabel(coreLabels, "company", "اسم الشركة")}
              htmlFor="company"
              trackId="company"
              required={req}
              error={form.formState.errors.company?.message}
            >
              <Input id="company" {...form.register("company")} dir="rtl" />
            </Field>
            <Field
              label={coreLabel(coreLabels, "position", "المسمى الوظيفي")}
              htmlFor="position"
              trackId="position"
              required={req}
              error={form.formState.errors.position?.message}
            >
              <Input id="position" {...form.register("position")} dir="rtl" />
            </Field>
            <Field
              label={coreLabel(coreLabels, "address", "العنوان")}
              htmlFor="address"
              trackId="address"
              required={req}
              className="md:col-span-2"
              error={form.formState.errors.address?.message}
            >
              <Input id="address" {...form.register("address")} dir="rtl" />
            </Field>
            <Field
              label={coreLabel(coreLabels, "activity", "النشاط")}
              htmlFor="activity"
              trackId="activity"
              required={req}
              className="md:col-span-2"
              error={form.formState.errors.activity?.message as string | undefined}
            >
              <Input id="activity" {...form.register("activity")} dir="rtl" />
            </Field>
            <Field
              label={coreLabel(
                coreLabels,
                "initialCallDate",
                "تاريخ الاتصال"
              )}
              htmlFor="initialCallDate"
              trackId="initialCallDate"
              required={req}
              error={
                form.formState.errors.initialCallDate?.message as
                  | string
                  | undefined
              }
            >
              <Controller
                control={form.control}
                name="initialCallDate"
                render={({ field }) => (
                  <ArabicDateField
                    valueYmd={String(field.value ?? "")}
                    onValueChange={field.onChange}
                    allowEmpty={false}
                    compact
                    className="w-full max-w-[13.5rem]"
                    buttonClassName="h-8 w-full justify-center font-semibold"
                  />
                )}
              />
            </Field>
            <Field
              label={coreLabel(coreLabels, "quotePrice", "عرض السعر")}
              htmlFor="quotePrice"
              trackId="quotePrice"
              hint="اختياري — غير مرتبط بتصنيف العميل (يمكن تركه فارغاً أو صفراً مع أي تصنيف)"
              error={form.formState.errors.quotePrice?.message as string | undefined}
            >
              <Input
                id="quotePrice"
                inputMode="decimal"
                {...form.register("quotePrice")}
                dir="ltr"
                className="text-left"
              />
            </Field>
            <Field
              label="بيان تفصيلي بالموديولات"
              htmlFor="quoteDetail"
              trackId="quoteDetail"
              hint="اختياري — مستقل عن تصنيف العميل"
              className="md:col-span-2"
              error={form.formState.errors.quoteDetail?.message as string | undefined}
            >
              <Textarea
                id="quoteDetail"
                rows={3}
                {...form.register("quoteDetail")}
                dir="rtl"
              />
            </Field>
            <Field
              label={coreLabel(coreLabels, "allowedDiscount", "الخصم المسموح")}
              htmlFor="allowedDiscount"
              trackId="allowedDiscount"
              hint="اختياري"
              error={
                form.formState.errors.allowedDiscount?.message as
                  | string
                  | undefined
              }
            >
              <Input
                id="allowedDiscount"
                inputMode="decimal"
                {...form.register("allowedDiscount")}
                dir="ltr"
                className="text-left"
              />
            </Field>
            <Field
              label="المنصة الإعلانية"
              htmlFor="adPlatform"
              trackId="adPlatform"
              required={req}
              error={form.formState.errors.adPlatform?.message as string | undefined}
            >
              <Input id="adPlatform" {...form.register("adPlatform")} dir="rtl" />
            </Field>
            <Field
              label={coreLabel(coreLabels, "sourceAdName", "اسم الإعلان")}
              htmlFor="sourceAdName"
              trackId="sourceAdName"
              required={req}
              error={form.formState.errors.sourceAdName?.message}
            >
              <Input id="sourceAdName" {...form.register("sourceAdName")} dir="rtl" />
            </Field>
            <Field
              label={coreLabel(coreLabels, "status", "تصنيف العميل")}
              htmlFor="pipelineChoice"
              trackId="pipelineChoice"
              required={req}
              error={
                form.formState.errors.pipelineChoice?.message as
                  | string
                  | undefined
              }
            >
              <Controller
                control={form.control}
                name="pipelineChoice"
                render={({ field }) => (
                  <Select
                    value={(field.value as string) || ""}
                    onValueChange={(v) => {
                      field.onChange(v);
                    }}
                  >
                    <SelectTrigger
                      id="pipelineChoice"
                      className="w-full min-w-0"
                      dir="rtl"
                    >
                      <SelectValue placeholder="اختر التصنيف">
                        {(v) => {
                          if (v == null || v === "") {
                            return "اختر التصنيف";
                          }
                          if (v === "won") {
                            return <span dir="rtl">تم البيع</span>;
                          }
                          if (v === "lost") {
                            return <span dir="rtl">تم الإغلاق</span>;
                          }
                          const row = pipelineChoiceDisplay.get(String(v));
                          if (!row) {
                            return (
                              <bdi>{sanitizeDisplayLabel(String(v))}</bdi>
                            );
                          }
                          return (
                            <span
                              className="flex min-w-0 flex-1 items-center gap-1.5"
                              dir="rtl"
                            >
                              <span
                                className="inline-block size-3 shrink-0 rounded-sm border border-border"
                                style={{ backgroundColor: row.color }}
                                aria-hidden
                              />
                              <bdi className="min-w-0 truncate">
                                {row.label}
                              </bdi>
                            </span>
                          );
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {classifications.map((c) => {
                        const lab = sanitizeDisplayLabel(c.label);
                        return (
                        <SelectItem
                          key={c.id}
                          value={`cls:${c.id}`}
                          label={lab}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="inline-block size-3 shrink-0 rounded-sm border border-border"
                              style={{ backgroundColor: c.color }}
                              aria-hidden
                            />
                            <bdi className="min-w-0 truncate">{lab}</bdi>
                          </span>
                        </SelectItem>
                      )})}
                      {pipelineChoice === "won" || pipelineChoice === "lost" ? (
                        <>
                          <SelectItem value="won" label="تم البيع">
                            تم البيع
                          </SelectItem>
                          <SelectItem value="lost" label="تم الإغلاق">
                            تم الإغلاق
                          </SelectItem>
                        </>
                      ) : null}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              label="QQ"
              htmlFor="qq-yes"
              trackId="qqAnswer"
              required={req}
              className="md:col-span-2"
              error={form.formState.errors.qqAnswer?.message as string | undefined}
            >
              <Controller
                control={form.control}
                name="qqAnswer"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-6" role="radiogroup">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        id="qq-yes"
                        type="radio"
                        name="qqAnswer"
                        value="yes"
                        checked={field.value === "yes"}
                        onChange={() => field.onChange("yes")}
                        className="size-4 accent-primary"
                      />
                      نعم
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        id="qq-no"
                        type="radio"
                        name="qqAnswer"
                        value="no"
                        checked={field.value === "no"}
                        onChange={() => field.onChange("no")}
                        className="size-4 accent-primary"
                      />
                      لا
                    </label>
                  </div>
                )}
              />
            </Field>

            <Field
              label="ملخص المكالمة"
              htmlFor="callSummary"
              trackId="callSummary"
              required={req}
              className="md:col-span-2"
              error={form.formState.errors.callSummary?.message as string | undefined}
            >
              <Textarea
                id="callSummary"
                rows={4}
                {...form.register("callSummary")}
                dir="rtl"
              />
            </Field>
            <Field
              label="ملاحظات السيلز"
              htmlFor="salesNotes"
              trackId="salesNotes"
              required={req}
              className="md:col-span-2"
              error={form.formState.errors.salesNotes?.message as string | undefined}
            >
              <Textarea
                id="salesNotes"
                rows={3}
                {...form.register("salesNotes")}
                dir="rtl"
              />
            </Field>
            <Field
              label="أدوات الـ Warming"
              htmlFor="clientWarmingText"
              trackId="clientWarmingText"
              required={req}
              className="md:col-span-2"
              error={
                form.formState.errors.clientWarmingText?.message as string | undefined
              }
            >
              <Textarea
                id="clientWarmingText"
                rows={4}
                {...form.register("clientWarmingText")}
                dir="rtl"
              />
            </Field>

            <Field
              label={coreLabel(
                coreLabels,
                "nextFollowUpAt",
                "تاريخ المتابعة التالي"
              )}
              htmlFor="nextFollowUpAt"
              trackId="nextFollowUpAt"
              required={req}
              hint="بدون قيمة افتراضية — يجب اختيار تاريخ صريح"
              className="md:col-span-2"
              error={
                form.formState.errors.nextFollowUpAt?.message as string | undefined
              }
            >
              <Controller
                control={form.control}
                name="nextFollowUpAt"
                render={({ field }) => (
                  <ArabicDateField
                    valueYmd={String(field.value ?? "")}
                    onValueChange={field.onChange}
                    allowEmpty={false}
                    compact
                    className="w-full max-w-[13.5rem]"
                    buttonClassName="h-8 w-full justify-center font-semibold"
                  />
                )}
              />
            </Field>

            <Field
              label="موظف العرض"
              htmlFor="presentingEmployeeName"
              trackId="presentingEmployeeName"
              hint="اختياري — يُكمل لاحقاً من التقارير"
              error={
                form.formState.errors.presentingEmployeeName?.message as
                  | string
                  | undefined
              }
            >
              <Input
                id="presentingEmployeeName"
                {...form.register("presentingEmployeeName")}
                dir="rtl"
              />
            </Field>
          </section>

          {pipelineChoice === "won" ? (
            <section className="grid gap-4 rounded-xl border border-border/70 bg-muted/30 p-4 md:grid-cols-2">
              <p className="md:col-span-2 text-sm font-medium text-foreground">
                بيانات إتمام البيع
              </p>
              <Field
                label={coreLabel(coreLabels, "contractValue", "قيمة التعاقد")}
                htmlFor="contractValue"
                trackId="contractValue"
                required={req}
                error={
                  form.formState.errors.contractValue?.message as
                    | string
                    | undefined
                }
              >
                <Input
                  id="contractValue"
                  inputMode="decimal"
                  {...form.register("contractValue")}
                  dir="ltr"
                  className="text-left"
                />
              </Field>
              <Field
                label={coreLabel(coreLabels, "saleDate", "تاريخ البيع")}
                htmlFor="saleDate"
                trackId="saleDate"
                required={req}
                error={
                  form.formState.errors.saleDate?.message as string | undefined
                }
              >
                <Controller
                  control={form.control}
                  name="saleDate"
                  render={({ field }) => (
                    <ArabicDateField
                      valueYmd={String(field.value ?? "")}
                      onValueChange={field.onChange}
                      allowEmpty={false}
                      compact
                      className="w-full max-w-[13.5rem]"
                      buttonClassName="h-8 w-full justify-center font-semibold"
                    />
                  )}
                />
              </Field>
            </section>
          ) : null}

          {pipelineChoice === "lost" ? (
            <section className="grid gap-4 rounded-xl border border-border/70 bg-muted/30 p-4 md:grid-cols-2">
              <p className="md:col-span-2 text-sm font-medium text-foreground">
                بيانات الإغلاق
              </p>
              <Field
                label={coreLabel(coreLabels, "lossReason", "سبب الإغلاق")}
                htmlFor="lossReason"
                trackId="lossReason"
                required={req}
                className="md:col-span-2"
                error={form.formState.errors.lossReason?.message}
              >
                <Textarea
                  id="lossReason"
                  rows={3}
                  {...form.register("lossReason")}
                  dir="rtl"
                />
              </Field>
              <Field
                label={coreLabel(coreLabels, "closedLostAt", "تاريخ الإغلاق")}
                htmlFor="closedLostAt"
                trackId="closedLostAt"
                required={req}
                error={
                  form.formState.errors.closedLostAt?.message as
                    | string
                    | undefined
                }
              >
                <Controller
                  control={form.control}
                  name="closedLostAt"
                  render={({ field }) => (
                    <ArabicDateField
                      valueYmd={String(field.value ?? "")}
                      onValueChange={field.onChange}
                      allowEmpty={false}
                      compact
                      className="w-full max-w-[13.5rem]"
                      buttonClassName="h-8 w-full justify-center font-semibold"
                    />
                  )}
                />
              </Field>
            </section>
          ) : null}

          {fieldDefinitions.length > 0 ? (
            <section className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">حقول مخصصة</h3>
                <p className="text-sm text-muted-foreground">
                  تظهر تلقائياً بناءً على إعدادات المسؤول.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {fieldDefinitions.map((def) => (
                  <DynamicField
                    key={def.id}
                    def={def}
                    control={form.control}
                    register={form.register}
                    error={
                      (form.formState.errors as Record<string, { message?: string }>)[
                        `cf_${def.key}`
                      ]?.message
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSavedId(null);
              setSavedFlash(new Set());
              form.clearErrors("root");
              form.reset(
                (clientId && initialValues
                  ? initialValues
                  : defaultAddClientValues(fieldDefinitions)) as Record<
                  string,
                  unknown
                >
              );
            }}
            disabled={pending}
          >
            مسح الحقول
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "جاري الحفظ…" : "حفظ العميل"}
          </Button>
        </CardFooter>
      </form>
      </ClientFormEditCueContext.Provider>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  trackId,
  children,
  hint,
  error,
  className,
  required,
}: {
  label: string;
  htmlFor: string;
  trackId?: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  className?: string;
  required?: boolean;
}) {
  const cue = useClientFormEditCue(trackId);
  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      <Label
        htmlFor={htmlFor}
        className="inline-flex w-full flex-wrap items-center gap-x-2 gap-y-1"
      >
        {required ? (
          <span className="font-semibold text-destructive" aria-hidden>
            *
          </span>
        ) : null}{" "}
        <span className="min-w-0 shrink">{label}</span>
        {cue === "pending" ? (
          <span
            className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
            title="لم يُحفَظ بعد"
          >
            بانتظار الحفظ
          </span>
        ) : null}
        {cue === "saved" ? (
          <span className="shrink-0 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            ✓ تم الحفظ
          </span>
        ) : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function DynamicField({
  def,
  control,
  register,
  error,
}: {
  def: CustomFieldDefinition;
  control: ReturnType<typeof useForm<Record<string, unknown>>>["control"];
  register: ReturnType<typeof useForm<Record<string, unknown>>>["register"];
  error?: string;
}) {
  const name = `cf_${def.key}`;

  if (def.valueType === CustomFieldValueType.BOOLEAN) {
    return (
      <Field
        label={def.labelAr}
        htmlFor={name}
        trackId={name}
        required={def.isRequired}
        error={error}
      >
        <Controller
          control={control}
          name={name as never}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <input
                id={name}
                type="checkbox"
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
                className="size-4 rounded border border-input accent-primary"
              />
              <span>نعم</span>
            </label>
          )}
        />
      </Field>
    );
  }

  if (def.valueType === CustomFieldValueType.SELECT) {
    const raw = def.options;
    const opts: string[] = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string")
      : [];
    const none = "__none__";

    return (
      <Field
        label={def.labelAr}
        htmlFor={name}
        trackId={name}
        required={def.isRequired}
        error={error}
      >
        <Controller
          control={control}
          name={name as never}
          render={({ field }) => {
            const v =
              field.value === "" || field.value === undefined || field.value === null
                ? none
                : String(field.value);
            return (
              <Select
                value={v}
                onValueChange={(nv) =>
                  field.onChange(nv === none ? "" : nv)
                }
              >
                <SelectTrigger id={name} className="w-full min-w-0">
                  <SelectValue placeholder={def.isRequired ? "اختر قيمة" : "اختياري"} />
                </SelectTrigger>
                <SelectContent>
                  {!def.isRequired ? (
                    <SelectItem value={none} label="— بدون —">
                      — بدون —
                    </SelectItem>
                  ) : null}
                  {opts.map((o) => (
                    <SelectItem key={o} value={o} label={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        />
      </Field>
    );
  }

  if (def.valueType === CustomFieldValueType.DATE) {
    return (
      <Field
        label={def.labelAr}
        htmlFor={name}
        trackId={name}
        required={def.isRequired}
        error={error}
      >
        <Controller
          control={control}
          name={name as never}
          render={({ field }) => (
            <ArabicDateField
              valueYmd={((field.value as string) ?? "").trim()}
              onValueChange={(v) => field.onChange(v)}
              allowEmpty={!def.isRequired}
              compact
              className="w-full max-w-[13.5rem]"
              buttonClassName="h-8 w-full justify-center font-semibold"
            />
          )}
        />
      </Field>
    );
  }

  if (def.valueType === CustomFieldValueType.NUMBER) {
    return (
      <Field
        label={def.labelAr}
        htmlFor={name}
        trackId={name}
        required={def.isRequired}
        error={error}
      >
        <Input
          id={name}
          inputMode="decimal"
          {...register(name as never)}
          dir="ltr"
          className="text-left"
        />
      </Field>
    );
  }

  return (
    <Field
      label={def.labelAr + (!def.isRequired ? " (اختياري)" : "")}
      htmlFor={name}
      trackId={name}
      required={def.isRequired}
      error={error}
    >
      <Input id={name} {...register(name as never)} dir="rtl" />
    </Field>
  );
}
