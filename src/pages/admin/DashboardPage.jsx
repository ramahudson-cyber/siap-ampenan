import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import {
  Users, UserCheck, UserMinus, UserX,
  TrendingUp, Clock, Calendar, Bell, RefreshCw
} from "lucide-react";

function StatCard({ title, value, subtitle, icon: Icon, color = "bg-violet-600", loading }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow border hover:shadow-md transition">
      <div className="flex justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          {loading ? (
            <div className="h-10 w-16 bg-gray-200 animate-pulse rounded-lg mt-2" />
          ) : (
            <h3 className="text-4xl font-bold mt-2">{value}</h3>
          )}
          <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
        </div>
        <div className={`p-4 rounded-2xl ${color} text-white h-fit`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function AttendanceBadge({ status }) {
  const map = {
    hadir: "bg-green-100 text-green-700",
    izin: "bg-yellow-100 text-yellow-700",
    sakit: "bg-orange-100 text-orange-700",
    cuti: "bg-blue-100 text-blue-700",
    alpha: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status?.toUpperCase() || "-"}
    </span>
  );
}

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPegawai: 0,
    hadirHariIni: 0,
    izinSakit: 0,
    cuti: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [announcements, setAnnouncements] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const today = new Date().toISOString().split("T")[0];
  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Total pegawai
      const { count: totalPegawai } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // 2. Absensi hari ini
      const { data: attendanceToday } = await supabase
        .from("attendance")
        .select("*, profiles(full_name, department, position)")
        .eq("date", today)
        .order("clock_in_time", { ascending: false });

      const hadir = attendanceToday?.filter(a => a.attendance_status === "hadir").length || 0;
      const izinSakit = attendanceToday?.filter(a =>
        a.attendance_status === "izin" || a.attendance_status === "sakit"
      ).length || 0;
      const cuti = attendanceToday?.filter(a => a.attendance_status === "cuti").length || 0;

      // 3. Data mingguan (7 hari terakhir)
      const weekly = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const { count } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("date", dateStr)
          .eq("attendance_status", "hadir");
        weekly.push(count || 0);
      }

      // 4. Pengumuman terbaru
      const { data: announceData } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);

      setStats({
        totalPegawai: totalPegawai || 0,
        hadirHariIni: hadir,
        izinSakit,
        cuti,
      });
      setRecentAttendance(attendanceToday?.slice(0, 8) || []);
      setWeeklyData(weekly);
      setAnnouncements(announceData || []);
      setLastUpdated(new Date().toLocaleTimeString("id-ID"));
    } catch (err) {
      console.error("❌ Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const maxWeekly = Math.max(...weeklyData, 1);

  // ✅ FIX: Helper format waktu dari ISO string
  const fmtTime = (iso) =>
    iso
      ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : "-";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 flex items-center gap-2 mt-1 text-sm">
            <Clock size={16} />
            {todayLabel}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Selamat datang, <span className="font-semibold text-violet-600">{user?.full_name || user?.email}</span>
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm hover:bg-violet-700 transition"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Pegawai"
          value={stats.totalPegawai}
          subtitle="Seluruh status kepegawaian"
          icon={Users}
          color="bg-violet-600"
          loading={loading}
        />
        <StatCard
          title="Hadir Hari Ini"
          value={stats.hadirHariIni}
          subtitle="Sudah check-in"
          icon={UserCheck}
          color="bg-green-500"
          loading={loading}
        />
        <StatCard
          title="Izin / Sakit"
          value={stats.izinSakit}
          subtitle="Hari ini"
          icon={UserMinus}
          color="bg-yellow-500"
          loading={loading}
        />
        <StatCard
          title="Cuti"
          value={stats.cuti}
          subtitle="Hari ini"
          icon={UserX}
          color="bg-blue-500"
          loading={loading}
        />
      </div>

      {/* Grafik + Pengumuman */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Grafik Mingguan */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Grafik Presensi 7 Hari</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <TrendingUp size={14} />
              Kehadiran harian
            </div>
          </div>
          <div className="flex items-end gap-2 h-48">
            {weeklyData.map((val, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const isToday = i === 6;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">{val}</span>
                  <div
                    className={`w-full rounded-t-xl transition-all ${isToday ? "bg-violet-600" : "bg-violet-200"}`}
                    style={{ height: `${(val / maxWeekly) * 100}%`, minHeight: val > 0 ? "4px" : "0" }}
                  />
                  <span className={`text-xs ${isToday ? "font-bold text-violet-600" : "text-gray-400"}`}>
                    {DAYS[d.getDay()]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pengumuman */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Pengumuman</h2>
            <Bell size={18} className="text-violet-600" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Belum ada pengumuman
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-1">{a.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-violet-400 mt-1">
                    {new Date(a.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabel Absensi Terkini */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Absensi Terkini Hari Ini</h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar size={14} />
            {lastUpdated && `Update: ${lastUpdated}`}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : recentAttendance.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
            <p>Belum ada absensi hari ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Nama</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Departemen</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Check In</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Check Out</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {recentAttendance.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                    <td className="py-3 px-2 font-medium text-gray-800 dark:text-gray-200">
                      {a.profiles?.full_name || "-"}
                    </td>
                    <td className="py-3 px-2 text-gray-500 dark:text-gray-400">
                      {a.profiles?.department || "-"}
                    </td>
                    {/* ✅ FIX: pakai ISO string langsung, bukan digabung string */}
                    <td className="py-3 px-2 text-gray-500 dark:text-gray-400 font-mono">
                      {fmtTime(a.clock_in_time)}
                    </td>
                    <td className="py-3 px-2 text-gray-500 dark:text-gray-400 font-mono">
                      {fmtTime(a.clock_out_time)}
                    </td>
                    <td className="py-3 px-2">
                      <AttendanceBadge status={a.attendance_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}