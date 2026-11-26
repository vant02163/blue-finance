
import { getAuthenticatedUser } from "./supabaseAuth.js";
import { getGoogleSheetsClient } from "./googleSheets.js";

/**
 * Lấy thông tin quyền truy cập của người dùng.
 * Không nhận role hoặc familyId từ frontend.
 */
export async function getFamilyAccess(req) {
  // 1. Xác thực tài khoản Supabase
  const user = await getAuthenticatedUser(req);

  // 2. Kiểm tra cấu hình Google Sheets
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    const error = new Error(
      "Google Spreadsheet ID chưa được cấu hình."
    );
    error.status = 500;
    throw error;
  }

  // 3. Đọc danh sách thành viên trong sheet Users
  const sheets = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Users!A2:G",
  });

  const rows = response.data.values ?? [];

  // 4. Tìm người dùng theo Supabase Auth User ID
  const userRow = rows.find(
    (row) => row[0] === user.id
  );

  if (!userRow) {
    const error = new Error(
      "Tài khoản chưa được thêm vào gia đình."
    );
    error.status = 403;
    throw error;
  }

  const [
    authUserId,
    email,
    displayName,
    role,
    status,
    familyId,
    createdAt,
  ] = userRow;

  // 5. Kiểm tra email có khớp với Supabase không
  if (
    !email ||
    email.trim().toLowerCase() !==
      (user.email || "").trim().toLowerCase()
  ) {
    const error = new Error(
      "Email tài khoản không khớp với thông tin đăng nhập."
    );
    error.status = 403;
    throw error;
  }

  // 6. Kiểm tra trạng thái tài khoản
  if (status !== "active") {
    const error = new Error(
      "Tài khoản của bạn chưa được kích hoạt."
    );
    error.status = 403;
    throw error;
  }

  // 7. Kiểm tra quyền hợp lệ
  if (role !== "Owner" && role !== "Member") {
    const error = new Error(
      "Quyền truy cập của tài khoản không hợp lệ."
    );
    error.status = 403;
    throw error;
  }

  // 8. Kiểm tra familyId
  if (!familyId) {
    const error = new Error(
      "Tài khoản chưa được gán vào gia đình."
    );
    error.status = 403;
    throw error;
  }

  // 9. Trả về thông tin được xác minh từ backend
  return {
    authUserId,
    email,
    displayName,
    role,
    status,
    familyId,
    createdAt,
  };
}
