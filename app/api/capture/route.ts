import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { classifyCapture } from "@/lib/telegram/classify";

interface Operator {
  id: string;
}

interface OrgRow {
  id: string;
  slug: string;
  name: string;
}

export async function POST(request: NextRequest) {
  const { text } = (await request.json()) as { text?: string };

  if (!text || !text.trim()) {
    return NextResponse.json(
      { error: "Capture text is required." },
      { status: 400 }
    );
  }

  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Same pipeline as the Telegram webhook, but reads/writes go through the
  // service role since the operator/raw_captures/tasks tables aren't
  // RLS-scoped to the logged-in Supabase Auth user.
  const supabase = createServiceRoleClient();

  const { data: operator, error: operatorError } = await supabase
    .from("operators")
    .select("id")
    .eq("email", user.email)
    .maybeSingle<Operator>();

  if (operatorError) {
    throw operatorError;
  }

  if (!operator) {
    return NextResponse.json(
      { error: "Your account isn't linked to an operator record." },
      { status: 403 }
    );
  }

  const { data: orgsData, error: orgsError } = await supabase
    .from("orgs")
    .select("id, slug, name");

  if (orgsError) {
    throw orgsError;
  }

  const orgs = orgsData as OrgRow[];
  const classification = await classifyCapture(text, orgs);

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
      source: "web",
      raw_text: text,
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

  return NextResponse.json({
    ok: true,
    org: matchedOrg?.name ?? null,
    classification,
  });
}
