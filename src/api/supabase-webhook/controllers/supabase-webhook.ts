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
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description : null;
    const timestamp = body?.timestamp || new Date().toISOString();
    if (!title) {
      ctx.badRequest("Title required");
      return;
    }

    const entry = await strapi.entityService.create("api::entry.entry", {
      data: { title, description, timestamp },
    });

    ctx.body = { ok: true, id: entry?.id };
  },
};
