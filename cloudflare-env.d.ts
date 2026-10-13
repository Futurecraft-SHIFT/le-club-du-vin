declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    AUTH_MODE?: string;
  SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string;
    ADMIN_BOOTSTRAP_EMAIL?: string; ADMIN_SUPABASE_USER_ID?: string; EMAIL_VERIFICATION_REQUIRED?: string; PRIVATE_CATALOG_UPDATER?: string;
    BUCKET?: R2Bucket;
  }
}
