// src/services/attendanceservice.js
import { supabase } from "../lib/supabase";

// ✅ Fallback default (dipakai kalau gagal fetch dari DB)
const DEFAULT_PUSKESMAS_LOCATION = {
  latitude: -8.5697,
  longitude: 116.0821,
  name: "Puskesmas Ampenan",
};
const DEFAULT_RADIUS_METER = 200;

// ✅ Cache lokasi untuk hemat request
let cachedLocation = null;
let cachedRadius = null;

/**
 * Ambil lokasi puskesmas aktif dari database
 * @returns {Promise<{latitude, longitude, name, radius_meter}>}
 */
export async function getPuskesmasLocation() {
  // Kalau sudah ada di cache, pakai cache
  if (cachedLocation && cachedRadius) {
    return { ...cachedLocation, radius_meter: cachedRadius };
  }

  try {
    // Fetch lokasi aktif via RPC
    const { data, error } = await supabase
      .rpc('get_active_location');

    if (error) throw error;

    if (data && data.length > 0) {
      const loc = data[0];
      cachedLocation = {
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        name: loc.name,
      };
      cachedRadius = loc.radius_meter;
      return { ...cachedLocation, radius_meter: cachedRadius };
    }
    
    // Kalau tidak ada data di DB, pakai default
    return { ...DEFAULT_PUSKESMAS_LOCATION, radius_meter: DEFAULT_RADIUS_METER };
  } catch (err) {
    console.error("❌ Gagal fetch lokasi dari DB, pakai default:", err.message);
    return { ...DEFAULT_PUSKESMAS_LOCATION, radius_meter: DEFAULT_RADIUS_METER };
  }
}

/**
 * Ambil radius meter (untuk kompatibilitas dengan kode lama)
 */
export async function getRadiusMeter() {
  if (cachedRadius !== null) return cachedRadius;
  
  const loc = await getPuskesmasLocation();
  return loc.radius_meter;
}

/**
 * Hitung jarak dalam meter (Haversine formula)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Cek apakah user dalam radius puskesmas
 * ✅ Sekarang async karena fetch dari DB
 */
export async function isWithinRadius(userLat, userLon) {
  const puskesmas = await getPuskesmasLocation();
  const distance = calculateDistance(
    userLat, userLon,
    puskesmas.latitude,
    puskesmas.longitude
  );
  return {
    withinRadius: distance <= puskesmas.radius_meter,
    distance: Math.round(distance),
    puskesmasName: puskesmas.name,
    radius: puskesmas.radius_meter,
  };
}

/**
 * Ambil absensi hari ini
 */
export async function getTodayAttendance(userId) {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Clock In
 */
export async function clockIn(userId, location, selfieBase64) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();

  // Ambil jam kerja default dari settings
  const { data: workStartStr } = await supabase.rpc('get_system_setting', {
    p_setting_key: 'work_start_time'
  });

  const workStart = workStartStr || '08:00';
  const [hours, minutes] = workStart.split(':').map(Number);
  
  const jamMasuk = new Date();
  jamMasuk.setHours(hours, minutes, 0, 0);
  const isLate = now > jamMasuk;
  const lateMinutes = isLate ? Math.round((now - jamMasuk) / 60000) : 0;

  // Upload selfie
  let selfieUrl = null;
  if (selfieBase64) {
    const fileName = `checkin_${userId}_${today}.jpg`;
    const base64Data = selfieBase64.replace(/^data:image\/\w+;base64,/, "");
    const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("selfies")
      .upload(fileName, byteArray, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("selfies")
        .getPublicUrl(fileName);
      selfieUrl = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("attendance")
    .insert({
      user_id: userId,
      date: today,
      clock_in_time: now.toISOString(),
      location_in: location,
      selfie_in_url: selfieUrl,
      attendance_status: "hadir",
      is_late: isLate,
      late_minutes: lateMinutes,
    })
    .select()
    .single();

  if (error) throw error;

  // Catat ke audit log
  await supabase.rpc('log_audit', {
    p_action: 'CLOCK_IN',
    p_description: `Clock in: ${user?.email || userId}`,
    p_entity_type: 'attendance',
    p_entity_id: data.id,
    p_metadata: { late: isLate, late_minutes: lateMinutes }
  }).catch(() => {}); // ignore audit error

  return data;
}

/**
 * Clock Out
 */
export async function clockOut(userId, location, selfieBase64) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();

  // Upload selfie out
  let selfieUrl = null;
  if (selfieBase64) {
    const fileName = `checkout_${userId}_${today}.jpg`;
    const base64Data = selfieBase64.replace(/^data:image\/\w+;base64,/, "");
    const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("selfies")
      .upload(fileName, byteArray, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("selfies")
        .getPublicUrl(fileName);
      selfieUrl = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("attendance")
    .update({
      clock_out_time: now.toISOString(),
      location_out: location,
      selfie_out_url: selfieUrl,
    })
    .eq("user_id", userId)
    .eq("date", today)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Riwayat absensi
 */
export async function getAttendanceHistory(userId, limit = 30) {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ✅ Export untuk kompatibilitas dengan AttendancePage lama
// (akan di-fetch ulang dari DB, tapi export sebagai object untuk import existing)
export const PUSKESMAS_LOCATION = DEFAULT_PUSKESMAS_LOCATION;
export const RADIUS_METER = DEFAULT_RADIUS_METER;