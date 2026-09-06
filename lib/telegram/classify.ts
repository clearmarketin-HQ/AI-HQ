import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!anthropicApiKey) {
  throw new Error("Missing ANTHROPIC_API_KEY environment variable");
}

const anthropic = new Anthropic({ apiKey: anthropicApiKey });

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

export async function classifyCapture(
  text: string,
  orgs: OrgOption[]
): Promise<Classification> {
  const validOrgSlugs = orgs.map((org) => org.slug);
  const orgList = orgs.map((org) => `${org.slug} (${org.name})`).join(", ");

  const ClassificationSchema = z.object({
    org_slug: z.enum(validOrgSlugs as [string, ...string[]]).nullable(),
    kind: z.enum(["task", "note", "decision"]),
    urgency: z.enum(URGENCY_VALUES),
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
  });

  const response = await anthropic.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system:
      "You classify short operator captures (voice notes or texts) into a structured record for a business-operations inbox. " +
      "org_slug must be exactly one of the provided valid org slugs, matched by the business's actual name or any clear reference to it in the text " +
      "(not just the slug string itself) — or null if the business is unclear from the text. Never invent a slug. " +
      "kind is 'task' for actionable items, 'note' for informational context, or 'decision' for a decision that was made. " +
      "urgency is 'today', 'this_week', 'this_month', or 'someday', based on how time-sensitive the capture sounds. " +
      "title is a short (under 10 words) label suitable as a task title. summary is 1-3 sentences expanding on the capture. " +
      `tags is a short list of relevant keyword tags. Valid orgs (slug and business name): ${orgList}.`,
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(ClassificationSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Classification request was refused");
  }

  if (!response.parsed_output) {
    throw new Error("Classification response did not include parsed output");
  }

  return response.parsed_output;
}
