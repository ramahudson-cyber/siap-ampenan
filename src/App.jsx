import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "./context/ThemeContext";
import { useRegisterSW } from "virtual:pwa-register/react";
import "./index.css";

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90vw] max-w-sm animate-fade-in">
      <div className="bg-[#1a0a35] border border-violet-500/30 rounded-2xl p-4 shadow-2xl shadow-purple-950/60 backdrop-blur-xl">
        <p className="text-sm font-semibold text-white mb-3">
          🚀 Versi baru SIAP tersedia
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => updateServiceWorker(true)}
            className="flex-1 py-2 border-gradient bg-transparent text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-violet-900/30 transition-all"
          >
            Perbarui Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}

function ToastSetup() {
  const { darkMode } = useTheme();
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick={true}
      rtl={false}
      pauseOnFocusLoss={true}
      draggable={true}
      pauseOnHover={true}
      theme={darkMode ? "dark" : "light"}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <UpdatePrompt />
      <ToastSetup />
    </AuthProvider>
  );
}

export default App;
