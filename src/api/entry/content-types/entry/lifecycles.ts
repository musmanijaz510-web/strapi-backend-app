export default {
  async afterCreate(event) {
    const { result } = event;
    const payload = {
      title: result?.title,
      description: result?.description ?? null,
      timestamp: result?.timestamp ?? new Date().toISOString(),
    };

    const edgeUrl = process.env.SUPABASE_EDGE_FUNCTION_URL;
    if (edgeUrl && payload.title) {
      // Fire-and-forget: send to Supabase Edge Function to insert
      fetch(edgeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
        }),
      }).catch(() => {});
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
