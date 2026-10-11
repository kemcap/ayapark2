import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigin = "https://kemcap.github.io";
const portalUrl = "https://kemcap.github.io/ayapark2/site-yonetim/sakin/";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};
function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  const origin = req.headers.get("Origin");
  if (origin && origin !== allowedOrigin) return respond({ error: "Forbidden origin" }, 403);
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get("Authorization") || "")?.[1];
  if (!token) return respond({ error: "Giriş yapılması gerekiyor." }, 401);
  const projectUrl = Deno.env.get("SUPABASE_URL") || "";
  const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default;
  if (!projectUrl || !adminKey) return respond({ error: "Sunucu yapılandırması eksik." }, 503);
  const admin = createClient(projectUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  try {
    const { data: verified, error: authError } = await admin.auth.getUser(token);
    if (authError || !verified.user) return respond({ error: "Geçersiz oturum." }, 401);
    const body = await req.json().catch(() => ({}));
    const linkId = typeof body?.unit_person_link_id === "string" ? body.unit_person_link_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(linkId)) return respond({ error: "Geçersiz kişi kaydı." }, 400);

    const { data: link, error: linkError } = await admin
      .from("site_unit_people").select("id,site_id,unit_id,person_id,relation,is_current")
      .eq("id", linkId).maybeSingle();
    if (linkError) throw linkError;
    if (!link || !link.is_current || !["owner", "tenant"].includes(link.relation))
      return respond({ error: "Aktif kat maliki veya kiracı kaydı bulunamadı." }, 400);

    const { data: permission, error: permError } = await admin
      .from("site_staff_memberships").select("role")
      .eq("site_id", link.site_id).eq("user_id", verified.user.id)
      .in("role", ["manager", "deputy"]).maybeSingle();
    if (permError) throw permError;
    if (!permission) return respond({ error: "Davet gönderme yetkiniz yok." }, 403);

    const { data: person, error: personError } = await admin
      .from("site_people").select("id,site_id,full_name,email")
      .eq("id", link.person_id).eq("site_id", link.site_id).maybeSingle();
    if (personError) throw personError;
    if (!person) return respond({ error: "Kişi bulunamadı." }, 404);
    const email = String(person.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return respond({ error: "Önce kişiye geçerli bir e-posta adresi ekleyin." }, 400);

    // Avoid granting the same person access to a different account inadvertently.
    const { data: current, error: currentError } = await admin
      .from("site_resident_units")
      .select("user_id,active").eq("unit_id", link.unit_id)
      .eq("person_id", person.id).maybeSingle();
    if (currentError) throw currentError;
    if (current?.active) return respond({ mode: "already", message: "Bu kişi için portal erişimi zaten tanımlı." });

    let userId = "";
    let wasInvited = false;
    // Existing Supabase Auth accounts can be linked if their email was verified.
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const match = (data.users || []).find(u => u.email?.trim().toLowerCase() === email);
      if (match) {
        if (!match.email_confirmed_at)
          return respond({ error: "Bu e-posta için mevcut hesap doğrulanmamış. E-posta doğrulamasını tamamlayın." }, 409);
        userId = match.id;
        break;
      }
      if ((data.users || []).length < 200) break;
    }
    if (!userId) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: portalUrl });
      if (error || !data.user) return respond({
        error: "Davet e-postası gönderilemedi. Supabase e-posta ayarlarını ve yönlendirme adreslerini kontrol edin."
      }, 502);
      userId = data.user.id;
      wasInvited = true;
    }
    const record = {
      unit_id: link.unit_id, user_id: userId, role: link.relation, person_id: person.id, active: true
    };
    let writeError;
    if (current) {
      const response = await admin.from("site_resident_units").update(record)
        .eq("unit_id", link.unit_id).eq("person_id", person.id);
      writeError = response.error;
    } else {
      const response = await admin.from("site_resident_units").insert(record);
      writeError = response.error;
    }
    if (writeError) throw writeError;
    return respond({
      mode: wasInvited ? "invited" : "linked",
      message: wasInvited ? "Davet e-postası gönderildi; daire erişimi tanımlandı." :
        "Kişinin mevcut hesabına daire erişimi tanımlandı. Mevcut hesabıyla giriş yapabilir."
    });
  } catch (error) {
    // Do not expose database details or personal information to the browser.
    console.error("site-invite-resident failed", error instanceof Error ? error.name : "unknown");
    return respond({ error: "İşlem tamamlanamadı. Daha sonra tekrar deneyin veya yöneticiye danışın." }, 500);
  }
});
