import { Bell, LogOut, Moon, Sun, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { signOut } from "../services/authService";

const TITLES = {
  "/admin": "Dashboard",
  "/admin/employees": "Pegawai",
  "/admin/attendance": "Absensi",
  "/admin/attendance-history": "Riwayat",
  "/admin/schedules": "Jadwal",
  "/admin/leave": "Cuti",
  "/admin/announcements": "Pengumuman",
  "/admin/settings": "Pengaturan",
  "/employee": "Dashboard",
  "/employee/attendance": "Absensi",
};

function Header() {
  const { darkMode, setDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const title = TITLES[location.pathname] || "SIAP";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header
      className="sticky top-0 z-30 bg-white/80 dark:bg-[#0f0524]/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/[0.06] transition-colors duration-300"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-8">
        {/* LEFT: Page title */}
        <div className="flex items-center min-w-0 flex-1">
          <h1 className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100 truncate tracking-tight">
            {title}
          </h1>
        </div>

        {/* MIDDLE: Search (desktop only) */}
        <div className="hidden xl:flex items-center flex-1 max-w-sm mx-8">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Cari..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
            />
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 md:p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="p-1.5 md:p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] relative transition-colors" aria-label="Notifications">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#0f0524]"></span>
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 md:p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
