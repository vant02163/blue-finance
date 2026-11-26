
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
    const error = new Error(
      result.message || "Không thể kết nối máy chủ."
    );

    error.status = response.status;
    error.conflict = result.conflict === true;
    error.currentVersion = result.currentVersion ?? null;

    throw error;
  }

  return result;
}

/**
 * Lấy thông tin gia đình.
 */
export async function getFamilyInfo() {
  return apiRequest("/api/family/me");
}

/**
 * Tải dữ liệu tài chính và phiên bản máy chủ.
 */
export async function getFamilyData() {
  return apiRequest("/api/family/data");
}

/**
 * Lưu dữ liệu tài chính kèm phiên bản đang sử dụng.
 */
export async function saveFamilyData(data, expectedVersion = null) {
  return apiRequest("/api/family/data", {
    method: "PUT",
    body: JSON.stringify({
      data,
      expectedVersion,
    }),
  });
}
