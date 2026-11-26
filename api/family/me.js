
import { getFamilyAccess } from "../_lib/familyAccess.js";

export default async function handler(req, res) {
  // Chỉ cho phép GET
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Xác thực người dùng và lấy thông tin gia đình
    const access = await getFamilyAccess(req);

    return res.status(200).json({
      success: true,
      user: {
        id: access.authUserId,
        email: access.email,
        displayName: access.displayName,
      },
      family: {
        id: access.familyId,
      },
      permissions: {
        role: access.role,
        canManageMembers: access.role === "Owner",
        canManageFinancialData: true,
      },
    });
  } catch (error) {
    console.error("Family access error:", error.message);

    return res.status(error.status || 500).json({
      success: false,
      message: error.status
        ? error.message
        : "Không thể kiểm tra quyền truy cập gia đình.",
    });
  }
}
