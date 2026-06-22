import { Bell, LogOut, Menu, Moon, Sun } from "lucide-react";
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
    <header className="sticky top-0 z-30 bg-[#160a29]/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between h-16 px-3 md:px-6">
        {/* LEFT: Hamburger (mobile only) + Title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            className="md:hidden p-2 -ml-1 rounded-lg text-violet-200 hover:bg-white/10 transition shrink-0"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base md:text-xl font-bold text-white truncate">
            {title}
          </h1>
        </div>

        {/* RIGHT: Theme toggle, Notifications, Logout */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg text-violet-200 hover:bg-white/5 transition"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="p-2 rounded-lg text-violet-200 hover:bg-white/5 relative transition"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-red-300 hover:bg-red-500/10 transition"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;