import { Bell, LogOut, Moon, Sun } from "lucide-react";
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

function Header({ onMenuClick }) {
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
      className="sticky top-0 z-20 bg-[#160a29]/95 backdrop-blur-xl border-b border-white/10"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="flex items-center justify-between h-[60px] px-5 md:px-6">
        {/* LEFT: Logo + Title (no more hamburger) */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shrink-0 md:hidden">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 22V12M2 7l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="text-lg md:text-2xl font-bold text-white truncate tracking-tight">
            {title}
          </h1>
        </div>

        {/* RIGHT: Theme toggle, Notifications, Logout */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl text-violet-200 hover:bg-white/5 transition active:scale-95"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            className="p-2.5 rounded-xl text-violet-200 hover:bg-white/5 relative transition active:scale-95"
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-[#160a29]"></span>
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl text-red-300 hover:bg-red-500/10 transition active:scale-95"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;