import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import {
  MapPin, Clock, Users, FileText, Save, RefreshCw,
  Plus, Pencil, Trash2, X, Search, Key, Shield,
  CheckCircle2, AlertTriangle, Activity, Eye, Smartphone,
  Mail, Clock as ClockIcon, XCircle,
} from "lucide-react";

// ============================================================
// TAB 1: PROFIL PUSKESMAS & LOKASI GPS
// ============================================================
function TabProfilPuskesmas() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radius_meter: 200,
    is_active: true,
  });

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance_locations")
        .select("*")
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.error("❌ Fetch locations:", err);
      toast.error("Gagal memuat data lokasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLocations(); }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      radius_meter: 200,
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (loc) => {
    setFormData({
      name: loc.name,
      address: loc.address || "",
      latitude: loc.latitude,
      longitude: loc.longitude,
      radius_meter: loc.radius_meter,
      is_active: loc.is_active,
    });
    setEditingId(loc.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (formData.is_active) {
        await supabase
          .from("attendance_locations")
          .update({ is_active: false })
          .neq("id", editingId || "00000000-0000-0000-0000-000000000000");
      }

      if (editingId) {
        const { error } = await supabase
          .from("attendance_locations")
          .update({
            name: formData.name,
            address: formData.address,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            radius_meter: parseInt(formData.radius_meter),
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("✅ Lokasi berhasil diperbarui");

        await supabase.rpc("log_audit", {
          p_action: "UPDATE_LOCATION",
          p_description: `Update lokasi: ${formData.name}`,
          p_entity_type: "attendance_locations",
          p_entity_id: editingId,
        });
      } else {
        const { data, error } = await supabase
          .from("attendance_locations")
          .insert({
            name: formData.name,
            address: formData.address,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            radius_meter: parseInt(formData.radius_meter),
            is_active: formData.is_active,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success("✅ Lokasi baru berhasil ditambahkan");

        await supabase.rpc("log_audit", {
          p_action: "CREATE_LOCATION",
          p_description: `Tambah lokasi baru: ${formData.name}`,
          p_entity_type: "attendance_locations",
          p_entity_id: data.id,
        });
      }

      resetForm();
      fetchLocations();
    } catch (err) {
      console.error("❌ Submit error:", err);
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Yakin hapus lokasi "${name}"?`)) return;
    try {
      const { error } = await supabase
        .from("attendance_locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Lokasi berhasil dihapus");

      await supabase.rpc("log_audit", {
        p_action: "DELETE_LOCATION",
        p_description: `Hapus lokasi: ${name}`,
        p_entity_type: "attendance_locations",
        p_entity_id: id,
      });

      fetchLocations();
    } catch (err) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  const handleSetActive = async (id, name) => {
    try {
      await supabase
        .from("attendance_locations")
        .update({ is_active: false })
        .neq("id", id);

      await supabase
        .from("attendance_locations")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", id);

      toast.success(`✅ ${name} dijadikan lokasi aktif`);

      await supabase.rpc("log_audit", {
        p_action: "SET_ACTIVE_LOCATION",
        p_description: `Set lokasi aktif: ${name}`,
        p_entity_type: "attendance_locations",
        p_entity_id: id,
      });

      fetchLocations();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Lokasi Puskesmas
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola lokasi puskesmas & radius absensi GPS
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition text-sm"
        >
          <Plus size={16} /> Tambah Lokasi
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {editingId ? "Edit Lokasi" : "Tambah Lokasi Baru"}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lokasi *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Puskesmas Ampenan"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. ..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude *</label>
                  <input
                    type="number" step="any" required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="-8.5697"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude *</label>
                  <input
                    type="number" step="any" required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="116.0821"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Radius Absensi (meter) *</label>
                <input
                  type="number" required min="10" max="2000"
                  value={formData.radius_meter}
                  onChange={(e) => setFormData({ ...formData, radius_meter: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-violet-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Jadikan lokasi aktif (untuk absensi)</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={resetForm}
                  className="flex-1 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {editingId ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        {locations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MapPin size={40} className="mx-auto mb-3 opacity-30" />
            <p>Belum ada lokasi. Klik "Tambah Lokasi" untuk menambahkan.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {locations.map((loc) => (
              <div key={loc.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-xl ${loc.is_active ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                      <MapPin size={18} className={loc.is_active ? "text-emerald-600" : "text-gray-400"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100">{loc.name}</h4>
                        {loc.is_active && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                            AKTIF
                          </span>
                        )}
                      </div>
                      {loc.address && <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{loc.address}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500 mt-1">
                        <span className="font-mono">📍 {loc.latitude}, {loc.longitude}</span>
                        <span>📏 {loc.radius_meter}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!loc.is_active && (
                      <button
                        onClick={() => handleSetActive(loc.id, loc.name)}
                        title="Jadikan aktif"
                        className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(loc)}
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(loc.id, loc.name)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertTriangle size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">Tips Mendapatkan Koordinat GPS</p>
            <p className="text-blue-600 dark:text-blue-400 text-xs">
              Buka <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="underline">Google Maps</a>, klik kanan di lokasi puskesmas, copy koordinatnya (format: -8.569700, 116.082100).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 2: JAM KERJA & SETTINGS
// ============================================================
function TabJamKerja() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});

  const settingKeys = [
    { key: "work_start_time", label: "Jam Mulai Kerja", type: "time", category: "attendance", icon: Clock },
    { key: "work_end_time", label: "Jam Selesai Kerja", type: "time", category: "attendance", icon: Clock },
    { key: "late_tolerance_minutes", label: "Toleransi Terlambat (menit)", type: "number", category: "attendance", icon: AlertTriangle },
    { key: "default_radius_meter", label: "Radius Default (meter)", type: "number", category: "attendance", icon: MapPin },
    { key: "selfie_retention_days", label: "Retensi Foto Selfie (hari)", type: "number", category: "attendance", icon: FileText },
    { key: "annual_leave_quota_asn", label: "Kuota Cuti ASN (hari/tahun)", type: "number", category: "leave", icon: Users },
    { key: "annual_leave_quota_pppk", label: "Kuota Cuti PPPK (hari/tahun)", type: "number", category: "leave", icon: Users },
    { key: "annual_leave_quota_tpk", label: "Kuota Cuti TPK (hari/tahun)", type: "number", category: "leave", icon: Users },
    { key: "default_password", label: "Password Default Pegawai Baru", type: "text", category: "security", icon: Key },
    { key: "password_min_length", label: "Panjang Minimal Password", type: "number", category: "security", icon: Shield },
  ];

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .in("setting_key", settingKeys.map(s => s.key));

      if (error) throw error;

      const map = {};
      data.forEach(s => { map[s.setting_key] = s.value; });
      setSettings(map);
    } catch (err) {
      console.error("❌ Fetch settings:", err);
      toast.error("Gagal memuat settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of settingKeys) {
        const value = settings[item.key];
        if (value === undefined || value === "") continue;

        const { error } = await supabase.rpc("set_system_setting", {
          p_setting_key: item.key,
          p_value: String(value),
          p_category: item.category,
        });

        if (error) throw error;
      }

      toast.success("✅ Semua settings berhasil disimpan");
    } catch (err) {
      console.error("❌ Save settings:", err);
      toast.error("Gagal simpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  const categories = [...new Set(settingKeys.map(s => s.category))];
  const categoryLabels = {
    attendance: "Pengaturan Absensi",
    leave: "Pengaturan Cuti",
    security: "Keamanan",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Jam Kerja & Konfigurasi</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Atur jam kerja, radius, kuota cuti, dll</p>
        </div>
        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm disabled:opacity-50"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          Simpan Semua
        </button>
      </div>

      {categories.map(cat => (
        <div key={cat} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {categoryLabels[cat]}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settingKeys.filter(s => s.category === cat).map(item => {
              const Icon = item.icon;
              return (
                <div key={item.key}>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <Icon size={14} className="text-violet-500" />
                    {item.label}
                  </label>
                  <input
                    type={item.type}
                    value={settings[item.key] || ""}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// TAB 3: MANAJEMEN USER
// ============================================================
function TabManajemenUser() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [resettingId, setResettingId] = useState(null);
  const [resettingDeviceId, setResettingDeviceId] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDevices, setUserDevices] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("❌ Fetch users:", err);
      toast.error("Gagal memuat data user");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDevices = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("user_devices")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("last_login_at", { ascending: false });

      if (error) throw error;
      setUserDevices((prev) => ({ ...prev, [userId]: data || [] }));
    } catch (err) {
      console.error("❌ Fetch devices:", err);
      toast.error("Gagal memuat device user");
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleExpand = (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userDevices[userId]) {
        fetchUserDevices(userId);
      }
    }
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Reset password ${user.full_name} (${user.username}) ke default?`)) return;
    
    setResettingId(user.id);
    try {
      const { error } = await supabase.rpc("reset_user_password", {
        user_email: user.email,
        new_password: "Puskesmas@123",
      });

      if (error) throw error;

      toast.success(`✅ Password ${user.full_name} direset ke Puskesmas@123`);

      await supabase.rpc("log_audit", {
        p_action: "RESET_PASSWORD",
        p_description: `Reset password user: ${user.full_name} (${user.email})`,
        p_entity_type: "profiles",
        p_entity_id: user.id,
      });
    } catch (err) {
      console.error("❌ Reset password:", err);
      toast.error("Gagal reset: " + err.message);
    } finally {
      setResettingId(null);
    }
  };

  const handleResetDevice = async (user, visitorId = null) => {
    const confirmMsg = visitorId
      ? `Hapus device ini dari ${user.full_name}? Pegawai perlu login ulang di device tersebut.`
      : `Hapus SEMUA device terdaftar dari ${user.full_name}? Pegawai perlu login ulang di semua device.`;
    
    if (!window.confirm(confirmMsg)) return;
    
    setResettingDeviceId(visitorId || user.id);
    try {
      const { data, error } = await supabase.rpc("reset_user_device", {
        p_user_id: user.id,
        p_visitor_id: visitorId,
      });

      if (error) throw error;

      toast.success(`✅ ${data} device berhasil direset`);

      await supabase.rpc("log_audit", {
        p_action: "RESET_DEVICE",
        p_description: `Reset device untuk: ${user.full_name} (${user.email})`,
        p_entity_type: "user_devices",
        p_entity_id: null,
        p_metadata: { visitor_id: visitorId, count: data },
      });

      fetchUserDevices(user.id);
    } catch (err) {
      console.error("❌ Reset device:", err);
      toast.error("Gagal reset device: " + err.message);
    } finally {
      setResettingDeviceId(null);
    }
  };

  const roleBadge = (role) => {
    const map = {
      super_admin: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      admin_puskesmas: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
      kepala_unit: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      pegawai: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    };
    return map[role] || "bg-gray-100 dark:bg-gray-800 text-gray-700";
  };

  const filtered = users.filter(u =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Manajemen User</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Reset password & device binding ({users.length} user)
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, username, atau email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 hidden md:table-cell">Username</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 hidden lg:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Role</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {filtered.map(u => (
                <>
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleExpand(u.id)}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold"
                        >
                          {u.full_name?.charAt(0) || "U"}
                        </button>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{u.full_name || "-"}</p>
                          <p className="text-xs text-gray-400 md:hidden">{u.username || "-"} • {u.email || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono hidden md:table-cell">{u.username || "-"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden lg:table-cell">{u.email || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>{u.role || "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button
                          onClick={() => handleResetPassword(u)}
                          disabled={resettingId === u.id}
                          title="Reset password ke default"
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg text-xs font-medium transition disabled:opacity-50"
                        >
                          {resettingId === u.id ? <RefreshCw size={11} className="animate-spin" /> : <Key size={11} />}
                          Password
                        </button>
                        <button
                          onClick={() => toggleExpand(u.id)}
                          title="Lihat & kelola device"
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-xs font-medium transition"
                        >
                          <Smartphone size={11} />
                          Device
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {expandedUser === u.id && (
                    <tr key={u.id + "-devices"} className="bg-gray-50 dark:bg-slate-800/30">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Smartphone size={14} className="text-violet-500" />
                              Device Terdaftar untuk {u.full_name}
                            </h4>
                            <button
                              onClick={() => handleResetDevice(u)}
                              disabled={resettingDeviceId === u.id}
                              className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {resettingDeviceId === u.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                              Reset Semua Device
                            </button>
                          </div>

                          {!userDevices[u.id] ? (
                            <div className="text-center py-4 text-gray-400 text-sm">
                              <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                              Memuat device...
                            </div>
                          ) : userDevices[u.id].length === 0 ? (
                            <div className="text-center py-4 text-gray-400 text-sm">
                              <Smartphone size={32} className="mx-auto mb-2 opacity-30" />
                              Belum ada device terdaftar. User belum pernah login.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {userDevices[u.id].map((device, idx) => (
                                <div
                                  key={device.id}
                                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${device.is_trusted ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                                      <Smartphone size={16} className={device.is_trusted ? "text-emerald-600" : "text-red-600"} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{device.device_name || "Unknown Device"}</p>
                                      <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {device.visitor_id.substring(0, 20)}...</p>
                                      <p className="text-xs text-gray-400 mt-0.5">Login terakhir: {new Date(device.last_login_at).toLocaleString("id-ID")}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {device.is_trusted ? (
                                      <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">Trusted</span>
                                    ) : (
                                      <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">Blocked</span>
                                    )}
                                    <button
                                      onClick={() => handleResetDevice(u, device.visitor_id)}
                                      disabled={resettingDeviceId === device.visitor_id}
                                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
                                      title="Hapus device ini"
                                    >
                                      {resettingDeviceId === device.visitor_id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>Tidak ada user ditemukan</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB 4: APPROVAL DEVICE (BARU)
// ============================================================
function TabApprovalDevice() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_pending_device_requests");
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error("❌ Fetch requests:", err);
      toast.error("Gagal memuat data request");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (requestId, userName) => {
    if (!window.confirm(`Approve device request dari ${userName}?`)) return;
    
    setProcessingId(requestId);
    try {
      const { error } = await supabase.rpc("approve_device_request", {
        p_request_id: requestId,
      });
      if (error) throw error;

      toast.success(`✅ Device ${userName} berhasil di-approve`);
      fetchRequests();
    } catch (err) {
      toast.error("Gagal approve: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId, reason) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase.rpc("reject_device_request", {
        p_request_id: requestId,
        p_reason: reason,
      });
      if (error) throw error;

      toast.success(`❌ Device request ditolak`);
      setShowRejectModal(null);
      fetchRequests();
    } catch (err) {
      toast.error("Gagal reject: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Approval Device Baru</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {requests.length} request menunggu approval
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-violet-600 transition"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Tidak ada request device yang menunggu approval
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                    <Smartphone size={20} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{req.user_name}</p>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                        PENDING
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{req.user_email}</p>
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-600 dark:text-gray-400">
                        <strong>Device:</strong> {req.device_name || "Unknown"}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <strong>OS:</strong> {req.device_os || "Unknown"}
                      </p>
                      <p className="text-gray-400 font-mono">
                        <strong>ID:</strong> {req.visitor_id?.substring(0, 30)}...
                      </p>
                      <p className="text-gray-500 mt-2">
                        <Clock size={11} className="inline mr-1" />
                        Request: {new Date(req.created_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleApprove(req.id, req.user_name)}
                    disabled={processingId === req.id}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {processingId === req.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(req)}
                    disabled={processingId === req.id}
                    className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center gap-1.5"
                  >
                    <XCircle size={12} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showRejectModal && (
        <RejectReasonModal
          request={showRejectModal}
          onClose={() => setShowRejectModal(null)}
          onConfirm={(reason) => handleReject(showRejectModal.id, reason)}
          processing={processingId === showRejectModal.id}
        />
      )}
    </div>
  );
}

function RejectReasonModal({ request, onClose, onConfirm, processing }) {
  const [reason, setReason] = useState("");

  const reasons = [
    "Bukan permintaan dari pegawai yang bersangkutan",
    "Device tidak dikenali",
    "Pegawai tidak mengajukan ganti HP",
    "Lainnya (isi di bawah)",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Tolak Request Device</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tolak request dari <strong>{request.user_name}</strong>?
          </p>

          <div className="space-y-2">
            {reasons.map((r) => (
              <label
                key={r}
                className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-4 h-4 text-red-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{r}</span>
              </label>
            ))}
          </div>

          <textarea
            value={reason === "Lainnya (isi di bawah)" ? "" : reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan penolakan (opsional)..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        <div className="flex gap-3 p-6 border-t dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={processing}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
            Tolak Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 5: AUDIT LOG
// ============================================================
function TabAuditLog() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("❌ Fetch logs:", err);
      toast.error("Gagal memuat audit log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const actionBadge = (action) => {
    const map = {
      CREATE: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      UPDATE: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      DELETE: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      CLOCK_IN: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      CLOCK_OUT: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
      RESET_PASSWORD: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      UPDATE_SETTING: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
      SET_ACTIVE_LOCATION: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
    };
    
    const prefix = action?.split("_")[0];
    return map[action] || map[prefix] || "bg-gray-100 dark:bg-gray-800 text-gray-700";
  };

  const filtered = logs.filter(l =>
    (l.action || "").toLowerCase().includes(filter.toLowerCase()) ||
    (l.user_email || "").toLowerCase().includes(filter.toLowerCase()) ||
    (l.description || "").toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Audit Log</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            100 aktivitas terakhir ({logs.length} log)
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-violet-600 transition"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan aksi, email, atau deskripsi..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Activity size={40} className="mx-auto mb-3 opacity-30" />
            <p>Belum ada aktivitas tercatat</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800">
                  <Activity size={14} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionBadge(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(log.created_at).toLocaleString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{log.description || "-"}</p>
                  {log.user_email && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">oleh: {log.user_email}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function PengaturanPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profil");

  // Cek role (double safety)
  if (user?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Shield size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Akses Ditolak</h2>
        <p className="text-gray-500 dark:text-gray-400">Halaman ini hanya untuk Super Admin.</p>
      </div>
    );
  }

  const tabs = [
    { id: "profil", label: "Profil & Lokasi", icon: MapPin },
    { id: "jam-kerja", label: "Jam Kerja & Settings", icon: Clock },
    { id: "user", label: "Manajemen User", icon: Users },
    { id: "approval", label: "Approval Device", icon: Smartphone },
    { id: "audit", label: "Audit Log", icon: Activity },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Pengaturan Sistem</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Kelola konfigurasi aplikasi, lokasi, user, dan audit log
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-2 inline-flex flex-wrap gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "profil" && <TabProfilPuskesmas />}
        {activeTab === "jam-kerja" && <TabJamKerja />}
        {activeTab === "user" && <TabManajemenUser />}
        {activeTab === "approval" && <TabApprovalDevice />}
        {activeTab === "audit" && <TabAuditLog />}
      </div>
    </div>
  );
}