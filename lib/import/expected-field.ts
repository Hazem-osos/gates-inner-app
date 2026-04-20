export type ExpectedField = {
  key: string;
  label: string;
  required?: boolean;
  /** مرادفات وأشكال شائعة لعنوان العمود في ملفات Excel (عربي/إنجليزي). */
  aliases?: string[];
};
