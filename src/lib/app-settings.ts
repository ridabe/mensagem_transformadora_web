import { createServiceRoleClient } from "@/lib/supabase/server";

export type AppSettingKey = "ai_generation_free_enabled";

export async function getAppSetting(key: AppSettingKey): Promise<string | null> {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle<{ value: string }>();
  return data?.value ?? null;
}

export async function setAppSetting(key: AppSettingKey, value: string): Promise<void> {
  const service = createServiceRoleClient();
  await service
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

export async function isAiGenerationEnabledForFree(): Promise<boolean> {
  const value = await getAppSetting("ai_generation_free_enabled");
  return value !== "false";
}
