"use client";

import { useState, useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../lib/firebase";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Inline icons (no external icon package required)                   */
/* ------------------------------------------------------------------ */

type IconProps = { size?: number; className?: string };
const iconBase = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function LayoutDashboard({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function History({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  );
}

function GaugeIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <path d="M5 19a7 7 0 1 1 14 0" />
      <line x1="12" y1="13" x2="15" y2="9.5" />
      <circle cx="12" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Info({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Menu({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function X({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

function Bell({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <path d="M6 8a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 14 6 8z" />
      <path d="M10.3 20a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function Wifi({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <path d="M5 13a10 10 0 0 1 14 0" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WifiOff({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <line x1="2.5" y1="2.5" x2="21.5" y2="21.5" />
      <path d="M5 13a10 10 0 0 1 5.3-2.7" />
      <path d="M19 13a10 10 0 0 0-2.7-2.1" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AlertTriangle({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <path d="M12 3 2 21h20L12 3z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <circle cx="12" cy="17.2" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Activity({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...iconBase}>
      <polyline points="3 12 8 12 10 18 14 6 16 12 21 12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MAX_VALUE = 1500;

function polarToCartesian(cx: number, cy: number, r: number, thetaDeg: number) {
  const rad = (thetaDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function valueToTheta(value: number, max = MAX_VALUE) {
  return 180 - (Math.min(Math.max(value, 0), max) / max) * 180;
}

function describeZoneArc(cx: number, cy: number, r: number, startVal: number, endVal: number) {
  const start = polarToCartesian(cx, cy, r, valueToTheta(startVal));
  const end = polarToCartesian(cx, cy, r, valueToTheta(endVal));
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

type StatusKey = "AMAN" | "WASPADA" | "BAHAYA";

const STATUS_STYLES: Record<
  string,
  { textClass: string; bgClass: string; dotClass: string; label: string; desc: string }
> = {
  AMAN: {
    textClass: "text-[#2DD4A8]",
    bgClass: "bg-[#2DD4A8]/10",
    dotClass: "bg-[#2DD4A8]",
    label: "AMAN",
    desc: "Kadar gas dalam batas normal",
  },
  WASPADA: {
    textClass: "text-[#F5A623]",
    bgClass: "bg-[#F5A623]/10",
    dotClass: "bg-[#F5A623]",
    label: "WASPADA",
    desc: "Kadar gas mendekati ambang batas",
  },
  BAHAYA: {
    textClass: "text-[#FF4458]",
    bgClass: "bg-[#FF4458]/10",
    dotClass: "bg-[#FF4458]",
    label: "BAHAYA",
    desc: "Kadar gas melebihi ambang batas aman",
  },
};

const ZONES = [
  {
    label: "AMAN",
    range: "0 – 499",
    textClass: "text-[#2DD4A8]",
    dotClass: "bg-[#2DD4A8]",
    desc: "Kondisi udara normal. Tidak ada tindakan yang diperlukan.",
  },
  {
    label: "WASPADA",
    range: "500 – 899",
    textClass: "text-[#F5A623]",
    dotClass: "bg-[#F5A623]",
    desc: "Kadar gas mulai meningkat. Periksa sumber kebocoran dan tingkatkan ventilasi ruangan.",
  },
  {
    label: "BAHAYA",
    range: "900 – 1500",
    textClass: "text-[#FF4458]",
    dotClass: "bg-[#FF4458]",
    desc: "Kadar gas pada level berbahaya. Evakuasi area, matikan sumber api/listrik, dan hubungi petugas terkait.",
  },
];

type LogEntry = { status: string; time: string };

/* ------------------------------------------------------------------ */
/*  Small presentational components                                    */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
  accentClass,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accentClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1E2738] bg-[#121826] p-5 flex items-center gap-4">
      <div className="h-10 w-10 shrink-0 rounded-xl bg-white/[0.03] border border-[#1E2738] flex items-center justify-center text-[#7C8AA0]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-[#5B6678]">{label}</p>
        <p className={`font-data text-lg font-semibold mt-0.5 truncate ${accentClass || "text-[#E7ECF3]"}`}>{value}</p>
      </div>
    </div>
  );
}

function HistoryTable({ items }: { items: LogEntry[] }) {
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {items.length === 0 && (
          <p className="text-sm text-[#5B6678] py-8 text-center">Belum ada data riwayat untuk sesi ini.</p>
        )}
        {items.map((log, i) => {
          const s = STATUS_STYLES[log.status] || {
            textClass: "text-[#7C8AA0]",
            bgClass: "bg-[#7C8AA0]/10",
            dotClass: "bg-[#7C8AA0]",
            label: log.status,
            desc: "",
          };
          return (
            <motion.div
              key={`${log.time}-${i}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-[#1E2738]"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full shrink-0 ${s.dotClass}`} />
                <span className={`text-sm font-semibold ${s.textClass}`}>{s.label}</span>
              </div>
              <span className="font-data text-xs text-[#7C8AA0]">{log.time}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main dashboard                                                     */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [statusGas, setStatusGas] = useState("MEMUAT...");
  const [dataGrafik, setDataGrafik] = useState<{ time: string; value: number }[]>([]);
  const [riwayat, setRiwayat] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "riwayat" | "ambang" | "tentang">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clock, setClock] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [readingCount, setReadingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const lastUpdateRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());

  // Firebase realtime listener (unchanged data source/logic)
  useEffect(() => {
    const statusRef = ref(database, "Status_Gas");

    const unsubscribe = onValue(statusRef, (snapshot) => {
      const status = snapshot.val();
      if (status) {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString("id-ID", { hour12: false });

        lastUpdateRef.current = Date.now();
        setIsOnline(true);
        setStatusGas(status);
        setReadingCount((c) => c + 1);

        let nilaiNumerik = status === "AMAN" ? 300 : status === "WASPADA" ? 700 : 1200;
        setDataGrafik((prev) => [...prev.slice(-19), { time: timeLabel, value: nilaiNumerik }]);
        setRiwayat((prev) => [{ status, time: timeLabel }, ...prev].slice(0, 20));
      }
    });

    return () => unsubscribe();
  }, []);

  // Clock, session timer, connection watchdog
  useEffect(() => {
    const tick = setInterval(() => {
      setClock(new Date().toLocaleTimeString("id-ID", { hour12: false }));
      setElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      if (Date.now() - lastUpdateRef.current > 15000) setIsOnline(false);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const currentValue = dataGrafik.length ? dataGrafik[dataGrafik.length - 1].value : 0;
  const needleRotation = (Math.min(currentValue, MAX_VALUE) / MAX_VALUE) * 180 - 90;
  const style = STATUS_STYLES[statusGas] || {
    textClass: "text-[#7C8AA0]",
    bgClass: "bg-[#7C8AA0]/10",
    dotClass: "bg-[#7C8AA0]",
    label: statusGas,
    desc: "Menunggu data dari sensor...",
  };
  const alertCount = riwayat.filter((r) => r.status !== "AMAN").length;

  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "riwayat" as const, label: "Riwayat", icon: History },
    { id: "ambang" as const, label: "Ambang Batas", icon: GaugeIcon },
    { id: "tentang" as const, label: "Tentang", icon: Info },
  ];

  return (
    <div className="min-h-screen bg-[#0A0E16] text-[#E7ECF3] font-body">
      {/* Move this font import + the classes below to your global.css / layout.tsx for best performance */}
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap");
        .font-body { font-family: 'Inter', sans-serif; }
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-data { font-family: 'JetBrains Mono', monospace; }
        .gauge-pivot { transform-origin: 120px 140px; }
      `}</style>

      {/* ---------------- Navbar ---------------- */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[#1E2738] bg-[#0D1320]/95 backdrop-blur px-4 md:px-6 h-16">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/5"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#4F9DFF] to-[#2DD4A8] flex items-center justify-center">
              <GaugeIcon size={18} className="text-[#0A0E16]" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold tracking-tight">
                OkeGas
              </p>
              <p className="text-[11px] text-[#7C8AA0] -mt-0.5">Sistem Monitoring Gas Real-Time</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#1E2738] bg-white/[0.02]">
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-[#2DD4A8] animate-pulse" : "bg-[#FF4458]"}`} />
            <span className="font-data text-[11px] text-[#9AA6B8]">
              {isOnline ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <div className="hidden sm:block text-[#7C8AA0]">
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} className="text-[#FF4458]" />}
          </div>
          <div className="hidden md:block text-sm text-[#9AA6B8] tabular-nums w-[88px] font-data">
            {clock}
          </div>
          <button className="relative p-2 rounded-lg hover:bg-white/5" aria-label="Notifikasi">
            <Bell size={18} />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#FF4458] text-[10px] flex items-center justify-center font-semibold">
                {alertCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ---------------- Danger banner ---------------- */}
      <AnimatePresence>
        {statusGas === "BAHAYA" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#FF4458] text-white"
          >
            <div className="flex items-center gap-2 px-4 md:px-6 py-2 text-sm font-medium">
              <AlertTriangle size={16} className="shrink-0 animate-pulse" />
              <span>
                BAHAYA TERDETEKSI — kadar gas melebihi ambang batas aman. Segera periksa lokasi dan ikuti prosedur keselamatan.
              </span>
              <span className="font-data ml-auto shrink-0 text-xs opacity-90">
                {clock}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex">
        {/* ---------------- Sidebar (desktop) ---------------- */}
        <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-[#1E2738] bg-[#0D1320] min-h-[calc(100vh-64px)] px-3 py-5">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors border ${
                    active
                      ? "bg-[#4F9DFF]/10 text-[#4F9DFF] border-[#4F9DFF]/20"
                      : "text-[#9AA6B8] hover:bg-white/5 border-transparent"
                  }`}
                >
                  <Icon size={17} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-auto pt-5">
            <div className="px-3 py-3 rounded-xl bg-white/[0.02] border border-[#1E2738]">
              <p className="text-[10px] uppercase tracking-widest text-[#5B6678]">Node Sensor</p>
              <p className="font-data text-xs text-[#9AA6B8] mt-1">
                NODE-01 · v2.0
              </p>
            </div>
          </div>
        </aside>

        {/* ---------------- Sidebar (mobile drawer) ---------------- */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: "tween" }}
                className="fixed top-0 left-0 bottom-0 w-60 bg-[#0D1320] border-r border-[#1E2738] z-50 md:hidden px-3 py-5 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="font-display font-semibold">
                    Menu
                  </span>
                  <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="Tutup menu">
                    <X size={18} />
                  </button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border ${
                          active
                            ? "bg-[#4F9DFF]/10 text-[#4F9DFF] border-[#4F9DFF]/20"
                            : "text-[#9AA6B8] hover:bg-white/5 border-transparent"
                        }`}
                      >
                        <Icon size={17} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ---------------- Main content ---------------- */}
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 space-y-6 max-w-[1400px]">
          {/* ===== Dashboard tab ===== */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Ringkasan Sistem
                </h1>
                <p className="text-sm text-[#7C8AA0] mt-1">Pemantauan kadar gas secara real-time dari sensor lapangan</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Gauge card */}
                <div className="lg:col-span-4 rounded-2xl border border-[#1E2738] bg-[#121826] p-6 flex flex-col items-center">
                  <p className="text-[11px] uppercase tracking-widest text-[#5B6678] self-start">Status Saat Ini</p>
                  <div className="relative mt-2 w-full max-w-[260px] aspect-[3/2]">
                    <svg viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet" className="w-full h-full block">
                      <path d={describeZoneArc(120, 140, 100, 0, MAX_VALUE)} fill="none" stroke="#1E2738" strokeWidth={16} strokeLinecap="round" />
                      <path d={describeZoneArc(120, 140, 100, 0, 500)} fill="none" stroke="#2DD4A8" strokeWidth={14} />
                      <path d={describeZoneArc(120, 140, 100, 500, 900)} fill="none" stroke="#F5A623" strokeWidth={14} />
                      <path d={describeZoneArc(120, 140, 100, 900, MAX_VALUE)} fill="none" stroke="#FF4458" strokeWidth={14} />
                      {/* Definisikan filter bayangan di dalam <defs> (letakkan sebelum <path> busur) */}
                      <defs>
                        <filter id="needleGlow" x="-30%" y="-30%" width="160%" height="160%">
                          <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#4F9DFF" floodOpacity="0.5" />
                        </filter>
                      </defs>

                      {/* Busur zona (tetap seperti sebelumnya) */}
                      <path d={describeZoneArc(120, 140, 100, 0, MAX_VALUE)} fill="none" stroke="#1E2738" strokeWidth={16} strokeLinecap="round" />
                      <path d={describeZoneArc(120, 140, 100, 0, 500)} fill="none" stroke="#2DD4A8" strokeWidth={14} />
                      <path d={describeZoneArc(120, 140, 100, 500, 900)} fill="none" stroke="#F5A623" strokeWidth={14} />
                      <path d={describeZoneArc(120, 140, 100, 900, MAX_VALUE)} fill="none" stroke="#FF4458" strokeWidth={14} />

                      {/* Jarum baru dengan bentuk segitiga dan bayangan */}
                      <motion.g
                        className="gauge-pivot"
                        animate={{ rotate: needleRotation }}
                        transition={{ type: "spring", stiffness: 70, damping: 14 }}
                        filter="url(#needleGlow)"
                      >
                        {/* Segitiga jarum */}
                        <polygon points="120,140 116,50 124,50" fill="#E7ECF3" stroke="#4F9DFF" strokeWidth={1.5} strokeLinejoin="round" />
                        {/* Ujung jarum (titik kecil) */}
                        <circle cx="120" cy="50" r="3.5" fill="#4F9DFF" />
                      </motion.g>

                      {/* Titik pivot (tengah) */}
                      <circle cx="120" cy="140" r="10" fill="#0A0E16" stroke="#E7ECF3" strokeWidth={2.5} />
                      {/* Tambahan aksen di pivot */}
                      <circle cx="120" cy="140" r="3" fill="#4F9DFF" />

                      {/* Skala nilai (opsional, tambahkan agar lebih informatif) */}
                      <text x="14" y="156" fill="#5B6678" fontSize="10">0</text>
                      <text x="198" y="156" fill="#5B6678" fontSize="10">1500</text>
                      <text x="14" y="156" fill="#5B6678" fontSize="10">0</text>
                      <text x="198" y="156" fill="#5B6678" fontSize="10">1500</text>
                    </svg>
                    <div className="absolute inset-x-0 bottom-0 text-center">
                      <p className="font-data text-2xl font-bold tabular-nums">
                        {dataGrafik.length ? currentValue : "--"}
                      </p>
                      <p className="text-[10px] text-[#5B6678] uppercase tracking-widest">Indeks Kadar Gas</p>
                    </div>
                  </div>
                  <div className={`mt-3 px-5 py-2 rounded-full text-sm font-semibold ${style.textClass} ${style.bgClass}`}>
                    {style.label}
                  </div>
                  <p className="text-xs text-[#7C8AA0] text-center mt-2">{style.desc}</p>
                </div>

                {/* Trend chart card */}
                <div className="lg:col-span-8 rounded-2xl border border-[#1E2738] bg-[#121826] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-[#5B6678]">Tren Kadar Gas</p>
                      <p className="text-sm text-[#9AA6B8] mt-0.5 flex items-center gap-1.5">
                        <Activity size={14} /> {dataGrafik.length} pembacaan tercatat (maks. 20)
                      </p>
                    </div>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dataGrafik}>
                        <defs>
                          <linearGradient id="fillTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4F9DFF" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#4F9DFF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E2738" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 1500]} tick={{ fill: "#5B6678", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip
                          contentStyle={{ background: "#0D1320", border: "1px solid #1E2738", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "#9AA6B8" }}
                        />
                        <ReferenceLine y={500} stroke="#F5A623" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <ReferenceLine y={900} stroke="#FF4458" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Area type="monotone" dataKey="value" stroke="#4F9DFF" strokeWidth={2.5} fill="url(#fillTrend)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <StatCard label="Sesi Aktif" value={formatDuration(elapsed)} icon={<Activity size={16} />} />
                <StatCard label="Total Pembacaan" value={readingCount} icon={<GaugeIcon size={16} />} />
                <StatCard
                  label="Peringatan Tercatat"
                  value={alertCount}
                  icon={<AlertTriangle size={16} />}
                  accentClass={alertCount > 0 ? "text-[#FF4458]" : undefined}
                />
              </div>

              {/* Compact history */}
              <div className="rounded-2xl border border-[#1E2738] bg-[#121826] p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] uppercase tracking-widest text-[#5B6678]">Riwayat Deteksi Terakhir</p>
                  <button onClick={() => setActiveTab("riwayat")} className="text-xs text-[#4F9DFF] hover:underline">
                    Lihat semua
                  </button>
                </div>
                <HistoryTable items={riwayat.slice(0, 5)} />
              </div>
            </div>
          )}

          {/* ===== Riwayat tab ===== */}
          {activeTab === "riwayat" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Riwayat Deteksi
                </h1>
                <p className="text-sm text-[#7C8AA0] mt-1">Hingga 20 pembacaan terakhir yang tercatat selama sesi ini</p>
              </div>
              <div className="rounded-2xl border border-[#1E2738] bg-[#121826] p-6">
                <HistoryTable items={riwayat} />
              </div>
            </div>
          )}

          {/* ===== Ambang batas tab ===== */}
          {activeTab === "ambang" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Ambang Batas
                </h1>
                <p className="text-sm text-[#7C8AA0] mt-1">Referensi zona indeks kadar gas yang digunakan sistem</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {ZONES.map((z) => (
                  <div key={z.label} className="rounded-2xl border border-[#1E2738] bg-[#121826] p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${z.dotClass}`} />
                      <span className={`text-sm font-semibold ${z.textClass}`}>
                        {z.label}
                      </span>
                    </div>
                    <p className="font-data text-2xl font-bold mb-2">
                      {z.range}
                    </p>
                    <p className="text-sm text-[#9AA6B8] leading-relaxed">{z.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Tentang tab ===== */}
          {activeTab === "tentang" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Tentang Sistem
                </h1>
                <p className="text-sm text-[#7C8AA0] mt-1">Informasi mengenai cara kerja MonitoringGas</p>
              </div>
              <div className="rounded-2xl border border-[#1E2738] bg-[#121826] p-6 space-y-4 text-sm text-[#9AA6B8] leading-relaxed">
                <p>
                  MonitoringGas membaca status kadar gas secara langsung dari Firebase Realtime Database pada
                  path <code className="font-data text-[#4F9DFF]">Status_Gas</code>.
                  Setiap perubahan nilai pada database akan langsung diperbarui di dashboard ini tanpa perlu memuat ulang halaman.
                </p>
                <p>
                  Setiap pembacaan dikategorikan ke dalam tiga status — AMAN, WASPADA, dan BAHAYA — yang masing-masing
                  direpresentasikan sebagai indeks numerik untuk keperluan visualisasi tren pada grafik. Lihat tab
                  &ldquo;Ambang Batas&rdquo; untuk rincian setiap zona.
                </p>
                <p>
                  Data riwayat dan statistik sesi (durasi aktif, jumlah pembacaan, jumlah peringatan) disimpan secara
                  lokal pada sesi browser saat ini dan akan tersetel ulang setiap kali halaman dimuat kembali.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}