
import { createClient } from "@supabase/supabase-js";

/**
 * Xác thực người dùng từ Access Token của Supabase.
 * Chỉ sử dụng ở backend, không sử dụng trong React.
 */
export async function getAuthenticatedUser(req) {
  const authorization = req.headers.authorization;

  // 1. Kiểm tra Authorization header
  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    const error = new Error("Bạn chưa đăng nhập.");
    error.status = 401;
    throw error;
  }

  const accessToken = authorization.slice(7).trim();

  if (!accessToken) {
    const error = new Error("Access token không hợp lệ.");
    error.status = 401;
    throw error;
  }

  // 2. Lấy cấu hình Supabase từ biến môi trường
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const error = new Error(
      "Supabase backend chưa được cấu hình."
    );
    error.status = 500;
    throw error;
  }

  // 3. Tạo Supabase client phía server
  const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  // 4. Yêu cầu Supabase xác minh token
  const { data, error } = await supabase.auth.getUser(
    accessToken
  );

  if (error || !data?.user) {
    const authError = new Error(
      "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
    );
    authError.status = 401;
    throw authError;
  }

  // 5. Trả về thông tin người dùng đã được xác minh
  return data.user;
}
