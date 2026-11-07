import { connectSlackCredentials } from "@vercel/connect/eve";
import { defineState } from "eve/context";
import { callSlackApi } from "eve/channels/slack";
import { defineTool } from "eve/tools";
import { z } from "zod";

// Same Vercel Connect connector as agent/channels/slack.ts.
const { botToken } = connectSlackCredentials("slack/riley-s-vercel");

// One Slack thread per customer conversation, so repeat escalations land together.
const escalationThread = defineState("versell.escalation-thread", () => ({ threadTs: "" }));

enum EscalationReason {
    AskedForHuman = "asked_for_human",
    Frustrated = "frustrated",
}

const reasonLabels: Record<EscalationReason, string> = {
    [EscalationReason.AskedForHuman]: ":raising_hand: Customer asked for a human",
    [EscalationReason.Frustrated]: ":rotating_light: Customer seems frustrated",
};

export default defineTool({
    description:
        "Flag this conversation to the VerSell team in Slack. Call it when the customer is clearly frustrated " +
        "or explicitly asks to speak to a person. Do not call it for questions you can answer yourself. " +
        "If you already escalated in this conversation, calling again adds the update to the same thread. " +
        "Make sure to ask the customer for their email address so we can follow up. Let them know we'll only use " +
        "it for contacting them for this ticket, and never use it for marketing without their consent. " +
        "Afterwards, tell the customer a team member has been notified. Do not promise a response time.",
    inputSchema: z.object({
        reason: z.enum(EscalationReason),
        summary: z.string().min(1).describe("Self-contained summary for a teammate who hasn't seen the chat: what the customer wants, what was tried, and their mood."),
    }),
    label: { start: () => "Contacting the VerSell team" },
    async execute({ reason, summary }, ctx) {
        const channel = process.env.SLACK_ESCALATION_CHANNEL_ID;
        if (!channel) {
            throw new Error("Escalation is not configured. Apologise and suggest the customer tries again later.");
        }

        const { threadTs } = escalationThread.get();
        const text = threadTs
            ? `*Update:* ${summary}`
            : `${reasonLabels[reason]}\n\n${summary}\n\nSession: \`${ctx.session.id}\``;

        // A plain post, not ctx.to(slack): staff get a message, not an agent turn in Slack.
        const response = await callSlackApi({
            botToken,
            operation: "chat.postMessage",
            body: {
                channel,
                text,
                ...(threadTs && { thread_ts: threadTs }),
            },
        });
        if (!response.ok) {
            throw new Error(`Slack rejected the escalation: ${String(response.error)}`);
        }

        if (!threadTs) {
            escalationThread.update(() => ({ threadTs: String(response.ts) }));
        }
        return { notified: true };
    },
});
