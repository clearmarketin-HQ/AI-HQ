import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  answerCallbackQuery,
  buildUrgencyKeyboard,
  downloadVoiceFile,
  sendMessage,
} from "@/lib/telegram/api";
import { transcribeVoice } from "@/lib/telegram/transcribe";
import {
  classifyCapture,
  URGENCY_LABELS,
  URGENCY_VALUES,
  type Classification,
  type Urgency,
} from "@/lib/telegram/classify";
import type { TelegramCallbackQuery, TelegramUpdate } from "@/lib/telegram/types";

interface Operator {
  id: string;
}

interface OrgRow {
  id: string;
  slug: string;
  name: string;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const supabase = createServiceRoleClient();

  if (update.callback_query) {
    await handleCallbackQuery(supabase, update.callback_query);
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message || !message.from) {
    return NextResponse.json({ ok: true });
  }

  const { data: operator, error: operatorError } = await supabase
    .from("operators")
    .select("id")
    .eq("telegram_id", message.from.id)
    .maybeSingle<Operator>();

  if (operatorError) {
    throw operatorError;
  }

  if (!operator) {
    await sendMessage(
      message.chat.id,
      "Sorry, you're not authorized to use this bot."
    );
    return NextResponse.json({ ok: true });
  }

  let rawText: string;
  if (message.voice) {
    try {
      const audioBlob = await downloadVoiceFile(message.voice.file_id);
      rawText = await transcribeVoice(audioBlob, "voice.ogg");
    } catch (error) {
      console.error("Voice transcription failed:", error);
      await sendMessage(
        message.chat.id,
        "⚠️ Couldn't transcribe that voice note right now — try again shortly, or send it as text."
      );
      return NextResponse.json({ ok: true });
    }
  } else if (message.text) {
    rawText = message.text;
  } else {
    await sendMessage(
      message.chat.id,
      "I can only handle text or voice messages right now."
    );
    return NextResponse.json({ ok: true });
  }

  const { data: orgsData, error: orgsError } = await supabase
    .from("orgs")
    .select("id, slug, name");

  if (orgsError) {
    throw orgsError;
  }

  const orgs = orgsData as OrgRow[];
  const classification = await classifyCapture(
    rawText,
    orgs.map((org) => org.slug)
  );

  // Never trust the AI-returned slug directly — resolve against the orgs
  // we just fetched from the DB.
  const matchedOrg = classification.org_slug
    ? orgs.find((org) => org.slug === classification.org_slug)
    : undefined;
  const orgId = matchedOrg?.id ?? null;

  const { data: rawCapture, error: rawCaptureError } = await supabase
    .from("raw_captures")
    .insert({
      org_id: orgId,
      user_id: operator.id,
      source: "telegram",
      raw_text: rawText,
      classification,
      llm_source: "claude-haiku-4-5",
    })
    .select("id")
    .single();

  if (rawCaptureError) {
    throw rawCaptureError;
  }

  let taskId: string | null = null;

  if (classification.kind === "task" && orgId) {
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        org_id: orgId,
        user_id: operator.id,
        title: classification.title,
        urgency: classification.urgency,
        description: classification.summary,
        tags: classification.tags,
      })
      .select("id")
      .single();

    if (taskError) {
      throw taskError;
    }

    taskId = task.id as string;

    const { error: routeError } = await supabase
      .from("raw_captures")
      .update({ routed_to: "tasks", routed_id: taskId })
      .eq("id", rawCapture.id);

    if (routeError) {
      throw routeError;
    }
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    org_id: orgId,
    user_id: operator.id,
    action: "capture",
    resource_type: taskId ? "task" : "raw_capture",
    resource_id: taskId ?? rawCapture.id,
  });

  if (auditError) {
    throw auditError;
  }

  await sendMessage(
    message.chat.id,
    buildConfirmationMessage(classification, matchedOrg),
    taskId ? buildUrgencyKeyboard(taskId) : undefined
  );

  return NextResponse.json({ ok: true });
}

function buildConfirmationMessage(
  classification: Classification,
  org: OrgRow | undefined
): string {
  if (classification.kind === "task" && !org) {
    return `⚠️ Task captured, but I couldn't tell which business this is for — saved for review: ${classification.title}`;
  }

  const orgPart = org ? ` for ${org.name}` : "";

  if (classification.kind === "task") {
    const urgencyLabel = URGENCY_LABELS[classification.urgency];
    return `✅ Task${orgPart} (${urgencyLabel}): ${classification.title}`;
  }

  if (classification.kind === "decision") {
    return `📌 Decision${orgPart} logged: ${classification.title}`;
  }

  return `📝 Note${orgPart} saved: ${classification.title}`;
}

async function handleCallbackQuery(
  supabase: ReturnType<typeof createServiceRoleClient>,
  callbackQuery: TelegramCallbackQuery
): Promise<void> {
  const data = callbackQuery.data;
  const parts = data?.split(":");

  if (!parts || parts.length !== 3 || parts[0] !== "capture") {
    await answerCallbackQuery(callbackQuery.id);
    return;
  }

  const [, taskId, action] = parts;

  const { data: operator, error: operatorError } = await supabase
    .from("operators")
    .select("id")
    .eq("telegram_id", callbackQuery.from.id)
    .maybeSingle<Operator>();

  if (operatorError) {
    throw operatorError;
  }

  if (!operator) {
    await answerCallbackQuery(callbackQuery.id, "Not authorized.");
    return;
  }

  if (action !== "key" && !URGENCY_VALUES.includes(action as Urgency)) {
    await answerCallbackQuery(callbackQuery.id, "Unknown action.");
    return;
  }

  // Validate the task actually exists before writing — never trust an id
  // sourced from callback_data.
  const { data: task, error: taskLookupError } = await supabase
    .from("tasks")
    .select("id, org_id")
    .eq("id", taskId)
    .maybeSingle<{ id: string; org_id: string }>();

  if (taskLookupError) {
    throw taskLookupError;
  }

  if (!task) {
    await answerCallbackQuery(callbackQuery.id, "Task not found.");
    return;
  }

  const update =
    action === "key" ? { key: true } : { urgency: action as Urgency };

  const { error: updateError } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId);

  if (updateError) {
    throw updateError;
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    org_id: task.org_id,
    user_id: operator.id,
    action: "capture_urgency_override",
    resource_type: "task",
    resource_id: taskId,
  });

  if (auditError) {
    throw auditError;
  }

  const confirmText =
    action === "key"
      ? "Marked as key."
      : `Urgency set to ${URGENCY_LABELS[action as Urgency]}.`;

  await answerCallbackQuery(callbackQuery.id, confirmText);
}
