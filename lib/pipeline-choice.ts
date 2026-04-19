import { ClientStatus } from "@prisma/client";

import type { ClassificationRow } from "@/lib/data/classifications";

export function resolvePipelineFields(
  pipelineChoice: string,
  _classificationSubId: string | undefined,
  classifications: ClassificationRow[]
): {
  status: ClientStatus;
  classificationId: string | null;
  notBClassification: string | null;
} {
  if (pipelineChoice === "won") {
    return {
      status: ClientStatus.WON,
      classificationId: null,
      notBClassification: null,
    };
  }
  if (pipelineChoice === "lost") {
    return {
      status: ClientStatus.LOST,
      classificationId: null,
      notBClassification: null,
    };
  }

  if (!pipelineChoice.startsWith("cls:")) {
    throw new Error("INVALID_PIPELINE");
  }

  const id = pipelineChoice.slice(4);
  const row = classifications.find((c) => c.id === id);
  if (!row) {
    throw new Error("INVALID_CLASSIFICATION");
  }

  if (row.isBRow) {
    return {
      status: ClientStatus.B,
      classificationId: id,
      notBClassification: null,
    };
  }

  return {
    status: ClientStatus.NOT_B,
    classificationId: id,
    /** التصنيف الفرعي أُزيل من الواجهة — يُعتمد على classificationId فقط */
    notBClassification: null,
  };
}
