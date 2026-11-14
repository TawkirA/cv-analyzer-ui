"use client"

import { useRef, useState } from "react";
import { validateServiceKey } from "../lib/service-key";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

interface ATSCategoryScore {
    category: string;
    score: number;
    max_score: number;
    reason: string;
}

interface SectionAnalysis {
    section_name: string;
    score: number;
    findings: string[];
    suggestions: string[];
}

interface AnalyzeResponse {
    overall_score?: number | null;
    ats_score?: number | null;
    ats_breakdown?: ATSCategoryScore[];
    ats_issues?: string[];
    recommendations?: string[];
    strengths?: string[];
    weaknesses?: string[];
    missing_sections?: string[];
    keyword_gaps?: string[];
    section_analysis?: SectionAnalysis[];
    final_recommendations?: string[];
    filename: string;
    model_used: string;
    sections?: Record<string, string>;
}

interface CvAnalyzerProps {
    provider: string;
    model: string;
    apiKey: string;
    serviceKey: string;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

async function readError(res: Response): Promise<string> {
    try {
        const body = await res.json();
        if (typeof body?.detail === "string") return body.detail;
        if (Array.isArray(body?.detail)) {
            return body.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ");
        }
    } catch {
        // fall through to generic message
    }
    return `Request failed (${res.status})`;
}

type Tone = "green" | "red" | "amber" | "indigo";
type IconName = "check" | "alert" | "shield" | "bulb" | "plus" | "search" | "list" | "star";

const TONES: Record<Tone, { iconBg: string; headerFrom: string; badge: string; dot: string; num: string; tag: string }> = {
    green: {
        iconBg: "bg-green-600",
        headerFrom: "from-green-50",
        badge: "bg-green-100 text-green-700",
        dot: "bg-green-500",
        num: "bg-green-50 text-green-700",
        tag: "bg-green-50 text-green-700 ring-green-200",
    },
    red: {
        iconBg: "bg-red-600",
        headerFrom: "from-red-50",
        badge: "bg-red-100 text-red-700",
        dot: "bg-red-500",
        num: "bg-red-50 text-red-700",
        tag: "bg-red-50 text-red-700 ring-red-200",
    },
    amber: {
        iconBg: "bg-amber-500",
        headerFrom: "from-amber-50",
        badge: "bg-amber-100 text-amber-700",
        dot: "bg-amber-500",
        num: "bg-amber-50 text-amber-700",
        tag: "bg-amber-50 text-amber-800 ring-amber-200",
    },
    indigo: {
        iconBg: "bg-indigo-600",
        headerFrom: "from-indigo-50",
        badge: "bg-indigo-100 text-indigo-700",
        dot: "bg-indigo-500",
        num: "bg-indigo-50 text-indigo-700",
        tag: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    },
};

const ICON_PATHS: Record<IconName, string[]> = {
    check: ["M9 12l2 2 4-4", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"],
    alert: ["M12 9v4", "M12 17h.01", "M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
    shield: ["M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z", "M9 12l2 2 4-4"],
    bulb: ["M9 18h6", "M10 21h4", "M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"],
    plus: ["M12 5v14", "M5 12h14"],
    search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.3-4.3"],
    list: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
    star: ["M12 3l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.4l6-.9z"],
};

function scoreColor(percent: number) {
    if (percent >= 75) return "bg-green-500";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-red-500";
}

function scoreTone(percent: number) {
    if (percent >= 75) return { chip: "bg-green-100 text-green-700", ring: "text-green-500", label: "Strong" };
    if (percent >= 50) return { chip: "bg-yellow-100 text-yellow-800", ring: "text-yellow-500", label: "Fair" };
    return { chip: "bg-red-100 text-red-700", ring: "text-red-500", label: "Needs work" };
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
    const percent = max > 0 ? Math.min(100, Math.max(0, (score / max) * 100)) : 0;
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200/70">
            <div className={`h-2 rounded-full ${scoreColor(percent)}`} style={{ width: `${percent}%` }} />
        </div>
    );
}

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {ICON_PATHS[name].map((d) => <path key={d} d={d} />)}
        </svg>
    );
}

function Chevron() {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
    );
}

function Panel({ tone, icon, title, subtitle, badge, children }: {
    tone: Tone;
    icon: IconName;
    title: string;
    subtitle?: string;
    badge?: string;
    children: React.ReactNode;
}) {
    const t = TONES[tone];
    return (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <header className={`flex items-center justify-between gap-3 border-b border-gray-100 bg-linear-to-r ${t.headerFrom} via-white to-white px-6! py-5!`}>
                <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${t.iconBg}`}>
                        <Icon name={icon} />
                    </span>
                    <div>
                        <h3 className="text-lg font-bold leading-tight text-gray-900">{title}</h3>
                        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                    </div>
                </div>
                {badge && (
                    <span className={`shrink-0 rounded-full px-3! py-1! text-xs font-semibold ${t.badge}`}>{badge}</span>
                )}
            </header>
            <div className="p-4! sm:p-6!">{children}</div>
        </section>
    );
}

function ScoreCard({ label, caption, score }: { label: string; caption?: string; score?: number | null }) {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const percent = score != null ? Math.min(100, Math.max(0, score)) : 0;
    const t = scoreTone(percent);
    return (
        <div className="flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5! shadow-sm">
            <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 88 88" className="h-24 w-24 -rotate-90" aria-hidden="true">
                    <circle cx="44" cy="44" r={radius} fill="none" strokeWidth="8" className="stroke-gray-100" />
                    {score != null && (
                        <circle
                            cx="44"
                            cy="44"
                            r={radius}
                            fill="none"
                            strokeWidth="8"
                            strokeLinecap="round"
                            stroke="currentColor"
                            className={t.ring}
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - percent / 100)}
                        />
                    )}
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-900">
                    {score ?? "—"}
                </span>
            </div>
            <div className="min-w-0">
                <p className="font-semibold text-gray-900">{label}</p>
                {caption && <p className="text-sm text-gray-500">{caption}</p>}
                {score != null && (
                    <span className={`mt-2! inline-block rounded-full px-2.5! py-0.5! text-xs font-semibold ${t.chip}`}>
                        {t.label} · {score} / 100
                    </span>
                )}
            </div>
        </div>
    );
}

function BulletList({ items, dot }: { items: string[]; dot: string }) {
    return (
        <ul className="mt-2! flex flex-col gap-2 text-sm leading-relaxed text-gray-700">
            {items.map((item, i) => (
                <li key={i} className="flex gap-2.5">
                    <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                    <span className="wrap-break-word">{item}</span>
                </li>
            ))}
        </ul>
    );
}

function ListCard({ title, subtitle, items, tone = "indigo", icon, numbered }: {
    title: string;
    subtitle?: string;
    items?: string[];
    tone?: Tone;
    icon: IconName;
    numbered?: boolean;
}) {
    if (!items?.length) return null;
    const t = TONES[tone];
    return (
        <Panel tone={tone} icon={icon} title={title} subtitle={subtitle} badge={`${items.length} ${items.length === 1 ? "item" : "items"}`}>
            {numbered ? (
                <ol className="flex flex-col gap-3">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4! py-3!">
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${t.num}`}>
                                {i + 1}
                            </span>
                            <span className="text-sm leading-relaxed text-gray-700 wrap-break-word">{item}</span>
                        </li>
                    ))}
                </ol>
            ) : (
                <BulletList items={items} dot={t.dot} />
            )}
        </Panel>
    );
}

function TagCard({ title, subtitle, items, tone = "indigo", icon }: {
    title: string;
    subtitle?: string;
    items?: string[];
    tone?: Tone;
    icon: IconName;
}) {
    if (!items?.length) return null;
    const t = TONES[tone];
    return (
        <Panel tone={tone} icon={icon} title={title} subtitle={subtitle} badge={`${items.length} ${items.length === 1 ? "item" : "items"}`}>
            <div className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                    <span key={i} className={`rounded-full px-3! py-1! text-sm font-medium ring-1 ring-inset ${t.tag}`}>
                        {item}
                    </span>
                ))}
            </div>
        </Panel>
    );
}

export default function CvAnalyzer({ provider, model, apiKey, serviceKey }: CvAnalyzerProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalyzeResponse | null>(null);

    const selectFile = (selected: File | undefined) => {
        if (!selected) return;
        const name = selected.name.toLowerCase();
        if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
            setError("Unsupported file type. Please upload a .pdf or .docx file.");
            return;
        }
        setError(null);
        setResult(null);
        setFile(selected);
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            if (!(await validateServiceKey(serviceKey))) {
                throw new Error("Invalid API key. Enter a valid API key to continue.");
            }
            const form = new FormData();
            form.append("cv", file);
            form.append("provider", provider);
            if (model) form.append("model_name", model);
            if (apiKey) form.append("api_key", apiKey);

            const res = await fetch(`${API_BASE_URL}/api/v1/analyze`, { method: "POST", body: form });
            if (!res.ok) throw new Error(await readError(res));
            setResult((await res.json()) as AnalyzeResponse);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!result) return;
        setDownloading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/report/pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result),
            });
            if (!res.ok) throw new Error(await readError(res));
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `CV_Analysis_Report_${result.filename}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError(e instanceof Error ? e.message : "PDF download failed");
        } finally {
            setDownloading(false);
        }
    };

    const sections = result?.sections ? Object.entries(result.sections) : [];

    return (
        <div className="space-y-6 mt-4!">
            {/* Upload */}
            <div className="rounded-lg border border-gray-200 bg-white p-4!">
                <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        selectFile(e.dataTransfer.files[0]);
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8! text-center transition ${
                        dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:bg-gray-50"
                    }`}
                >
                    <p className="font-semibold text-gray-900">
                        {file ? file.name : "Drag & drop your CV here, or click to browse"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supported formats: .pdf, .docx"}
                    </p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPTED_EXTENSIONS.join(",")}
                        className="hidden"
                        onChange={(e) => {
                            selectFile(e.target.files?.[0]);
                            e.target.value = "";
                        }}
                    />
                </div>

                <div className="mt-4! p-2! flex items-center gap-4">
                    <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={!file || loading}
                        className="rounded-md bg-blue-600 px-4! py-2! font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                        {loading ? "Analyzing…" : "Start analysis"}
                    </button>
                    {file && !loading && (
                        <button
                            type="button"
                            onClick={() => { setFile(null); setResult(null); setError(null); }}
                            className="rounded-md px-4! py-2! bg-indigo-300 font-semibold text-md text-fuchsia-900 hover:text-gray-900"
                        >
                            Clear file
                        </button>
                    )}
                    <span className="text-sm text-gray-500">
                        {provider}{model ? ` · ${model}` : ""}
                    </span>
                </div>
            </div>

            {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3! mt-2! text-sm text-red-700">
                    {error}
                </div>
            )}

            {loading && (
                <p className="text-center text-sm mt-2! text-gray-500">
                    Analyzing your CV. This can take a little while…
                </p>
            )}

            {result && (
                <>
                    {/* Extracted sections */}
                    {sections.length > 0 && (
                        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm mt-2!">
                            <header className="flex items-center justify-between gap-3 border-b border-gray-100 bg-linear-to-r from-indigo-50 via-white to-white px-6! py-5!">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                                            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                                            <path d="M14 3v5h5" />
                                            <path d="M9 13h6M9 17h4" />
                                        </svg>
                                    </span>
                                    <div>
                                        <h2 className="text-lg font-bold leading-tight text-gray-900">Extracted sections</h2>
                                        <p className="text-sm text-gray-500">Content detected in your CV, grouped by section</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-indigo-100 px-3! py-1! text-xs font-semibold text-indigo-700">
                                    {sections.length} {sections.length === 1 ? "section" : "sections"}
                                </span>
                            </header>

                            <div className="flex flex-col gap-3 p-4! sm:p-6!">
                                {sections.map(([name, text], index) => {
                                    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
                                    return (
                                        <details
                                            key={name}
                                            open={index === 0}
                                            className="group rounded-xl border border-gray-200 bg-white transition hover:border-indigo-200 open:border-indigo-200 open:shadow-sm"
                                        >
                                            <summary className="flex cursor-pointer list-none items-center gap-3 px-4! py-3! select-none [&::-webkit-details-marker]:hidden">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600 transition group-open:bg-indigo-600 group-open:text-white">
                                                    {index + 1}
                                                </span>
                                                <span className="flex-1 font-semibold capitalize text-gray-900">
                                                    {name.replace(/[_-]+/g, " ")}
                                                </span>
                                                <span className="rounded-full bg-gray-100 px-2.5! py-0.5! text-xs font-medium text-gray-500">
                                                    {wordCount} {wordCount === 1 ? "word" : "words"}
                                                </span>
                                                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                                                </svg>
                                            </summary>
                                            <div className="mx-4! mb-4! rounded-lg border-l-4 border-indigo-400 bg-gray-50 px-4! py-3!">
                                                <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-gray-700">
                                                    {text}
                                                </p>
                                            </div>
                                        </details>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Results */}
                    <section className="flex flex-col gap-5 mb-5!">
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2! mb-1!">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Analysis report</h2>
                                <p className="text-sm text-gray-500">
                                    {result.filename} · {result.model_used}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={downloading}
                                className="rounded-md bg-blue-500 px-4! py-1! font-semibold text-shadow-taupe-300 shadow-sm ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed hover:cursor-pointer disabled:text-gray-400"
                            >
                                {downloading ? "Generating PDF…" : "Download PDF report"}
                            </button>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <ScoreCard label="Overall score" caption="Quality of your CV content" score={result.overall_score} />
                            <ScoreCard label="ATS score" caption="Compatibility with tracking systems" score={result.ats_score} />
                        </div>

                        {!!result.ats_breakdown?.length && (
                            <Panel
                                tone="indigo"
                                icon="shield"
                                title="ATS breakdown"
                                subtitle="How your CV scores per ATS category"
                                badge={`${result.ats_breakdown.length} categories`}
                            >
                                <div className="flex flex-col gap-4">
                                    {result.ats_breakdown.map((c) => {
                                        const t = scoreTone(c.max_score > 0 ? (c.score / c.max_score) * 100 : 0);
                                        return (
                                            <div key={c.category} className="rounded-xl border border-gray-100 bg-gray-50 p-4!">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="font-semibold text-gray-900">{c.category}</span>
                                                    <span className={`rounded-full px-2.5! py-0.5! text-xs font-semibold ${t.chip}`}>
                                                        {c.score} / {c.max_score}
                                                    </span>
                                                </div>
                                                <div className="mt-3!"><ScoreBar score={c.score} max={c.max_score} /></div>
                                                <p className="mt-3! text-sm leading-relaxed text-gray-600">{c.reason}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Panel>
                        )}

                        <div className="grid gap-5 md:grid-cols-2">
                            <ListCard title="Strengths" subtitle="What your CV does well" items={result.strengths} tone="green" icon="check" />
                            <ListCard title="Weaknesses" subtitle="Areas that hold your CV back" items={result.weaknesses} tone="red" icon="alert" />
                            <ListCard title="ATS issues" subtitle="Problems for automated parsers" items={result.ats_issues} tone="red" icon="shield" />
                            <ListCard title="Recommendations" subtitle="Suggested improvements" items={result.recommendations} tone="indigo" icon="bulb" numbered />
                            <TagCard title="Missing sections" subtitle="Sections recruiters expect to see" items={result.missing_sections} tone="amber" icon="plus" />
                            <TagCard title="Keyword gaps" subtitle="Keywords worth adding" items={result.keyword_gaps} tone="indigo" icon="search" />
                        </div>

                        {!!result.section_analysis?.length && (
                            <Panel
                                tone="indigo"
                                icon="list"
                                title="Section analysis"
                                subtitle="Detailed feedback for each section"
                                badge={`${result.section_analysis.length} sections`}
                            >
                                <div className="flex flex-col gap-3">
                                    {result.section_analysis.map((s, index) => {
                                        const t = scoreTone(s.score);
                                        return (
                                            <details
                                                key={s.section_name}
                                                open={index === 0}
                                                className="group rounded-xl border border-gray-200 bg-white transition hover:border-indigo-200 open:border-indigo-200 open:shadow-sm"
                                            >
                                                <summary className="flex cursor-pointer list-none items-center gap-3 px-4! py-3! select-none [&::-webkit-details-marker]:hidden">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600 transition group-open:bg-indigo-600 group-open:text-white">
                                                        {index + 1}
                                                    </span>
                                                    <span className="flex-1 font-semibold capitalize text-gray-900">
                                                        {s.section_name.replace(/[_-]+/g, " ")}
                                                    </span>
                                                    <span className={`rounded-full px-2.5! py-0.5! text-xs font-semibold ${t.chip}`}>
                                                        {s.score} / 100
                                                    </span>
                                                    <Chevron />
                                                </summary>
                                                <div className="mx-4! mb-4! flex flex-col gap-4">
                                                    <ScoreBar score={s.score} />
                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        {s.findings.length > 0 && (
                                                            <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50/60 px-4! py-3!">
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Findings</p>
                                                                <BulletList items={s.findings} dot="bg-amber-500" />
                                                            </div>
                                                        )}
                                                        {s.suggestions.length > 0 && (
                                                            <div className="rounded-lg border-l-4 border-indigo-400 bg-indigo-50/60 px-4! py-3!">
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Suggestions</p>
                                                                <BulletList items={s.suggestions} dot="bg-indigo-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </details>
                                        );
                                    })}
                                </div>
                            </Panel>
                        )}

                        <ListCard
                            title="Final recommendations"
                            subtitle="Your top priorities to act on"
                            items={result.final_recommendations}
                            tone="indigo"
                            icon="star"
                            numbered
                        />
                    </section>
                </>
            )}
        </div>
    );
}
