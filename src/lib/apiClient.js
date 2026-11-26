import { supabase } from "./supabaseClient.js";

/**
 * Gửi yêu cầu đến Vercel API kèm Supabase Access Token.
 */
export async function apiRequest(path, options = {}) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error("Không thể kiểm tra phiên đăng nhập.");
  }

  if (!session?.access_token) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Máy chủ trả về dữ liệu không hợp lệ.");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Không thể kết nối máy chủ."
    );
  }

  return result;
}

/**
 * Lấy thông tin tài khoản và gia đình đang đăng nhập.
 */
export async function getFamilyInfo() {
  return apiRequest("/api/family/me");
}
