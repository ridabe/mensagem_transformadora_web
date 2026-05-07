export type SermonKeyPoint = {
  id: string;
  title: string;
  content: string;
  order: number;
};

export type PublishedSermon = {
  id: string;
  userId: string;
  localSermonId: string | null;
  userName: string;
  preacherName: string;
  churchId: string | null;
  churchName: string;
  sermonDate: string;
  sermonTime: string | null;
  sermonTitle: string;
  slug: string;
  mainVerse: string;
  secondaryVerses: string[];
  introduction: string | null;
  keyPoints: SermonKeyPoint[];
  highlightedPhrases: string[];
  personalObservations: string | null;
  practicalApplications: string | null;
  conclusion: string | null;
  finalSummary: string | null;
  visibility: "public" | "private";
  status: "draft" | "published" | "unpublished" | "archived";
  source: "android_app" | "web_admin" | "import";
  viewsCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicSermonsQuery = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export type PublicSermonsResult = {
  items: PublishedSermon[];
  page: number;
  pageSize: number;
  total: number;
};

