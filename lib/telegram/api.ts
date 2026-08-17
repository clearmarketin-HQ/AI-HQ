import "server-only";

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN environment variable");
}

const API_BASE = `https://api.telegram.org/bot${botToken}`;
const FILE_BASE = `https://api.telegram.org/file/bot${botToken}`;

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export async function sendMessage(
  chatId: number,
  text: string,
  inlineKeyboard?: InlineKeyboardButton[][]
): Promise<void> {
  const response = await fetch(`${API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: inlineKeyboard
        ? { inline_keyboard: inlineKeyboard }
        : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Telegram sendMessage failed: ${response.status} ${await response.text()}`
    );
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });

  if (!response.ok) {
    throw new Error(
      `Telegram answerCallbackQuery failed: ${response.status} ${await response.text()}`
    );
  }
}

export async function downloadVoiceFile(fileId: string): Promise<Blob> {
  const getFileResponse = await fetch(
    `${API_BASE}/getFile?file_id=${encodeURIComponent(fileId)}`
  );

  if (!getFileResponse.ok) {
    throw new Error(
      `Telegram getFile failed: ${getFileResponse.status} ${await getFileResponse.text()}`
    );
  }

  const getFileData = (await getFileResponse.json()) as {
    ok: boolean;
    result?: { file_path?: string };
  };

  const filePath = getFileData.result?.file_path;
  if (!getFileData.ok || !filePath) {
    throw new Error("Telegram getFile response missing file_path");
  }

  const fileResponse = await fetch(`${FILE_BASE}/${filePath}`);
  if (!fileResponse.ok) {
    throw new Error(`Telegram file download failed: ${fileResponse.status}`);
  }

  return fileResponse.blob();
}

export function buildUrgencyKeyboard(taskId: string): InlineKeyboardButton[][] {
  return [
    [
      { text: "Today", callback_data: `capture:${taskId}:today` },
      { text: "This Week", callback_data: `capture:${taskId}:this_week` },
    ],
    [
      { text: "This Month", callback_data: `capture:${taskId}:this_month` },
      { text: "Someday", callback_data: `capture:${taskId}:someday` },
    ],
    [{ text: "🔑 Key", callback_data: `capture:${taskId}:key` }],
  ];
}
