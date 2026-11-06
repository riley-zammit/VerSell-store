"use client";

import { activeTurn } from "eve/events";
import { useEveAgent, type Interaction, type UseEveAgentReturn } from "eve/react";

export default function ChatPage() {
  const agent = useEveAgent();
  const isBusy = agent.status === "busy";
  const isResuming = agent.status === "resuming";
  const turn = activeTurn(agent.view);

  return (
    <section className="surface-card mx-auto flex min-h-[70vh] max-w-3xl flex-col p-5 md:p-8">
      <header className="flex items-start justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <h1 className="text-4xl md:text-5xl">Chat with Eve</h1>
          <p className="mt-2 text-sm text-black/60">Ask questions or give the agent a task.</p>
        </div>
        {agent.messages.length > 0 ? (
          <button className="button-light shrink-0" onClick={agent.newSession} type="button">
            New chat
          </button>
        ) : null}
      </header>

      <div className="flex-1 space-y-4 py-6" aria-live="polite">
        {agent.messages.length === 0 ? (
          <p className="rounded-2xl bg-black/5 p-4 text-black/60">
            Try “What can you help me with?”
          </p>
        ) : (
          agent.messages.map((message) => (
            <article
              className={`max-w-[90%] rounded-2xl p-4 ${
                message.role === "user" ? "ml-auto bg-black text-white" : "bg-black/5"
              }`}
              key={message.id}
            >
              <p className="mb-2 font-sans text-xs font-bold uppercase tracking-wide opacity-60">
                {message.role === "user" ? "You" : "Eve"}
              </p>
              <div className="space-y-3 wrap-break-word whitespace-pre-wrap">
                {message.parts.map((part, index) => {
                  if (part.type === "text") return <p key={part.id ?? index}>{part.text}</p>;
                  if (part.type === "file") {
                    return (
                      <p className="text-sm" key={`file-${index}`}>
                        Attachment: {part.filename ?? part.mediaType}
                      </p>
                    );
                  }
                  if (part.type === "interaction") {
                    return (
                      <InteractionPrompt
                        disabled={isResuming}
                        interaction={part}
                        key={part.interactionId}
                        respond={agent.respond}
                      />
                    );
                  }
                  if (part.type === "tool") {
                    return (
                      <div className="space-y-2 text-sm" key={part.callId}>
                        <p className="font-sans font-semibold">{part.label}</p>
                        {part.interaction ? (
                          <InteractionPrompt
                            disabled={isResuming}
                            interaction={part.interaction}
                            respond={agent.respond}
                          />
                        ) : null}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </article>
          ))
        )}
        {isBusy ? (
          <div
            className="flex w-fit items-center gap-3 rounded-2xl bg-black/5 p-4 text-black/60"
            role="status"
          >
            <span
              aria-hidden
              className="block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Eve is working…
          </div>
        ) : null}
        {agent.error ? (
          <p className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800" role="alert">
            {agent.error.message}
          </p>
        ) : null}
      </div>

      <form
        action="/chat"
        className="sticky bottom-4 mt-auto flex gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-card"
        method="get"
        onSubmit={(event) => {
          const message = String(new FormData(event.currentTarget).get("message") ?? "").trim();
          if (!message || isResuming) return;
          event.preventDefault();
          event.currentTarget.reset();
          void agent.send(message);
        }}
      >
        <label className="sr-only" htmlFor="message">
          Message Eve
        </label>
        <textarea
          className="min-h-12 flex-1 resize-none rounded-xl bg-transparent px-3 py-3 outline-none"
          disabled={isResuming}
          id="message"
          name="message"
          placeholder={isResuming ? "Reconnecting…" : "Message Eve"}
          required
          rows={1}
        />
        {turn ? (
          <button className="button-light" onClick={() => void agent.cancel()} type="button">
            Stop
          </button>
        ) : null}
        <button className="button-dark" disabled={isResuming} type="submit">
          Send
        </button>
      </form>
      <noscript>
        <p className="mt-3 text-sm text-red-700">This chat requires JavaScript.</p>
      </noscript>
    </section>
  );
}

function InteractionPrompt({
  disabled,
  interaction,
  respond,
}: {
  disabled: boolean;
  interaction: Interaction;
  respond: UseEveAgentReturn["respond"];
}) {
  const options = interaction.request.options ?? [];
  const locked = disabled || interaction.status !== "open" || interaction.answer !== undefined;
  const signIn = interaction.request.signIn;

  if (signIn) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-3 text-black">
        <p>{signIn.instructions ?? interaction.request.prompt}</p>
        {signIn.userCode ? <code className="mt-2 block">{signIn.userCode}</code> : null}
        {signIn.url ? (
          <a
            className="mt-3 inline-block font-sans font-semibold underline"
            href={signIn.url}
            rel="noreferrer"
            target="_blank"
          >
            Sign in
          </a>
        ) : null}
      </div>
    );
  }

  if (locked) {
    const selected = options.find(({ id }) => id === interaction.answer?.optionId)?.label;
    return (
      <p className="whitespace-pre-line rounded-xl border border-black/10 bg-white p-3 text-black">
        {interaction.request.prompt}
        {interaction.answer ? ` — ${selected ?? interaction.answer.text ?? "answered"}` : ""}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-3 text-black">
      <p className="whitespace-pre-line">{interaction.request.prompt}</p>
      {options.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              className={option.style === "danger" ? "button-dark" : "button-light"}
              key={option.id}
              onClick={() => void respond([{ interactionId: interaction.interactionId, optionId: option.id }])}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      {interaction.request.allowFreeform || options.length === 0 ? (
        <form
          action="/chat"
          className="mt-3 flex gap-2"
          method="get"
          onSubmit={(event) => {
            const text = String(new FormData(event.currentTarget).get("answer") ?? "").trim();
            if (!text) return;
            event.preventDefault();
            void respond([{ interactionId: interaction.interactionId, text }]);
          }}
        >
          <label className="sr-only" htmlFor={`answer-${interaction.interactionId}`}>
            Your answer
          </label>
          <input
            className="min-w-0 flex-1 rounded-xl border border-black/20 px-3"
            id={`answer-${interaction.interactionId}`}
            name="answer"
            required
          />
          <button className="button-dark" type="submit">
            Answer
          </button>
        </form>
      ) : null}
    </div>
  );
}
