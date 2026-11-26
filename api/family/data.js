
import { createClient } from "@supabase/supabase-js";
import { getFamilyAccess } from "../_lib/familyAccess.js";

function getAdminSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("Supabase server chưa được cấu hình.");
    error.status = 500;
    throw error;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const access = await getFamilyAccess(req);
    const supabase = getAdminSupabase();

    // =========================================
    // GET: TẢI DỮ LIỆU VÀ PHIÊN BẢN HIỆN TẠI
    // =========================================

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("family_finance_data")
        .select("data, updated_by, updated_at")
        .eq("family_id", access.familyId)
        .maybeSingle();

      if (error) {
        console.error("Family data read error:", error.message);
        throw new Error("Không thể tải dữ liệu tài chính.");
      }

      return res.status(200).json({
        success: true,
        data: data?.data ?? null,
        updatedBy: data?.updated_by ?? null,
        updatedAt: data?.updated_at ?? null,
        version: data?.updated_at ?? null,
      });
    }

    // =========================================
    // PUT: LƯU DỮ LIỆU CÓ KIỂM TRA PHIÊN BẢN
    // =========================================

    const financeData = req.body?.data;
    const expectedVersion = req.body?.expectedVersion ?? null;

    if (
      !financeData ||
      typeof financeData !== "object" ||
      Array.isArray(financeData)
    ) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu tài chính không hợp lệ.",
      });
    }

    if (
      expectedVersion !== null &&
      (typeof expectedVersion !== "string" ||
        Number.isNaN(Date.parse(expectedVersion)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Phiên bản dữ liệu không hợp lệ.",
      });
    }

    const serializedData = JSON.stringify(financeData);

    if (serializedData.length > 1_000_000) {
      return res.status(413).json({
        success: false,
        message: "Dữ liệu quá lớn để đồng bộ.",
      });
    }

    const { data, error } = await supabase.rpc(
      "save_family_finance_data",
      {
        p_family_id: access.familyId,
        p_data: financeData,
        p_updated_by: access.authUserId,
        p_expected_version: expectedVersion,
      }
    );

    if (error) {
      console.error("Family data save error:", error.message);
      throw new Error("Không thể lưu dữ liệu tài chính.");
    }

    if (!data?.saved) {
      return res.status(409).json({
        success: false,
        conflict: true,
        message:
          "Dữ liệu đã được cập nhật trên thiết bị khác. Vui lòng tải lại dữ liệu mới nhất trước khi tiếp tục.",
        currentVersion: data?.updatedAt ?? null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đồng bộ dữ liệu thành công.",
      updatedAt: data.updatedAt,
      version: data.updatedAt,
    });
  } catch (error) {
    console.error("Family data API error:", error.message);

    return res.status(error.status || 500).json({
      success: false,
      message: error.status
        ? error.message
        : "Không thể xử lý dữ liệu tài chính.",
    });
  }
}
