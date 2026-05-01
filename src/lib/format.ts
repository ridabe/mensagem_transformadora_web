export function formatPtBrDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function truncateText(text: string, maxChars: number): string {
  const normalized = text.trim().replaceAll(/\s+/g, " ");
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1)}…`;
}

export type MinistryTitleValue = "pastor" | "diacono" | "bispo" | "apostolo" | "missionario" | "pregador" | "lider";

export function getMinistryTitleLabel(ministryTitle: unknown): string {
  const raw = typeof ministryTitle === "string" ? ministryTitle.trim() : "";
  if (!raw) return "";

  const normalized = raw
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const normalizedValue = normalized.replaceAll(/[^a-z]/g, "");

  if (normalizedValue === "pastor" || normalizedValue === "pr") return "Pr.";
  if (normalizedValue === "diacono") return "Diácono";
  if (normalizedValue === "bispo") return "Bispo";
  if (normalizedValue === "apostolo") return "Apóstolo";
  if (normalizedValue === "missionario") return "Missionário";
  if (normalizedValue === "pregador") return "Pregador";
  if (normalizedValue === "lider") return "Lider";

  if (raw === "Pr." || raw === "Diácono" || raw === "Bispo" || raw === "Apóstolo" || raw === "Missionário" || raw === "Pregador" || raw === "Lider")  {
    return raw;
  }

  return "";
}

export function formatLeaderDisplayName(ministryTitle: unknown, fullName: unknown): string {
  const name =
    typeof fullName === "string"
      ? fullName
          .trim()
          .replaceAll(/\s+/g, " ")
      : "";

  const title = getMinistryTitleLabel(ministryTitle);

  if (!title && !name) return "";
  if (!title) return name;
  if (!name) return title;
  return `${title} ${name}`;
}

