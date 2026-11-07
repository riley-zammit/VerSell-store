"use client";

import { activeTurn } from "eve/events";
import { useEveAgent, type Interaction, type UseEveAgentReturn } from "eve/react";
import { useState } from "react";

// Same limits as the eve channel's uploadPolicy (agent/channels/eve.ts), checked here first
// so the customer gets a clear message instead of a rejected request.
const CREATIVE_TYPES = ["image/png", "image/jpeg"];
const MAX_CREATIVE_BYTES = 3 * 1024 * 1024;

export default function ChatPage() {
  const agent = useEveAgent();
  const isBusy = agent.status === "busy";
  const isResuming = agent.status === "resuming";
  const turn = activeTurn(agent.view);
  const [creative, setCreative] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function pickCreative(file: File | undefined) {
    setCreative(null);
    setFileError(null);
    if (!file) return;
    if (!CREATIVE_TYPES.includes(file.type)) return setFileError("Attach a PNG or JPG.");
    if (file.size > MAX_CREATIVE_BYTES) return setFileError("That image is over 3 MB. Try a smaller export.");
    setCreative(file);
  }

  // eve stages the attachment in the agent's sandbox; the agent's save_creative tool moves it to Blob.
  async function sendMessage(message: string, file: File | null) {
    if (!file) return agent.send(message);
    return agent.send([
      { type: "text", text: message || "Here's my artwork." },
      { type: "file", data: await readAsDataUrl(file), mediaType: file.type, filename: file.name },
    ]);
  }

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
        className="sticky bottom-4 mt-auto rounded-2xl border border-black/10 bg-white p-2 shadow-card"
        method="get"
        onSubmit={(event) => {
          const message = String(new FormData(event.currentTarget).get("message") ?? "").trim();
          if ((!message && !creative) || isResuming) return;
          event.preventDefault();
          event.currentTarget.reset();
          setCreative(null);
          void sendMessage(message, creative);
        }}
      >
        {creative || fileError ? (
          <p className={`px-3 pb-2 text-sm ${fileError ? "text-red-700" : "text-black/60"}`} role={fileError ? "alert" : undefined}>
            {fileError ?? (
              <>
                Attached: {creative?.name}{" "}
                <button className="font-sans font-semibold underline" onClick={() => setCreative(null)} type="button">
                  Remove
                </button>
              </>
            )}
          </p>
        ) : null}
        <div className="flex gap-2">
          <label className="button-light flex cursor-pointer items-center" title="Attach your logo or artwork">
            <span className="sr-only">Attach your logo or artwork (PNG or JPG)</span>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="m21 11-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6L15 6.6" />
            </svg>
            <input
              accept={CREATIVE_TYPES.join(",")}
              className="sr-only"
              disabled={isResuming}
              onChange={(event) => {
                pickCreative(event.currentTarget.files?.[0]);
                // State holds the file, so clear the input; picking the same file again still fires onChange.
                event.currentTarget.value = "";
              }}
              type="file"
            />
          </label>
          <label className="sr-only" htmlFor="message">
            Message Eve
          </label>
          <textarea
            className="min-h-12 flex-1 resize-none rounded-xl bg-transparent px-3 py-3 outline-none"
            disabled={isResuming}
            id="message"
            name="message"
            placeholder={isResuming ? "Reconnecting…" : "Message Eve"}
            required={!creative}
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
        </div>
      </form>
      <noscript>
        <p className="mt-3 text-sm text-red-700">This chat requires JavaScript.</p>
      </noscript>
    </section>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
