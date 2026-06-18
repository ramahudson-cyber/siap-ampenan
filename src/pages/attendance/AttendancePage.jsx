// src/pages/attendance/AttendancePage.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getTodayAttendance,
  clockIn,
  clockOut,
  isWithinRadius,
  PUSKESMAS_LOCATION,
  RADIUS_METER,
} from "../../services/attendanceService";
import { toast } from "react-toastify";
import {
  MapPin, Camera, Clock, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, LogIn, LogOut,
  Navigation, Loader2, Stethoscope,
} from "lucide-react";

// ─── Konstanta warna status ───────────────────────────────────────────────────
const STATUS_STYLE = {
  hadir:  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", label: "Hadir" },
  izin:   { bg: "bg-amber-100 dark:bg-amber-900/40",    text: "text-amber-700 dark:text-amber-300",   label: "Izin"  },
  sakit:  { bg: "bg-orange-100 dark:bg-orange-900/40",  text: "text-orange-700 dark:text-orange-300", label: "Sakit" },
  cuti:   { bg: "bg-sky-100 dark:bg-sky-900/40",        text: "text-sky-700 dark:text-sky-300",       label: "Cuti"  },
  alpha:  { bg: "bg-red-100 dark:bg-red-900/40",        text: "text-red-700 dark:text-red-300",       label: "Alpha" },
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–";

// ─── Sub-komponen: Jam Real-time (Hero) ───────────────────────────────────────
function ClockHero({ time }) {
  const timeStr = time.toLocaleTimeString("id-ID");
  const dateStr = time.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 p-6 text-white shadow-lg">
      {/* Pulse lingkaran dekoratif – signature element */}
      <span className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
      <span className="absolute top-10 -right-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <Stethoscope size={14} />
            <span className="text-xs font-medium tracking-wide uppercase">Puskesmas Ampenan</span>
          </div>
          <p className="text-sm opacity-70">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold tabular-nums tracking-tight">{timeStr}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-komponen: Kartu Status Absensi ──────────────────────────────────────
function AttendanceStatusCard({ attendance }) {
  if (!attendance) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-3 text-gray-400">
          <Clock size={20} />
          <p className="text-sm">Belum absen hari ini</p>
        </div>
      </div>
    );
  }

  const s = STATUS_STYLE[attendance.attendance_status] ?? { bg: "bg-gray-100", text: "text-gray-600", label: attendance.attendance_status };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Clock size={16} className="text-teal-600" />
          Status Hari Ini
        </span>
        <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
          {s.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Clock In</p>
          <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-base">
            {formatTime(attendance.clock_in_time)}
          </p>
        </div>
        <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3">
          <p className="text-xs text-rose-500 dark:text-rose-400 mb-1">Clock Out</p>
          <p className="font-mono font-bold text-rose-600 dark:text-rose-300 text-base">
            {formatTime(attendance.clock_out_time)}
          </p>
        </div>
      </div>

      {attendance.is_late && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-300">
            Terlambat <strong>{attendance.late_minutes} menit</strong>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Sub-komponen: GPS Status ─────────────────────────────────────────────────
function GPSCard({ locationStatus, location, distance, onRefresh }) {
  const configs = {
    checking: {
      icon: <Loader2 size={18} className="text-teal-500 animate-spin" />,
      label: "Mendeteksi lokasi…",
      sub: null,
      ring: "border-gray-200 dark:border-slate-700",
    },
    valid: {
      icon: <CheckCircle2 size={18} className="text-emerald-500" />,
      label: "Dalam radius Puskesmas",
      sub: `${distance}m dari ${PUSKESMAS_LOCATION.name}`,
      ring: "border-emerald-200 dark:border-emerald-800",
    },
    invalid: {
      icon: <XCircle size={18} className="text-rose-500" />,
      label: `Di luar radius ${RADIUS_METER}m`,
      sub: `Jarak Anda: ${distance}m dari ${PUSKESMAS_LOCATION.name}`,
      ring: "border-rose-200 dark:border-rose-800",
    },
    error: {
      icon: <XCircle size={18} className="text-rose-500" />,
      label: "GPS tidak aktif",
      sub: "Aktifkan GPS lalu tap Refresh",
      ring: "border-rose-200 dark:border-rose-800",
    },
  };

  const cfg = configs[locationStatus] ?? configs.checking;

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border shadow-sm p-5 ${cfg.ring}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <MapPin size={16} className="text-teal-600" />
          Lokasi GPS
        </span>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 dark:hover:text-teal-400 transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2">
        {cfg.icon}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{cfg.label}</span>
      </div>

      {cfg.sub && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 pl-6">{cfg.sub}</p>
      )}

      {location && locationStatus === "valid" && (
        <p className="text-xs font-mono text-gray-300 dark:text-gray-600 mt-1 pl-6">
          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
}

// ─── Sub-komponen: Kamera Selfie ──────────────────────────────────────────────
function SelfieCard({ type, locationStatus, onSubmit, submitting }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState(null);

  const isClockIn = type === "in";
  const label     = isClockIn ? "Clock In" : "Clock Out";
  const btnColor  = isClockIn
    ? "bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300"
    : "bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300";

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }, audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setPhoto(null);
    } catch {
      toast.error("Gagal membuka kamera. Izinkan akses kamera!");
    }
  };

  const takePhoto = () => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setPhoto(canvas.toDataURL("image/jpeg", 0.8));
    video.srcObject?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  };

  const retake = () => { setPhoto(null); openCamera(); };

  const handleSubmit = async () => {
    await onSubmit(type, photo);
    setPhoto(null);
  };

  const disabled = locationStatus !== "valid";

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
        <Camera size={16} className="text-teal-600" />
        Selfie untuk {label}
      </h2>

      {/* Kamera aktif */}
      {cameraActive && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {/* Panduan wajah */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-44 rounded-full border-2 border-white/50 border-dashed" />
            </div>
          </div>
          <button
            onClick={takePhoto}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            <Camera size={16} />
            Ambil Foto
          </button>
        </div>
      )}

      {/* Preview foto */}
      {photo && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden aspect-video border-2 border-emerald-400">
            <img src={photo} alt="Selfie preview" className="w-full h-full object-cover" />
            <span className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} /> Siap
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={retake}
              className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition"
            >
              Ulangi
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || disabled}
              className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${btnColor}`}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isClockIn ? (
                <><LogIn size={15} /> Clock In</>
              ) : (
                <><LogOut size={15} /> Clock Out</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tombol buka kamera */}
      {!cameraActive && !photo && (
        <>
          <button
            onClick={openCamera}
            disabled={disabled}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            <Camera size={16} />
            Buka Kamera
          </button>
          {disabled && (
            <p className="text-xs text-rose-500 text-center mt-2">
              ⚠️ Anda harus berada dalam radius {RADIUS_METER}m dari Puskesmas
            </p>
          )}
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ─── Selesai Banner ───────────────────────────────────────────────────────────
function DoneBanner({ attendance }) {
  return (
    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-6 text-center">
      <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-3" />
      <p className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">
        Absensi hari ini selesai!
      </p>
      <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
        {formatTime(attendance.clock_in_time)} — {formatTime(attendance.clock_out_time)}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useAuth();

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  const [location, setLocation]           = useState(null);
  const [locationStatus, setLocationStatus] = useState("checking");
  const [distance, setDistance]           = useState(null);
  const [currentTime, setCurrentTime]     = useState(new Date());

  // Jam real-time
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadTodayAttendance();
      getCurrentLocation();
    }
  }, [user]);

  const loadTodayAttendance = async () => {
    try {
      const data = await getTodayAttendance(user.id);
      setTodayAttendance(data);
    } catch (err) {
      console.error("loadTodayAttendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
  setLocationStatus("checking");
  if (!navigator.geolocation) {
    setLocationStatus("error");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const loc = {
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy:  pos.coords.accuracy,
      };
      setLocation(loc);
      // ✅ FIX: pakai await karena isWithinRadius sekarang async
      const { withinRadius, distance: dist } = await isWithinRadius(loc.latitude, loc.longitude);
      setDistance(dist);
      setLocationStatus(withinRadius ? "valid" : "invalid");
    },
    () => setLocationStatus("error"),
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

  const handleSubmit = async (type, photo) => {
    if (!location)             return toast.error("Lokasi belum terdeteksi!");
    if (locationStatus !== "valid") return toast.error(`Anda di luar radius ${RADIUS_METER}m!`);
    if (!photo)                return toast.error("Selfie wajib diambil!");

    setSubmitting(true);
    try {
      if (type === "in") {
        await clockIn(user.id, location, photo);
        toast.success("✅ Clock In berhasil!");
      } else {
        await clockOut(user.id, location, photo);
        toast.success("✅ Clock Out berhasil!");
      }
      await loadTodayAttendance();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canClockIn  = !todayAttendance?.clock_in_time;
  const canClockOut = todayAttendance?.clock_in_time && !todayAttendance?.clock_out_time;
  const isDone      = todayAttendance?.clock_in_time && todayAttendance?.clock_out_time;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={36} className="animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Hero: jam */}
      <ClockHero time={currentTime} />

      {/* Status absensi hari ini */}
      <AttendanceStatusCard attendance={todayAttendance} />

      {/* GPS */}
      <GPSCard
        locationStatus={locationStatus}
        location={location}
        distance={distance}
        onRefresh={getCurrentLocation}
      />

      {/* Selfie & tombol aksi */}
      {canClockIn && (
        <SelfieCard
          type="in"
          locationStatus={locationStatus}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      {canClockOut && (
        <SelfieCard
          type="out"
          locationStatus={locationStatus}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      {/* Selesai */}
      {isDone && <DoneBanner attendance={todayAttendance} />}
    </div>
  );
}