import "server-only";

/**
 * A transcription that failed in a way the operator can act on.
 *
 * `needsAttention` separates "the account is out of credit / the key is
 * bad" — which no amount of retrying fixes — from a transient blip. The
 * difference matters at the other end: telling someone to "try again
 * shortly" when the balance is empty costs them the capture twice.
 */
export class TranscriptionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly needsAttention: boolean
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}

// Read at call time, not module scope. A module-level throw here took the
// whole Telegram webhook down on import — including text captures, which
// never reach Whisper.
export async function transcribeVoice(
  audio: Blob,
  filename: string
): Promise<string> {
  const openAiApiKey = process.env.OPENAI_API_KEY;

  if (!openAiApiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

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
    const body = await response.text();

    // 401/403 is a bad or revoked key; a 429 naming quota or billing is an
    // exhausted balance rather than rate limiting. All three stay broken
    // until a human fixes the account.
    const needsAttention =
      response.status === 401 ||
      response.status === 403 ||
      (response.status === 429 &&
        /insufficient_quota|billing|exceeded your current quota/i.test(body));

    throw new TranscriptionError(
      `Whisper transcription failed: ${response.status} ${body}`,
      response.status,
      needsAttention
    );
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}
