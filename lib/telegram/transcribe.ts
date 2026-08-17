import "server-only";

const openAiApiKey = process.env.OPENAI_API_KEY;

if (!openAiApiKey) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

export async function transcribeVoice(
  audio: Blob,
  filename: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", audio, filename);
  formData.append("model", "whisper-1");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiApiKey}` },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Whisper transcription failed: ${response.status} ${await response.text()}`
    );
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}
