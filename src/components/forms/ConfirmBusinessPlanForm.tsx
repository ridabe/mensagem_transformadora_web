"use client";

import { FormEvent, FormHTMLAttributes, PropsWithChildren, useRef } from "react";
import {
  isValidChurchPlanStatus,
  isValidChurchPlanType,
  validateChurchPlanTransition,
} from "@/features/admin/churches/churchPlans";

interface ConfirmBusinessPlanFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "action"> {
  action: (formData: FormData) => void | Promise<void>;
  initialPlanType: string;
  initialPlanStatus: string;
}

export default function ConfirmBusinessPlanForm({
  action,
  initialPlanType,
  initialPlanStatus,
  children,
  ...props
}: PropsWithChildren<ConfirmBusinessPlanFormProps>) {
  const formRef = useRef<HTMLFormElement | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    const planTypeRaw = String(formData.get("plan_type") ?? "");
    const planStatusRaw = String(formData.get("plan_status") ?? "");

    if (!isValidChurchPlanType(planTypeRaw) || !isValidChurchPlanStatus(planStatusRaw)) {
      return;
    }

    if (!isValidChurchPlanType(initialPlanType) || !isValidChurchPlanStatus(initialPlanStatus)) {
      return;
    }

    const transition = validateChurchPlanTransition(
      { plan_type: initialPlanType, plan_status: initialPlanStatus },
      { plan_type: planTypeRaw, plan_status: planStatusRaw },
    );

    const needsConfirmation = transition.shouldConfirm;

    if (needsConfirmation) {
      const confirmed = window.confirm(
        "Essa alteração muda o status comercial da igreja, mas ainda não altera permissões do sistema nesta etapa. Deseja continuar?",
      );
      if (!confirmed) {
        event.preventDefault();
      }
    }
  };

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
}
