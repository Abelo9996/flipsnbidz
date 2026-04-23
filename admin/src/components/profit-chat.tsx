"use client";

import { apiUrl } from "@/lib/api";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, Send, X, Sparkles, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie,
} from "recharts";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface SeriesDef {
  key: string;
  name: string;
  color: string;
  stackId?: string;
  type?: "bar" | "line" | "area";
}

interface ChartBlock {
  block: "chart";
  type: "bar" | "line" | "area" | "composed" | "pie";
  title: string;
  data: Record<string, unknown>[];
  series?: SeriesDef[];
  xKey?: string;
}

interface TableBlock {
  block: "table";
  title: string;
  columns: { key: string; label: string; align?: "left" | "center" | "right" }[];
  rows: Record<string, unknown>[];
  highlight?: number[];
}

interface KpiBlock {
  block: "kpi";
  cards: { label: string; value: string; sub?: string; color?: string }[];
}

type RenderBlock = ChartBlock | TableBlock | KpiBlock;

interface Message {
  role: "user" | "assistant";
  content: string;
  blocks?: RenderBlock[];
}

/* ── Style constants ───────────────────────────────────────────────────── */
const tickStyle = { fill: "#9ca3af", fontSize: 11 };
const gridProps = { strokeDasharray: "3 3", stroke: "#374151" };

/* ── Starter prompts ───────────────────────────────────────────────────── */
const STARTER_PROMPTS = [
  "How is the business performing overall?",
  "What are the most profitable months and why?",
  "How do auction vs cash sales compare as channels?",
  "What's the best pallet purchasing strategy based on the data?",
  "Which expenses are growing fastest?",
  "What should we focus on to improve profitability?",
];

/* ── Markdown renderer ─────────────────────────────────────────────────── */
function Markdown({ text }: { text: string }) {
  const html = text
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-white mt-3 mb-1 text-sm">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-white mt-3 mb-1 text-base">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold text-white mt-4 mb-1 text-lg">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-xs text-blue-300">$1</code>')
    .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return (
    <div
      className="text-sm text-gray-300 leading-relaxed prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ── Chart renderer ────────────────────────────────────────────────────── */
function ChartRenderer({ block }: { block: ChartBlock }) {
  const { type, title, data, series = [], xKey = "name" } = block;

  const content = (() => {
    if (type === "pie") {
      return (
        <PieChart>
          <Pie
            data={data as { name: string; value: number; color?: string }[]}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {(data as { name: string; value: number; color?: string }[]).map((entry, i) => (
              <Cell key={i} fill={entry.color || `hsl(${i * 47}, 70%, 55%)`} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#9ca3af" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
        </PieChart>
      );
    }

    const tooltipProps = {
      contentStyle: { background: "#111827", border: "1px solid #374151", borderRadius: 8 },
      labelStyle: { color: "#fff" },
      itemStyle: { color: "#9ca3af" },
    };
    const axisProps = {
      xAxis: <XAxis dataKey={xKey} tick={tickStyle} axisLine={false} tickLine={false} />,
      yAxis: <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={50} />,
      grid: <CartesianGrid {...gridProps} />,
    };

    if (type === "bar") {
      return (
        <BarChart data={data}>
          {axisProps.grid}
          {axisProps.xAxis}
          {axisProps.yAxis}
          <Tooltip {...tooltipProps} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={s.stackId} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      );
    }

    if (type === "line") {
      return (
        <LineChart data={data}>
          {axisProps.grid}
          {axisProps.xAxis}
          {axisProps.yAxis}
          <Tooltip {...tooltipProps} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      );
    }

    if (type === "area") {
      return (
        <AreaChart data={data}>
          {axisProps.grid}
          {axisProps.xAxis}
          {axisProps.yAxis}
          <Tooltip {...tooltipProps} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.2} strokeWidth={2} />
          ))}
        </AreaChart>
      );
    }

    // composed
    return (
      <ComposedChart data={data}>
        {axisProps.grid}
        {axisProps.xAxis}
        {axisProps.yAxis}
        <Tooltip {...tooltipProps} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
        {series.map((s) => {
          const t = s.type || "bar";
          if (t === "line") return <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} dot={false} strokeWidth={2} />;
          if (t === "area") return <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.2} strokeWidth={2} />;
          return <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={s.stackId} radius={[2, 2, 0, 0]} />;
        })}
      </ComposedChart>
    );
  })();

  return (
    <div className="mt-3 rounded-xl border border-gray-800 bg-gray-900/60 p-3">
      {title && <p className="text-xs font-semibold text-gray-300 mb-2">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        {content}
      </ResponsiveContainer>
    </div>
  );
}

/* ── Table renderer ────────────────────────────────────────────────────── */
function TableRenderer({ block }: { block: TableBlock }) {
  const { title, columns, rows, highlight = [] } = block;
  return (
    <div className="mt-3 rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
      {title && (
        <div className="px-3 py-2 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-300">{title}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-gray-500 font-medium uppercase tracking-wider text-${col.align || "left"}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-gray-800/50 last:border-0 ${
                  highlight.includes(i) ? "bg-blue-900/20" : "hover:bg-gray-800/40"
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 text-gray-300 text-${col.align || "left"}`}
                  >
                    {String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── KPI renderer ──────────────────────────────────────────────────────── */
function KpiRenderer({ block }: { block: KpiBlock }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {block.cards.map((card, i) => (
        <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{card.label}</p>
          <p className={`text-lg font-bold ${card.color || "text-white"}`}>{card.value}</p>
          {card.sub && <p className="text-[10px] text-gray-500 mt-0.5">{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ── Block renderer dispatcher ─────────────────────────────────────────── */
function RenderBlocks({ blocks }: { blocks: RenderBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.block === "chart") return <ChartRenderer key={i} block={block} />;
        if (block.block === "table") return <TableRenderer key={i} block={block} />;
        if (block.block === "kpi") return <KpiRenderer key={i} block={block} />;
        return null;
      })}
    </>
  );
}

/* ── Main chat component ───────────────────────────────────────────────── */
export function ProfitChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamBlocks, setStreamBlocks] = useState<RenderBlock[]>([]);
  const [statusMsg, setStatusMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasBlocks = messages.some((m) => m.blocks && m.blocks.length > 0);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamText, streamBlocks, scrollToBottom]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamText("");
    setStreamBlocks([]);
    setStatusMsg("");

    try {
      const res = await fetch(apiUrl("/api/profit/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: newMessages.slice(-20),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages([...newMessages, { role: "assistant", content: `Error: ${err.error || res.statusText}` }]);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let accText = "";
      let accBlocks: RenderBlock[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);

            if (parsed.content) {
              accText += parsed.content;
              setStreamText(accText);
            }
            if (parsed.status) {
              setStatusMsg(parsed.status);
            }
            if (parsed.render) {
              accBlocks = [...accBlocks, parsed.render as RenderBlock];
              setStreamBlocks([...accBlocks]);
              setStatusMsg("");
            }
            if (parsed.done) {
              // Final renders array supersedes accumulated
              if (parsed.renders && Array.isArray(parsed.renders)) {
                accBlocks = parsed.renders as RenderBlock[];
                setStreamBlocks([...accBlocks]);
              }
              setStatusMsg("");
            }
            if (parsed.error) {
              accText += `\n\nError: ${parsed.error}`;
              setStreamText(accText);
            }
          } catch {
            // skip malformed
          }
        }
      }

      setMessages([
        ...newMessages,
        { role: "assistant", content: accText, blocks: accBlocks.length > 0 ? accBlocks : undefined },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: `Failed to connect: ${err}` },
      ]);
    } finally {
      setStreaming(false);
      setStreamText("");
      setStreamBlocks([]);
      setStatusMsg("");
    }
  }

  function clearChat() {
    setMessages([]);
    setStreamText("");
    setStreamBlocks([]);
    setStatusMsg("");
  }

  const drawerWidth = hasBlocks || streamBlocks.length > 0 ? "sm:w-[640px]" : "sm:w-[440px]";

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-3 text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-500 active:scale-95 sm:bottom-6 sm:right-6 sm:px-5"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden text-sm font-medium sm:inline">Ask AI about your data</span>
        </button>
      )}

      {/* Chat drawer */}
      {open && (
        <div className={`fixed inset-y-0 right-0 z-50 flex flex-col w-full ${drawerWidth} bg-gray-950 border-l border-gray-800 shadow-2xl transition-all duration-300`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/80 backdrop-blur shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Business Intelligence</h3>
                <p className="text-[11px] text-gray-500">Powered by your spreadsheet data</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                  onClick={clearChat}
                  title="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && !streaming && (
              <div className="space-y-4 py-4">
                <div className="text-center">
                  <MessageCircle className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-1">Ask anything about your business data</p>
                  <p className="text-xs text-gray-600">Revenue, costs, trends, strategies — all backed by real numbers</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider px-1">Suggested questions</p>
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt)}
                      className="w-full text-left text-sm px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-700 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "max-w-[85%] bg-blue-600 text-white rounded-br-sm"
                      : "w-full bg-gray-900 border border-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <>
                      {msg.content && <Markdown text={msg.content} />}
                      {msg.blocks && msg.blocks.length > 0 && (
                        <RenderBlocks blocks={msg.blocks} />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming assistant message */}
            {streaming && (streamText || streamBlocks.length > 0) && (
              <div className="flex justify-start">
                <div className="w-full rounded-2xl rounded-bl-sm px-4 py-2.5 bg-gray-900 border border-gray-800">
                  {streamText && <Markdown text={streamText} />}
                  {streamBlocks.length > 0 && <RenderBlocks blocks={streamBlocks} />}
                </div>
              </div>
            )}

            {/* Status indicator */}
            {streaming && statusMsg && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2 bg-gray-900/60 border border-gray-800/60">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <div className="flex gap-1">
                      <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                      <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "200ms" }} />
                      <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "400ms" }} />
                    </div>
                    {statusMsg}
                  </div>
                </div>
              </div>
            )}

            {/* Initial loading dots */}
            {streaming && !streamText && !statusMsg && streamBlocks.length === 0 && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-gray-900 border border-gray-800">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    Analyzing your data…
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-800 px-4 py-3 bg-gray-900/80 backdrop-blur shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask about revenue, trends, strategies…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 max-h-32"
                style={{ minHeight: "40px" }}
              />
              <Button
                size="sm"
                disabled={!input.trim() || streaming}
                onClick={() => sendMessage(input)}
                className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5 px-1">
              AI analyzes your live spreadsheet data. Responses may not always be accurate.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
