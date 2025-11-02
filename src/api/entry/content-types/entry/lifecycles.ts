export default {
  async beforeCreate(event) {
    const data = event?.params?.data || {};
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
      event.params.data = data;
    }
  },
  async afterCreate(event) {
    const { result } = event;
    const payload = {
      title: result?.title,
      description: result?.description ?? null,
      timestamp: result?.timestamp ?? new Date().toISOString(),
    };

    // Loop-prevention: if created from Supabase or already mapped, skip pushing back
    if (result?.origin === "supabase" || result?.supabase_id) {
      // Still trigger revalidation for Next if configured
      const nextRevalidateUrl = process.env.NEXT_REVALIDATE_URL;
      const revalidateSecret = process.env.REVALIDATE_SECRET;
      if (nextRevalidateUrl && revalidateSecret) {
        fetch(nextRevalidateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-revalidate-secret": revalidateSecret,
          },
          body: JSON.stringify({ path: "/" }),
        }).catch(() => {});
      }
      return;
    }

    const edgeUrl = process.env.SUPABASE_EDGE_FUNCTION_URL;
    const functionAuthKey =
      process.env.SUPABASE_FUNCTION_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (edgeUrl && payload.title) {
      // Fire-and-forget: send to Supabase Edge Function to insert
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (functionAuthKey) {
        headers["Authorization"] = `Bearer ${functionAuthKey}`;
        headers["apikey"] = functionAuthKey;
      }
      try {
        const resp = await fetch(edgeUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: payload.title,
            description: payload.description,
          }),
        });
        if (resp.ok) {
          const json = (await resp.json().catch(() => ({}))) as any;
          const supabaseId = json?.data?.id ?? null;
          if (supabaseId) {
            await strapi.entityService.update("api::entry.entry", result.id, {
              data: { supabase_id: String(supabaseId), origin: "strapi" },
            } as any);
          }
        }
      } catch (e) {
        // ignore errors here to avoid blocking Strapi
      }
    }

    const nextRevalidateUrl = process.env.NEXT_REVALIDATE_URL;
    const revalidateSecret = process.env.REVALIDATE_SECRET;
    if (nextRevalidateUrl && revalidateSecret) {
      // Fire-and-forget: trigger Next.js ISR revalidation
      fetch(nextRevalidateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-secret": revalidateSecret,
        },
        body: JSON.stringify({ path: "/" }),
      }).catch(() => {});
    }
  },
};
