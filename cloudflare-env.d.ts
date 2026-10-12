declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ADMIN_BOOTSTRAP_EMAIL?: string; PRIVATE_CATALOG_UPDATER?: string;
    BUCKET?: R2Bucket;
  }
}
