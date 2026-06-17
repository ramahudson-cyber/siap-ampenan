import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "../../services/authservice";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  getDeviceInfo,
  checkDeviceBinding,
  checkDeviceRequestStatus,
  sendOtpEmail,
  verifyOtp,
  createDeviceRequest,
} from "../../services/deviceservice";
import {
  Activity, LogIn, AlertCircle, Smartphone, Mail, Clock,
  CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Multi-step state
  const [step, setStep] = useState("login"); // login | otp | pending | approved
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [requestStatus, setRequestStatus] = useState(null);

  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const redirectByRole = (role) => {
    if (role === "pegawai") navigate("/employee", { replace: true });
    else navigate("/admin", { replace: true });
  };

  const resolveEmail = async (input) => {
    if (input.includes("@")) return input;
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", input.trim())
      .maybeSingle();
    if (error || !data?.email) return `${input.trim()}@puskesmas.local`;
    return data.email;
  };

  // ─── STEP 1: LOGIN (username + password + device check) ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const email = await resolveEmail(username);
      console.log("Logging in with:", email);

      await signIn(email, password);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Gagal mendapatkan user session");

      // Ambil profil lengkap
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!profile) throw new Error("Profil tidak ditemukan");

      setUserEmail(profile.email || email);
      setUserName(profile.full_name || username);
      setUserId(authUser.id);

      // Cek device binding
      const info = await getDeviceInfo();
      setDeviceInfo(info);
      console.log("📱 Device info:", info);

      const deviceCheck = await checkDeviceBinding(authUser.id, info);
      console.log("🔒 Device check:", deviceCheck);

      if (deviceCheck.canLogin && !deviceCheck.requiresOtp) {
        // ✅ Device terdaftar, langsung login
        await refreshUser();
        redirectByRole(profile.role);
        return;
      }

      // Cek apakah sudah ada request device sebelumnya
      const requestStatusInfo = await checkDeviceRequestStatus(
        authUser.id,
        info.visitorId
      );
      console.log("📋 Device request status:", requestStatusInfo);

      if (requestStatusInfo.hasRequest) {
        if (requestStatusInfo.status === "pending") {
          // Sudah pernah OTP, masih menunggu admin approval
          setStep("pending");
          setRequestStatus("pending");
          setLoading(false);
          return;
        } else if (requestStatusInfo.status === "approved") {
          // Seharusnya sudah bisa login, tapi mungkin cache
          await refreshUser();
          redirectByRole(profile.role);
          return;
        } else if (requestStatusInfo.status === "rejected") {
          // Request ditolak
          setError(
            `🚫 Permintaan device Anda DITOLAK oleh admin.\n\n` +
            `Hubungi admin puskesmas untuk informasi lebih lanjut.`
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }

      // Device baru & belum ada request → kirim OTP
      const sendResult = await sendOtpEmail(
        profile.email || email,
        profile.full_name || username
      );

      if (!sendResult.success) {
        // Fallback: tampilkan OTP di console untuk development
        console.warn("⚠️ Email OTP gagal terkirim. Cek table otp_codes di Supabase.");
      } else {
        console.log("✅ OTP terkirim ke email:", profile.email || email);
      }

      setStep("otp");
      setOtpSent(true);
    } catch (err) {
      console.error("Login error:", err);
      setError("Username/email atau password salah. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 2: OTP VERIFICATION ───
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await verifyOtp(otpCode);
      console.log("🔑 OTP verify result:", result);

      if (!result.isValid) {
        setError(result.message || "Kode OTP salah");
        setLoading(false);
        return;
      }

      // OTP valid → buat device request
      const reqResult = await createDeviceRequest(deviceInfo);
      console.log("📋 Device request:", reqResult);

      if (!reqResult.success) {
        setError("Gagal membuat device request: " + reqResult.error);
        setLoading(false);
        return;
      }

      // Pindah ke step pending approval
      setStep("pending");
      setRequestStatus("pending");
    } catch (err) {
      console.error("OTP verify error:", err);
      setError("Terjadi kesalahan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 3: PENDING APPROVAL (refresh status) ───
  const checkApprovalStatus = async () => {
    setLoading(true);
    try {
      const status = await checkDeviceRequestStatus(userId, deviceInfo.visitorId);
      console.log("🔄 Approval status:", status);

      if (status.status === "approved") {
        // Admin sudah approve → lanjut login
        await refreshUser();

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (profile?.role) {
          redirectByRole(profile.role);
          return;
        }
        navigate("/admin", { replace: true });
      } else if (status.status === "rejected") {
        setError(
          `🚫 Permintaan device Anda DITOLAK oleh admin.\n\n` +
          `Hubungi admin puskesmas untuk informasi lebih lanjut.`
        );
        await supabase.auth.signOut();
        setStep("login");
      } else {
        // Masih pending
        setError("Masih menunggu approval admin. Hubungi admin untuk percepat proses.");
      }
    } catch (err) {
      console.error("Check status error:", err);
      setError("Gagal cek status: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── RESEND OTP ───
  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      await sendOtpEmail(userEmail, userName);
      console.log("✅ OTP baru terkirim");
    } catch (err) {
      setError("Gagal kirim ulang OTP: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── CANCEL & LOGOUT ───
  const handleCancel = async () => {
    await supabase.auth.signOut();
    setStep("login");
    setOtpCode("");
    setDeviceInfo(null);
    setError("");
  };

  // ════════════════════════════════════════════════
  // RENDER - MULTI STEP UI
  // ════════════════════════════════════════════════

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-black p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 mb-4">
            <Activity size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-wider">
            SIAP
          </h1>
          <p className="text-purple-200 text-sm mt-2 tracking-widest uppercase">
            Puskesmas Ampenan
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* ═══ STEP 1: LOGIN FORM ═══ */}
          {step === "login" && (
            <>
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Masuk ke Sistem
              </h2>

              {error && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-300 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200 whitespace-pre-line">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-purple-200 mb-2">
                    Username atau Email
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="AMP002 atau email@puskesmas.local"
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-200 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={20} />
                      <span>Masuk</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-2">
                <Smartphone size={16} className="text-blue-300 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-200">
                  <strong>Keamanan Device:</strong> Login dari device baru memerlukan verifikasi OTP email + approval admin.
                </p>
              </div>
            </>
          )}

          {/* ═══ STEP 2: OTP VERIFICATION ═══ */}
          {step === "otp" && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-4">
                  <Mail size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Verifikasi OTP
                </h2>
                <p className="text-purple-200 text-sm">
                  Kode OTP telah dikirim ke:
                </p>
                <p className="text-white font-semibold text-sm mt-1">
                  {userEmail}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-300 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200 whitespace-pre-line">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-purple-200 mb-2">
                    Kode OTP (6 digit)
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").substring(0, 6))}
                    placeholder="000000"
                    required
                    maxLength={6}
                    className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-3xl font-mono tracking-[0.5em] placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-purple-300 mt-2 text-center">
                    Kode berlaku 10 menit
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      <span>Verifikasi OTP</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={handleCancel}
                  className="text-xs text-purple-300 hover:text-white transition"
                >
                  ← Kembali
                </button>
                <button
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-xs text-purple-300 hover:text-white transition flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  Kirim ulang OTP
                </button>
              </div>
            </>
          )}

          {/* ═══ STEP 3: PENDING APPROVAL ═══ */}
          {step === "pending" && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 mb-4">
                  <Clock size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Menunggu Approval Admin
                </h2>
                <p className="text-purple-200 text-sm">
                  OTP berhasil diverifikasi!
                </p>
              </div>

              <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl mb-4">
                <p className="text-sm text-amber-100">
                  <strong>📋 Status:</strong> Pending Approval
                </p>
                <p className="text-xs text-amber-200 mt-2">
                  Device Anda:
                </p>
                <p className="text-xs text-white font-mono mt-1 bg-black/30 p-2 rounded">
                  {deviceInfo?.deviceName}
                </p>
                <p className="text-xs text-amber-200 mt-3">
                  Mohon tunggu admin puskesmas menyetujui device Anda. Hubungi admin untuk mempercepat proses approval.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-300 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200 whitespace-pre-line">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={checkApprovalStatus}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Memeriksa...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={20} />
                      <span>Cek Status Approval</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCancel}
                  className="w-full py-3 border border-white/20 text-purple-200 rounded-xl hover:bg-white/10 transition text-sm"
                >
                  Logout & Kembali ke Login
                </button>
              </div>
            </>
          )}

          <p className="text-center text-xs text-purple-300/70 mt-6">
            Sistem Informasi Administrasi & Presensi
          </p>
        </div>
      </div>
    </div>
  );
}