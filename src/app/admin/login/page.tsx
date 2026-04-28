import { redirect } from "next/navigation";

type AdminLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getString(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const error = getString(sp, "error");
  const missing = getString(sp, "missing");

  const url = new URL("/login", "http://localhost");
  if (error) url.searchParams.set("error", error);
  if (missing) url.searchParams.set("missing", missing);
  redirect(`${url.pathname}${url.search}`);
}
