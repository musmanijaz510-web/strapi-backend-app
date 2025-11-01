export default {
  routes: [
    {
      method: "POST",
      path: "/supabase-webhook",
      handler: "supabase-webhook.handle",
      config: { auth: false },
    },
  ],
};
