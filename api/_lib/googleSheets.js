
import { google } from "googleapis";

export function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyValue = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKeyValue) {
    throw new Error("Google credentials are not configured.");
  }

  let privateKey;

  try {
    privateKey = JSON.parse(privateKeyValue);
  } catch {
    throw new Error("Google private key has an invalid format.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

export async function checkGoogleSheetsConnection() {
  const spreadsheetId =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error("Google Spreadsheet ID is not configured.");
  }

  const sheets = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties.title,sheets.properties(sheetId,title,index)",
  });

  return {
    spreadsheetTitle: response.data.properties?.title ?? null,
    sheetNames: (response.data.sheets ?? []).map(
      (sheet) => sheet.properties.title,
    ),
  };
}
