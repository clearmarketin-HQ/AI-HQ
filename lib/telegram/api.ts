import "server-only";

// Resolved per call rather than at module scope, so a missing token fails
// the request that needs it instead of the route's import.
function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN environment variable");
  }

  return token;
}

function apiBase(): string {
  return `https://api.telegram.org/bot${botToken()}`;
}

function fileBase(): string {
  return `https://api.telegram.org/file/bot${botToken()}`;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export async function sendMessage(
  chatId: number,
  text: string,
  inlineKeyboard?: InlineKeyboardButton[][]
): Promise<void> {
  const response = await fetch(`${apiBase()}/sendMessage`, {
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
  const response = await fetch(`${apiBase()}/answerCallbackQuery`, {
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
    `${apiBase()}/getFile?file_id=${encodeURIComponent(fileId)}`
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

  const fileResponse = await fetch(`${fileBase()}/${filePath}`);
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
