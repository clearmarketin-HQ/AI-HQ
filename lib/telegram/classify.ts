import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const URGENCY_VALUES = [
  "today",
  "this_week",
  "this_month",
  "someday",
] as const;

export type Urgency = (typeof URGENCY_VALUES)[number];

export const URGENCY_LABELS: Record<Urgency, string> = {
  today: "today",
  this_week: "this week",
  this_month: "this month",
  someday: "someday",
};

export const CLAUDE_CLASSIFIER_MODEL = "claude-haiku-4-5";
const DEFAULT_OPENAI_CLASSIFIER_MODEL = "gpt-4o-mini";

/** Recorded on `raw_captures.llm_source` when no model was reachable. */
export const REGEX_CLASSIFIER_SOURCE = "regex";

export interface Classification {
  org_slug: string | null;
  kind: "task" | "note" | "decision";
  urgency: Urgency;
  title: string;
  summary: string;
  tags: string[];
}

export interface OrgOption {
  slug: string;
  name: string;
}

export interface ClassificationResult {
  classification: Classification;
  /**
   * The model that actually produced this classification, for
   * `raw_captures.llm_source`. `REGEX_CLASSIFIER_SOURCE` means both model
   * tiers were unreachable and the capture was filed by pattern-matching —
   * degraded, but not dropped.
   */
  llmSource: string;
}

/**
 * Classify a capture, degrading rather than failing: Claude → OpenAI →
 * regex. The regex tier never throws, so a capture is never lost to a
 * provider outage or an exhausted quota — the failure mode that has already
 * cost this system voice notes once.
 *
 * Callers must still resolve `org_slug` against the database. Every tier
 * here constrains the slug to the list it was handed, but none of them is
 * the authority on what orgs exist.
 */
export async function classifyCapture(
  text: string,
  orgs: OrgOption[]
): Promise<ClassificationResult> {
  try {
    return {
      classification: await classifyWithClaude(text, orgs),
      llmSource: CLAUDE_CLASSIFIER_MODEL,
    };
  } catch (error) {
    console.error(
      "Claude classification failed; falling back to OpenAI:",
      error
    );
  }

  const openAiModel =
    process.env.OPENAI_CLASSIFIER_MODEL || DEFAULT_OPENAI_CLASSIFIER_MODEL;

  try {
    return {
      classification: await classifyWithOpenAi(text, orgs, openAiModel),
      llmSource: openAiModel,
    };
  } catch (error) {
    console.error(
      "OpenAI classification failed; falling back to regex:",
      error
    );
  }

  return {
    classification: classifyWithRegex(text, orgs),
    llmSource: REGEX_CLASSIFIER_SOURCE,
  };
}

function buildSystemPrompt(orgs: OrgOption[]): string {
  const orgList = orgs.map((org) => `${org.slug} (${org.name})`).join(", ");

  return (
    "You classify short operator captures (voice notes or texts) into a structured record for a business-operations inbox. " +
    "org_slug must be exactly one of the provided valid org slugs, matched by the business's actual name or any clear reference to it in the text " +
    "(not just the slug string itself) — or null if the business is unclear from the text. Never invent a slug. " +
    "kind is 'task' for actionable items, 'note' for informational context, or 'decision' for a decision that was made. " +
    "urgency is 'today', 'this_week', 'this_month', or 'someday', based on how time-sensitive the capture sounds. " +
    "title is a short (under 10 words) label suitable as a task title. summary is 1-3 sentences expanding on the capture. " +
    `tags is a short list of relevant keyword tags. Valid orgs (slug and business name): ${orgList}.`
  );
}

/**
 * Zod shape shared by both model tiers. `org_slug` stays a plain nullable
 * string rather than an enum of the valid slugs: an empty org list would
 * make `z.enum([])` throw, and `normalizeClassification` enforces
 * membership anyway. The enum constraint is applied where it actually
 * steers generation — the Claude output format and the OpenAI JSON schema.
 */
const classificationSchema = z.object({
  org_slug: z.string().nullable(),
  kind: z.enum(["task", "note", "decision"]),
  urgency: z.enum(URGENCY_VALUES),
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
});

function buildClaudeSchema(orgs: OrgOption[]) {
  const slugs = orgs.map((org) => org.slug);

  if (slugs.length === 0) {
    return classificationSchema;
  }

  return classificationSchema.extend({
    org_slug: z.enum(slugs as [string, ...string[]]).nullable(),
  });
}

async function classifyWithClaude(
  text: string,
  orgs: OrgOption[]
): Promise<Classification> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.parse({
    model: CLAUDE_CLASSIFIER_MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(orgs),
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(buildClaudeSchema(orgs)) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Classification request was refused");
  }

  if (!response.parsed_output) {
    throw new Error("Classification response did not include parsed output");
  }

  return normalizeClassification(response.parsed_output, orgs, text);
}

function buildOpenAiJsonSchema(orgs: OrgOption[]): Record<string, unknown> {
  const slugs = orgs.map((org) => org.slug);

  return {
    type: "object",
    properties: {
      org_slug:
        slugs.length > 0
          ? { type: ["string", "null"], enum: [...slugs, null] }
          : { type: ["string", "null"] },
      kind: { type: "string", enum: ["task", "note", "decision"] },
      urgency: { type: "string", enum: [...URGENCY_VALUES] },
      title: { type: "string" },
      summary: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["org_slug", "kind", "urgency", "title", "summary", "tags"],
    additionalProperties: false,
  };
}

async function classifyWithOpenAi(
  text: string,
  orgs: OrgOption[],
  model: string
): Promise<Classification> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(orgs) },
        { role: "user", content: text },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "capture_classification",
          strict: true,
          schema: buildOpenAiJsonSchema(orgs),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI classification failed: ${response.status} ${await response.text()}`
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI classification response did not include content");
  }

  const parsed = classificationSchema.parse(JSON.parse(content));

  return normalizeClassification(parsed, orgs, text);
}

/**
 * Last resort: no model, no network, no throwing. Produces a conservative
 * record so the capture still lands and can be corrected by hand.
 */
function classifyWithRegex(text: string, orgs: OrgOption[]): Classification {
  const trimmed = text.trim();

  return normalizeClassification(
    {
      org_slug: matchOrgSlug(trimmed, orgs),
      kind: matchKind(trimmed),
      urgency: matchUrgency(trimmed),
      title: deriveTitle(trimmed),
      summary: trimmed,
      tags: [],
    },
    orgs,
    trimmed
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Longest whole-word match across org names and slugs, so "Openforge East"
 * beats "Openforge" and a slug never matches inside an unrelated word.
 */
function matchOrgSlug(text: string, orgs: OrgOption[]): string | null {
  let bestSlug: string | null = null;
  let bestLength = 0;

  for (const org of orgs) {
    const needles = [org.name, org.slug.replace(/[-_]+/g, " "), org.slug];

    for (const needle of needles) {
      const cleaned = needle.trim();

      if (cleaned.length < 3 || cleaned.length <= bestLength) {
        continue;
      }

      const pattern = new RegExp(`\\b${escapeRegExp(cleaned)}\\b`, "i");

      if (pattern.test(text)) {
        bestSlug = org.slug;
        bestLength = cleaned.length;
      }
    }
  }

  return bestSlug;
}

function matchKind(text: string): Classification["kind"] {
  if (
    /\b(decided|decision|we're going with|going with|settled on|agreed on|chose|picked)\b/i.test(
      text
    )
  ) {
    return "decision";
  }

  if (
    /\b(need to|needs to|have to|has to|should|must|todo|to-do|remember to|make sure|follow up|chase|call|email|send|schedule|book|order|invoice|fix|check|ask|remind|quote)\b/i.test(
      text
    )
  ) {
    return "task";
  }

  return "note";
}

function matchUrgency(text: string): Urgency {
  if (
    /\b(today|tonight|right now|asap|urgent|urgently|immediately|end of day|eod)\b/i.test(
      text
    )
  ) {
    return "today";
  }

  if (
    /\b(tomorrow|this week|next few days|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|before the weekend)\b/i.test(
      text
    )
  ) {
    return "this_week";
  }

  if (/\b(next week|this month|end of the month|by month end)\b/i.test(text)) {
    return "this_month";
  }

  if (
    /\b(someday|eventually|at some point|one day|no rush|no hurry|whenever|long term)\b/i.test(
      text
    )
  ) {
    return "someday";
  }

  // Deliberately not "someday": an unparsed capture buried in the someday
  // tier is the same silent loss this fallback exists to prevent.
  return "this_week";
}

function deriveTitle(text: string): string {
  const firstSentence =
    text.split(/(?<=[.!?])\s+|\n/)[0]?.trim() || text.trim();
  const words = firstSentence.split(/\s+/).filter(Boolean);
  const title =
    words.length > 10 ? `${words.slice(0, 10).join(" ")}…` : firstSentence;

  return title.slice(0, 120) || "Untitled capture";
}

/** Whatever a tier produced, before it has been vouched for. */
interface RawClassification {
  org_slug?: string | null;
  kind?: string | null;
  urgency?: string | null;
  title?: string | null;
  summary?: string | null;
  tags?: unknown;
}

const KIND_VALUES: Classification["kind"][] = ["task", "note", "decision"];

/**
 * The single point where a classification becomes trustworthy, applied to
 * every tier including the regex one. An `org_slug` outside the list we were
 * handed becomes null rather than a mis-route, unrecognised enum values fall
 * back rather than reaching an insert, and the text fields are bounded.
 *
 * Takes a loose shape deliberately: this is the boundary that makes model
 * output safe, so it must not assume the model already got the shape right.
 */
function normalizeClassification(
  raw: RawClassification,
  orgs: OrgOption[],
  sourceText: string
): Classification {
  const validSlugs = new Set(orgs.map((org) => org.slug));
  const orgSlug =
    raw.org_slug && validSlugs.has(raw.org_slug) ? raw.org_slug : null;

  const kind = KIND_VALUES.find((value) => value === raw.kind) ?? "note";
  const urgency =
    URGENCY_VALUES.find((value) => value === raw.urgency) ?? "this_week";

  const title = raw.title?.trim().slice(0, 120);
  const summary = raw.summary?.trim().slice(0, 2000);

  return {
    org_slug: orgSlug,
    kind,
    urgency,
    title: title || deriveTitle(sourceText),
    summary: summary || sourceText.trim().slice(0, 2000),
    tags: (Array.isArray(raw.tags) ? raw.tags : [])
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8),
  };
}
