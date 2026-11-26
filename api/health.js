import { checkGoogleSheetsConnection } from "./_lib/googleSheets.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    await checkGoogleSheetsConnection();

    return res.status(200).json({
      success: true,
      message: "Google Sheets connected successfully",
    });
  } catch (error) {
    console.error("Google Sheets connection failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Google Sheets connection failed",
    });
  }
}