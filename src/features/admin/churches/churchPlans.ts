export const ChurchPlanTypeValues = ["free", "basic", "pro", "business"] as const;
export type ChurchPlanType = (typeof ChurchPlanTypeValues)[number];

export const ChurchPlanStatusValues = ["inactive", "active", "suspended", "cancelled"] as const;
export type ChurchPlanStatus = (typeof ChurchPlanStatusValues)[number];

export type ChurchPlanStatusInfo = {
  plan_type: ChurchPlanType;
  plan_status: ChurchPlanStatus;
  business_enabled_at: string | null;
  business_notes: string | null;
};

export function isValidChurchPlanType(value: string): value is ChurchPlanType {
  return ChurchPlanTypeValues.includes(value as ChurchPlanType);
}

export function isValidChurchPlanStatus(value: string): value is ChurchPlanStatus {
  return ChurchPlanStatusValues.includes(value as ChurchPlanStatus);
}

export function validateChurchPlanTransition(
  current: { plan_type: ChurchPlanType; plan_status: ChurchPlanStatus },
  next: { plan_type: ChurchPlanType; plan_status: ChurchPlanStatus },
) {
  const wasBusiness = current.plan_type === "business";
  const willBusiness = next.plan_type === "business";
  const changedToBusiness = !wasBusiness && willBusiness;
  const changedStatus = current.plan_status !== next.plan_status;

  return {
    changedToBusiness,
    changedStatus,
    shouldConfirm:
      (changedToBusiness && ["active", "suspended", "cancelled"].includes(next.plan_status)) ||
      (wasBusiness && willBusiness && changedStatus && ["suspended", "cancelled"].includes(next.plan_status)),
  };
}
