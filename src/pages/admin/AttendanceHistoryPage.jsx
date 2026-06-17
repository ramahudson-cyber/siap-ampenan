// src/pages/admin/AttendanceHistoryPage.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  Search, Filter, Download, Calendar,
  ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, XCircle, Clock, AlertTriangle,
  Users, RefreshCw,
} from "lucide-react";

// ── Konstanta ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "hadir",  label: "Hadir"  },
  { value: "izin",   label: "Izin"   },
  { value: "sakit",  label: "Sakit"  },
  { value: "cuti",   label: "Cuti"   },
  { value: "alpha",  label: "Alpha"  },
];

const STATUS_STYLE = {
  hadir: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", icon: <CheckCircle2 size={12} /> },
  izin:  { bg: "bg-amber-100 dark:bg-amber-900/40",    text: "text-amber-700 dark:text-amber-300",   icon: <Clock size={12} /> },
  sakit: { bg: "bg-orange-100 dark:bg-orange-900/40",  text: "text-orange-700 dark:text-orange-300", icon: <AlertTriangle size={12} /> },
  cuti:  { bg: "bg-sky-100 dark:bg-sky-900/40",        text: "text-sky-700 dark:text-sky-300",       icon: <Calendar size={12} /> },
  alpha: { bg: "bg-red-100 dark:bg-red-900/40",        text: "text-red-700 dark:text-red-300",       icon: <XCircle size={12} /> },
};

const PAGE_SIZE = 10;

// ── Helper ───────────────────────────────────────────────────────────────────
const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "–";

const fmtDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("id-ID", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      })
    : "–";

// ── Sub-komponen ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? { bg: "bg-gray-100", text: "text-gray-600", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon}
      {status?.toUpperCase() ?? "–"}
    </span>
  );
}

function SummaryCard({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${color} text-white`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AttendanceHistoryPage() {
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [summary, setSummary]     = useState({ hadir: 0, izin: 0, sakit: 0, alpha: 0 });

  // Filter state
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("");
  const [dateFrom, setDateFrom]   = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo]       = useState(new Date().toISOString().split("T")[0]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRecords = async (resetPage = false) => {
    setLoading(true);
    const currentPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    try {
      // Base query dengan join profiles
      let query = supabase
        .from("attendance")
        .select("*, profiles(full_name, department, position)", { count: "exact" })
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false })
        .order("clock_in_time", { ascending: false });

      if (statusFilter) query = query.eq("attendance_status", statusFilter);

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      // Filter search di client (nama pegawai)
      const filtered = search.trim()
        ? (data || []).filter(r =>
            r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            r.profiles?.department?.toLowerCase().includes(search.toLowerCase())
          )
        : (data || []);

      setRecords(filtered);
      setTotal(count || 0);

      // Summary: ambil count per status di rentang tanggal
      const statuses = ["hadir", "izin", "sakit", "alpha"];
      const counts = await Promise.all(
        statuses.map(s =>
          supabase
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .gte("date", dateFrom)
            .lte("date", dateTo)
            .eq("attendance_status", s)
            .then(({ count }) => count || 0)
        )
      );
      setSummary({ hadir: counts[0], izin: counts[1], sakit: counts[2], alpha: counts[3] });
    } catch (err) {
      console.error("❌ fetchRecords:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [page]);
  useEffect(() => { fetchRecords(true); }, [dateFrom, dateTo, statusFilter]);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select("*, profiles(full_name, department, position)")
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false });

    if (error || !data) return;

    const header = ["Tanggal", "Nama", "Departemen", "Clock In", "Clock Out", "Status", "Terlambat (menit)"];
    const rows = data.map(r => [
      r.date,
      r.profiles?.full_name ?? "-",
      r.profiles?.department ?? "-",
      fmtTime(r.clock_in_time),
      fmtTime(r.clock_out_time),
      r.attendance_status ?? "-",
      r.late_minutes ?? 0,
    ]);

    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `riwayat-absensi-${dateFrom}-sd-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Riwayat Absensi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Data absensi seluruh pegawai</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Hadir"  value={summary.hadir}  color="bg-emerald-500" icon={CheckCircle2} />
        <SummaryCard label="Izin"   value={summary.izin}   color="bg-amber-500"   icon={Clock}        />
        <SummaryCard label="Sakit"  value={summary.sakit}  color="bg-orange-500"  icon={AlertTriangle}/>
        <SummaryCard label="Alpha"  value={summary.alpha}  color="bg-red-500"     icon={XCircle}      />
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
        <div className="flex flex-wrap gap-3">

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama / departemen..."
              value={search}
              onChange={e => { setSearch(e.target.value); fetchRecords(true); }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => setStatus(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Dari</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sampai</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchRecords(true)}
            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-violet-600 hover:border-violet-300 transition"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-violet-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada data pada rentang tanggal ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Tanggal</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Nama</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Departemen</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Clock In</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Clock Out</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Terlambat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {fmtDate(r.date)}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {r.profiles?.full_name ?? "–"}
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {r.profiles?.department ?? "–"}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                      {fmtTime(r.clock_in_time)}
                    </td>
                    <td className="py-3 px-4 font-mono text-rose-500 dark:text-rose-400">
                      {fmtTime(r.clock_out_time)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.attendance_status} />
                    </td>
                    <td className="py-3 px-4">
                      {r.is_late ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          +{r.late_minutes} menit
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-800">
            <p className="text-xs text-gray-400">
              Halaman {page} dari {totalPages} · {total} data
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}