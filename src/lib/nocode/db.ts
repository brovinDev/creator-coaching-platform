import {
  getData,
  getDataById,
  insertData,
  updateData,
  updateDataByWhere,
  deleteData,
  PaginatedData,
} from "./client";

// Module names (must match what's created in nocode backend)
export const MODULES = {
  courses: "courses",
  course_modules: "course_modules",
  lessons: "lessons",
  lesson_progress: "lesson_progress",
  enrollments: "enrollments",
  orders: "orders",
  landing_pages: "landing_pages",
  landing_page_sections: "landing_page_sections",
  communities: "communities",
  community_channels: "community_channels",
  community_posts: "community_posts",
  community_comments: "community_comments",
  email_otps: "email_otps",
  user_profiles: "user_profiles",
  services: "services",
  coupons: "coupons",
  service_email_templates: "service_email_templates",
  creator_email_settings: "creator_email_settings",
  creator_branding: "creator_branding",
  feed_posts: "feed_posts",
  feed_likes: "feed_likes",
  feed_replies: "feed_replies",
} as const;

type Row = Record<string, unknown>;

interface FindOptions {
  where?: Row;
  orderBy?: Row;
  take?: number;
  skip?: number;
  select?: string[];
}

function whereToQueryParams(where?: Row): Row {
  if (!where) return {};
  const params: Row = {};
  for (const [k, v] of Object.entries(where)) {
    if (v !== undefined && v !== null) params[k] = v;
  }
  return params;
}

function buildSortParams(orderBy?: Row): { sortBy?: string; sortOrder?: "ASC" | "DESC" } {
  if (!orderBy) return {};
  const key = Object.keys(orderBy)[0];
  if (!key) return {};
  const dir = (orderBy[key] as string)?.toUpperCase() === "DESC" ? "DESC" : "ASC";
  return { sortBy: key, sortOrder: dir as "ASC" | "DESC" };
}

export class NocodeModel {
  constructor(private moduleName: string) {}

  async findMany(opts: FindOptions = {}, token: string): Promise<Row[]> {
    const sort = buildSortParams(opts.orderBy);
    const filters = whereToQueryParams(opts.where);
    const params: Row = {
      ...filters,
      ...sort,
      ...(opts.take ? { limit: opts.take } : { noPagination: true }),
      ...(opts.skip ? { page: Math.floor(opts.skip / (opts.take || 10)) + 1 } : {}),
      ...(opts.select ? { columns: opts.select.join(",") } : {}),
    };
    const res = await getData(this.moduleName, params as Parameters<typeof getData>[1], token);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "rows" in data) return (data as PaginatedData).rows;
    return [];
  }

  async findUnique(where: Row, token: string): Promise<Row | null> {
    const rows = await this.findMany({ where, take: 1 }, token);
    return rows[0] || null;
  }

  async findFirst(where: Row, token: string): Promise<Row | null> {
    return this.findUnique(where, token);
  }

  async create(data: Row, token: string): Promise<Row> {
    const res = await insertData(this.moduleName, data, token);
    return (res.data as Row) || data;
  }

  async update(id: string, data: Row, token: string): Promise<Row> {
    const res = await updateData(this.moduleName, id, data, token);
    return (res.data as Row) || { id, ...data };
  }

  async updateWhere(where: Row, data: Row, token: string): Promise<Row> {
    const res = await updateDataByWhere(this.moduleName, where, data, token);
    return (res.data as Row) || data;
  }

  async delete(id: string, token: string): Promise<void> {
    await deleteData(this.moduleName, id, token);
  }

  async deleteWhere(where: Row, token: string): Promise<void> {
    const rows = await this.findMany({ where }, token);
    for (const row of rows) {
      if (row.id) await deleteData(this.moduleName, String(row.id), token);
    }
  }

  async count(where: Row = {}, token: string): Promise<number> {
    const res = await getData(
      this.moduleName,
      { ...whereToQueryParams(where), noPagination: true },
      token
    );
    const data = res.data as unknown;
    if (data && typeof data === "object" && "total" in data) return (data as PaginatedData).total;
    if (Array.isArray(data)) return (data as unknown[]).length;
    return 0;
  }
}

// Pre-built model instances
export const nocodeDb = {
  courses: new NocodeModel(MODULES.courses),
  courseModules: new NocodeModel(MODULES.course_modules),
  lessons: new NocodeModel(MODULES.lessons),
  lessonProgress: new NocodeModel(MODULES.lesson_progress),
  enrollments: new NocodeModel(MODULES.enrollments),
  orders: new NocodeModel(MODULES.orders),
  landingPages: new NocodeModel(MODULES.landing_pages),
  landingPageSections: new NocodeModel(MODULES.landing_page_sections),
  communities: new NocodeModel(MODULES.communities),
  communityChannels: new NocodeModel(MODULES.community_channels),
  communityPosts: new NocodeModel(MODULES.community_posts),
  communityComments: new NocodeModel(MODULES.community_comments),
  emailOtps: new NocodeModel(MODULES.email_otps),
  userProfiles: new NocodeModel(MODULES.user_profiles),
  services: new NocodeModel(MODULES.services),
  coupons: new NocodeModel(MODULES.coupons),
  serviceEmailTemplates: new NocodeModel(MODULES.service_email_templates),
  creatorEmailSettings: new NocodeModel(MODULES.creator_email_settings),
  creatorBranding: new NocodeModel(MODULES.creator_branding),
  feedPosts: new NocodeModel(MODULES.feed_posts),
  feedLikes: new NocodeModel(MODULES.feed_likes),
  feedComments: new NocodeModel(MODULES.feed_replies),
};
