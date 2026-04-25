type SermonKeyPoint = { id?: string; title?: string; content?: string; order?: number };

export type UpsertSermonPayload = {
  localSermonId?: string | null;
  userName?: string;
  preacherName?: string;
  churchName?: string;
  sermonDate?: string;
  sermonTime?: string | null;
  sermonTitle?: string;
  mainVerse?: string;
  secondaryVerses?: unknown;
  introduction?: string | null;
  keyPoints?: unknown;
  highlightedPhrases?: unknown;
  personalObservations?: string | null;
  practicalApplications?: string | null;
  conclusion?: string | null;
  finalSummary?: string | null;
  visibility?: unknown;
  status?: unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
}

function normalizeKeyPoints(value: unknown): Array<{
  id: string;
  title: string;
  content: string;
  order: number;
}> {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const r = raw as SermonKeyPoint;
      const id = asTrimmedString(r.id) ?? "";
      const title = asTrimmedString(r.title) ?? "";
      const content = asTrimmedString(r.content) ?? "";
      const order = typeof r.order === "number" && Number.isFinite(r.order) ? r.order : 0;
      if (!title && !content) return null;
      return { id, title, content, order };
    })
    .filter((p): p is { id: string; title: string; content: string; order: number } => !!p)
    .sort((a, b) => a.order - b.order);
}

function normalizeVisibility(value: unknown): "public" | "private" | null {
  const v = asTrimmedString(value);
  if (!v) return null;
  if (v === "private") return "private";
  if (v === "public") return "public";
  return null;
}

function normalizeStatus(
  value: unknown,
): "draft" | "published" | "unpublished" | "archived" | null {
  const v = asTrimmedString(value);
  if (!v) return null;
  if (v === "draft") return "draft";
  if (v === "published") return "published";
  if (v === "unpublished") return "unpublished";
  if (v === "archived") return "archived";
  return null;
}

function getStringField(payload: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = asTrimmedString(payload[key]);
    if (v) return v;
  }
  return null;
}

function getNullableStringField(
  payload: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const raw = payload[key];
    if (raw === null) return null;
    const v = asTrimmedString(raw);
    if (v !== null) return v;
  }
  return null;
}

export function parseCreateSermonInput(body: unknown): {
  ok: true;
  data: Record<string, unknown>;
} | { ok: false; missing: string[] } {
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const userName = getStringField(payload, "userName", "user_name");
  const preacherName = getStringField(payload, "preacherName", "preacher_name");
  const churchName = getStringField(payload, "churchName", "church_name");
  const sermonDate = getStringField(payload, "sermonDate", "sermon_date");
  const sermonTitle = getStringField(payload, "sermonTitle", "sermon_title");
  const mainVerse = getStringField(payload, "mainVerse", "main_verse");

  const missing: string[] = [];
  if (!userName) missing.push("userName");
  if (!preacherName) missing.push("preacherName");
  if (!churchName) missing.push("churchName");
  if (!sermonDate) missing.push("sermonDate");
  if (!sermonTitle) missing.push("sermonTitle");
  if (!mainVerse) missing.push("mainVerse");

  if (missing.length) return { ok: false, missing };

  const localSermonId = getNullableStringField(payload, "localSermonId", "local_sermon_id");
  const sermonTime = getNullableStringField(payload, "sermonTime", "sermon_time");
  const introduction = getNullableStringField(payload, "introduction");
  const personalObservations = getNullableStringField(
    payload,
    "personalObservations",
    "personal_observations",
  );
  const practicalApplications = getNullableStringField(
    payload,
    "practicalApplications",
    "practical_applications",
  );
  const conclusion = getNullableStringField(payload, "conclusion");
  const finalSummary = getNullableStringField(payload, "finalSummary", "final_summary");

  const secondaryVerses = normalizeStringArray(payload.secondaryVerses ?? payload.secondary_verses);
  const highlightedPhrases = normalizeStringArray(
    payload.highlightedPhrases ?? payload.highlighted_phrases,
  );
  const keyPoints = normalizeKeyPoints(payload.keyPoints ?? payload.key_points);
  const visibility = normalizeVisibility(payload.visibility) ?? "public";
  const status = normalizeStatus(payload.status) ?? "published";

  return {
    ok: true,
    data: {
      local_sermon_id: localSermonId,
      user_name: userName,
      preacher_name: preacherName,
      church_name: churchName,
      sermon_date: sermonDate,
      sermon_time: sermonTime,
      sermon_title: sermonTitle,
      main_verse: mainVerse,
      secondary_verses: secondaryVerses,
      introduction,
      key_points: keyPoints,
      highlighted_phrases: highlightedPhrases,
      personal_observations: personalObservations,
      practical_applications: practicalApplications,
      conclusion,
      final_summary: finalSummary,
      visibility,
      status,
      source: "android_app",
    },
  };
}

export function parseUpdateSermonInput(body: unknown): Record<string, unknown> {
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const patch: Record<string, unknown> = {};

  const sermonTitle = getStringField(payload, "sermonTitle", "sermon_title");
  if (sermonTitle) patch.sermon_title = sermonTitle;

  const mainVerse = getStringField(payload, "mainVerse", "main_verse");
  if (mainVerse) patch.main_verse = mainVerse;

  const userName = getStringField(payload, "userName", "user_name");
  if (userName) patch.user_name = userName;

  const preacherName = getStringField(payload, "preacherName", "preacher_name");
  if (preacherName) patch.preacher_name = preacherName;

  const churchName = getStringField(payload, "churchName", "church_name");
  if (churchName) patch.church_name = churchName;

  const sermonDate = getStringField(payload, "sermonDate", "sermon_date");
  if (sermonDate) patch.sermon_date = sermonDate;

  if ("sermonTime" in payload || "sermon_time" in payload) {
    patch.sermon_time =
      getNullableStringField(payload, "sermonTime", "sermon_time") ?? null;
  }

  if ("introduction" in payload) {
    patch.introduction = getNullableStringField(payload, "introduction") ?? null;
  }

  if ("finalSummary" in payload || "final_summary" in payload) {
    patch.final_summary =
      getNullableStringField(payload, "finalSummary", "final_summary") ?? null;
  }

  if ("personalObservations" in payload || "personal_observations" in payload) {
    patch.personal_observations =
      getNullableStringField(payload, "personalObservations", "personal_observations") ??
      null;
  }

  if ("practicalApplications" in payload || "practical_applications" in payload) {
    patch.practical_applications =
      getNullableStringField(payload, "practicalApplications", "practical_applications") ??
      null;
  }

  if ("conclusion" in payload) {
    patch.conclusion = getNullableStringField(payload, "conclusion") ?? null;
  }

  if ("secondaryVerses" in payload || "secondary_verses" in payload) {
    patch.secondary_verses = normalizeStringArray(
      payload.secondaryVerses ?? payload.secondary_verses,
    );
  }

  if ("highlightedPhrases" in payload || "highlighted_phrases" in payload) {
    patch.highlighted_phrases = normalizeStringArray(
      payload.highlightedPhrases ?? payload.highlighted_phrases,
    );
  }

  if ("keyPoints" in payload || "key_points" in payload) {
    patch.key_points = normalizeKeyPoints(payload.keyPoints ?? payload.key_points);
  }

  const visibility = normalizeVisibility(payload.visibility);
  if (visibility) patch.visibility = visibility;

  const status = normalizeStatus(payload.status);
  if (status) patch.status = status;

  patch.source = "android_app";

  return patch;
}

