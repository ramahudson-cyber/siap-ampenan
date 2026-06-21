import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  getDeviceInfo,
  checkDeviceBinding,
  checkDeviceRequestStatus,
  sendOtpEmail,
  verifyOtp,
  createDeviceRequest,
} from "../../services/deviceService";
import {
  LogIn, AlertCircle, Mail, Clock, CheckCircle2, RefreshCw, ArrowLeft
} from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState("login");
  const [otpCode, setOtpCode] = useState("");
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const email = await resolveEmail(username);
      await signIn(email, password);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Gagal mendapatkan user session");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!profile) throw new Error("Profil tidak ditemukan");

      setUserEmail(profile.email || email);
      setUserName(profile.full_name || username);
      setUserId(authUser.id);

      const info = await getDeviceInfo();
      setDeviceInfo(info);

      const deviceCheck = await checkDeviceBinding(authUser.id, info);

      if (deviceCheck.canLogin && !deviceCheck.requiresOtp) {
        await refreshUser();
        redirectByRole(profile.role);
        return;
      }

      const requestStatusInfo = await checkDeviceRequestStatus(authUser.id, info.visitorId);

      if (requestStatusInfo.hasRequest) {
        if (requestStatusInfo.status === "pending") {
          setStep("pending");
          setLoading(false);
          return;
        } else if (requestStatusInfo.status === "approved") {
          await refreshUser();
          redirectByRole(profile.role);
          return;
        } else if (requestStatusInfo.status === "rejected") {
          setError("Permintaan device DITOLAK. Hubungi admin.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }

      await sendOtpEmail(profile.email || email, profile.full_name || username);
      setStep("otp");
    } catch (err) {
      setError("Username/email atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await verifyOtp(otpCode);
      if (!result.isValid) {
        setError(result.message || "Kode OTP salah");
        setLoading(false);
        return;
      }

      const reqResult = await createDeviceRequest(deviceInfo);
      if (!reqResult.success) {
        setError("Gagal membuat device request.");
        setLoading(false);
        return;
      }

      setStep("pending");
    } catch (err) {
      setError("Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const checkApprovalStatus = async () => {
    setLoading(true);
    try {
      const status = await checkDeviceRequestStatus(userId, deviceInfo.visitorId);
      if (status.status === "approved") {
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
        setError("Permintaan DITOLAK. Hubungi admin.");
        await supabase.auth.signOut();
        setStep("login");
      } else {
        setError("Masih menunggu approval admin.");
      }
    } catch (err) {
      setError("Gagal cek status.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      await sendOtpEmail(userEmail, userName);
    } catch (err) {
      setError("Gagal kirim ulang OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
    setStep("login");
    setOtpCode("");
    setDeviceInfo(null);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-slate-950"></div>
      
      {/* Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30"></div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[380px]">
        {/* Logo - Minimal */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">SIAP</h1>
          <p className="text-slate-400 text-xs mt-1">Puskesmas Ampenan</p>
        </div>

        {/* Card - Glassmorphism Minimal */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
          
          {/* STEP 1: LOGIN */}
          {step === "login" && (
            <>
              <h2 className="text-xl font-semibold text-white mb-6">Masuk</h2>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username atau Email"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-white text-slate-900 font-semibold rounded-xl text-sm hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Memproses..." : "Masuk"}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: OTP */}
          {step === "otp" && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-3">
                  <Mail size={24} className="text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">Verifikasi OTP</h2>
                <p className="text-slate-400 text-xs">Kode dikirim ke {userEmail}</p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").substring(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition"
                />
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 bg-white text-slate-900 font-semibold rounded-xl text-sm hover:bg-slate-100 transition disabled:opacity-50"
                >
                  {loading ? "Memproses..." : "Verifikasi"}
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between">
                <button onClick={handleCancel} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                  <ArrowLeft size={12} /> Kembali
                </button>
                <button onClick={handleResendOtp} disabled={loading} className="text-xs text-violet-400 hover:text-violet-300">
                  Kirim ulang
                </button>
              </div>
            </>
          )}

          {/* STEP 3: PENDING */}
          {step === "pending" && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/20 mb-3">
                  <Clock size={24} className="text-amber-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">Menunggu Approval</h2>
                <p className="text-slate-400 text-xs">OTP terverifikasi</p>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                <p className="text-xs text-amber-200">Status: Pending</p>
                <p className="text-[10px] text-amber-300/70 mt-1">{deviceInfo?.deviceName}</p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={checkApprovalStatus}
                  disabled={loading}
                  className="w-full py-3 bg-white text-slate-900 font-semibold rounded-xl text-sm hover:bg-slate-100 transition disabled:opacity-50"
                >
                  {loading ? "Memeriksa..." : "Cek Status"}
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full py-3 border border-white/10 text-slate-400 rounded-xl text-sm hover:bg-white/5 transition"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
        
        <p className="text-center text-[10px] text-slate-600 mt-6">
          Sistem Informasi Administrasi & Presensi
        </p>
      </div>
    </div>
  );
}