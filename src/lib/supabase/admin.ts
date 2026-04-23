import { createClient } from "@supabase/supabase-js";

/**
 * サーバー側専用の管理者クライアント。
 * service_role key を使うため、絶対にクライアント側に渡さないこと。
 *
 * 主な用途:
 * - auth.admin.inviteUserByEmail() でメール招待
 * - auth.admin.listUsers() でユーザー一覧取得
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が設定されていません。.env.local にキーを追加してください。",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
