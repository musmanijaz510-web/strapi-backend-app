import type { Context } from "koa";

export default {
  async handle(ctx: Context) {
    const secret = process.env.SUPABASE_WEBHOOK_SECRET;
    const header = ctx.request.headers["x-webhook-secret"];
    if (!secret || header !== secret) {
      ctx.unauthorized("Invalid secret");
      return;
    }

    const body = (ctx.request.body as any) || {};
    const supabaseId = body?.id ?? body?.supabase_id ?? null;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description : null;
    const timestamp = body?.timestamp || new Date().toISOString();
    if (!title) {
      ctx.badRequest("Title required");
      return;
    }

    // Upsert by supabase_id to prevent loops/duplicates
    let existing: any[] = [];
    if (supabaseId) {
      const res = (await strapi.entityService.findMany("api::entry.entry", {
        filters: { supabase_id: supabaseId },
        limit: 1,
      } as any)) as any;
      existing = Array.isArray(res) ? res : res ? [res] : [];
    }

    let entry;
    if (existing && existing.length > 0) {
      entry = await strapi.entityService.update(
        "api::entry.entry",
        existing[0].id,
        { data: { title, description, timestamp, origin: "supabase" } } as any
      );
    } else {
      entry = await strapi.entityService.create("api::entry.entry", {
        data: {
          title,
          description,
          timestamp,
          supabase_id: supabaseId,
          origin: "supabase",
        },
      } as any);
    }

    ctx.body = { ok: true, id: entry?.id };
  },
};
