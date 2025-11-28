import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from '@/components/custom/use-scroll-to-bottom';
import { useState } from "react";
import { message } from "../../interfaces/interfaces"
import { Overview } from "@/components/custom/overview";
import { Header } from "@/components/custom/header";
import {v4 as uuidv4} from 'uuid';
import { Check, Plus } from "lucide-react";
import backgroundImage from "../../assets/1.jpg";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

function formatAssistantMessage(data: Record<string, unknown>): string {
  const combined = (data?.r_g_summary as string) || "";
  return combined || "No consolidated answer available.";
}

export function Chat() {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const [messages, setMessages] = useState<message[]>([]);
  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ingestStatus, setIngestStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [ingestMessage, setIngestMessage] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  function handleNewChat() {
    if (isLoading) return;
    setMessages([]);
    setQuestion("");
    setConversationId(null);
  }

  async function handleSubmit(text?: string) {
    if (isLoading) return;

    const messageText = (text ?? question).trim();
    if (!messageText) return;

    const traceId = uuidv4();
    setMessages((prev) => [
      ...prev,
      { content: messageText, role: "user", id: traceId, status: "done" },
      { content: "", role: "assistant", id: `${traceId}-assistant`, status: "loading" },
    ]);
    setQuestion("");
    setIsLoading(true);

    try {
      const requestBody: { query: string; conversation_id?: string } = { query: messageText };
      if (conversationId) {
        requestBody.conversation_id = conversationId;
      }

      const response = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Update conversation_id if provided
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }
      
      const fullText = formatAssistantMessage(data);
      const words = fullText.split(" ");

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === `${traceId}-assistant`
            ? { ...msg, content: "", status: "loading" }
            : msg
        )
      );

      for (let i = 0; i < words.length; i++) {
        const chunk = words.slice(0, i + 1).join(" ");
        await new Promise((resolve) => setTimeout(resolve, 35));
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === `${traceId}-assistant`
              ? { ...msg, content: chunk, status: "loading" }
              : msg
          )
        );
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === `${traceId}-assistant`
            ? { ...msg, status: "done" }
            : msg
        )
      );
    } catch (error) {
      console.error("Query error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === `${traceId}-assistant`
            ? {
                ...msg,
                content: "I couldn't process that request right now. Please try again.",
                status: "error",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleIngest() {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    setIngestStatus("uploading");
    setIngestMessage("");

    try {
      const response = await fetch(`${API_BASE}/ingest`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed with status ${response.status}`);
      }

      const data = await response.json();
      setIngestStatus("done");
      setIngestMessage(`Ingestion started for ${data.original_filename || selectedFile.name}`);
      setSelectedFile(null);
    } catch (error) {
      console.error("Ingestion error:", error);
      setIngestStatus("error");
      setIngestMessage("Failed to ingest the PDF. Please try again.");
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-background relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-95 dark:opacity-90"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          filter: 'blur(0px)',
        }}
      />
      {/* Overlay for better text readability */}
      <div className="fixed inset-0 z-0 bg-background/10 dark:bg-background/15" />
      
      <div className="relative z-10 flex flex-col h-full">
        <Header />
        <div className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4" ref={messagesContainerRef}>
        <div className="w-full px-4 max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-background via-muted/50 to-muted/20 shadow-md backdrop-blur-md p-3 flex flex-col gap-2 ring-1 ring-primary/10">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                PDF ingest
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                beta
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Drop a PDF to add it to your workspace graph.
            </p>
            <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                className="text-[11px] md:text-xs flex-1 rounded-lg border border-white/10 bg-background/80 px-3 py-1.5 shadow-inner focus:border-primary outline-none transition"
                disabled={ingestStatus === "uploading"}
              />
              <button
                onClick={handleIngest}
                disabled={!selectedFile || ingestStatus === "uploading"}
                className="px-3 py-1.5 rounded-lg text-[11px] md:text-xs bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold shadow shadow-primary/15 disabled:opacity-60 disabled:shadow-none transition"
              >
                {ingestStatus === "uploading" ? "Ingesting..." : "Ingest PDF"}
              </button>
            </div>
            {ingestStatus === "uploading" && (
              <div className="flex items-center gap-1 h-4">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: `${dot * 0.15}s` }}
                  />
                ))}
              </div>
            )}
            {ingestStatus === "done" && (
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium h-4">
                <Check size={14} strokeWidth={2} />
              </div>
            )}
            {ingestStatus === "error" && (
              <p className="text-[11px] text-destructive">{ingestMessage}</p>
            )}
          </div>
        </div>

        {messages.length == 0 && <Overview />}
        {messages.map((message, index) =>
          message.role === "assistant" && message.status === "loading" && !message.content ? (
            <ThinkingMessage key={message.id ?? index} />
          ) : (
            <PreviewMessage key={index} message={message} />
          )
        )}
        <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]"/>
        </div>
        <div className="flex flex-col mx-auto px-4 pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {conversationId && (
            <div className="flex justify-end">
              <button
                onClick={handleNewChat}
                disabled={isLoading}
                className="group relative px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/90 to-primary/80 text-primary-foreground font-medium text-xs shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center gap-1.5 border border-primary/30 backdrop-blur-sm"
              >
                <Plus className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
                <span>New Chat</span>
              </button>
            </div>
          )}
          <ChatInput  
            question={question}
            setQuestion={setQuestion}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};
