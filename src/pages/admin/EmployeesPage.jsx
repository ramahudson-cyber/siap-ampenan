import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // ✅ FIX: path yang benar
import { toast } from 'react-toastify';
import { UserPlus, Pencil, Trash2, X, Search } from 'lucide-react';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    id: '',
    username: '',
    full_name: '',
    email: '',
    role: '',
    employee_status: '',
    department: '',
    position: '',
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
        console.error('❌ Fetch error:', error);
        toast.error('Gagal memuat data pegawai: ' + error.message);
      } else {
        console.log('✅ Employees fetched:', data);
        setEmployees(data || []);
      }
    } catch (err) {
      console.error('❌ Error:', err);
      toast.error('Gagal memuat data pegawai');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const resetForm = () => {
    setFormData({
      id: '', username: '', full_name: '', email: '',
      role: '', employee_status: '', department: '', position: '',
    });
    setShowForm(false);
  };

  const handleEdit = (employee) => {
    setFormData(employee);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin hapus pegawai ini?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      toast.error('Gagal menghapus pegawai');
    } else {
      toast.success('Pegawai berhasil dihapus');
      fetchEmployees();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.id) {
        // UPDATE
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            employee_status: formData.employee_status,
            department: formData.department,
            position: formData.position,
          })
          .eq('id', formData.id);

        if (error) throw error;
        toast.success('Pegawai berhasil diperbarui');
      } else {
        // CREATE via RPC
        const { error } = await supabase.rpc('create_employee_with_auth', {
          p_username: formData.username,
          p_full_name: formData.full_name,
          p_email: formData.email,
          p_password: 'Puskesmas@123',
          p_role: formData.role,
          p_employee_status: formData.employee_status,
          p_department: formData.department,
          p_position: formData.position,
        });

        if (error) throw error;
        toast.success('Pegawai berhasil ditambahkan');
      }

      resetForm();
      fetchEmployees();
    } catch (err) {
      console.error('❌ Submit error:', err);
      toast.error('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filtered = employees.filter(emp =>
    (emp.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (emp.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (emp.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const roleBadge = (role) => {
    const map = {
      super_admin: 'bg-red-100 text-red-700',
      admin_puskesmas: 'bg-purple-100 text-purple-700',
      kepala_unit: 'bg-blue-100 text-blue-700',
      pegawai: 'bg-green-100 text-green-700',
    };
    return map[role] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Pegawai</h1>
          <p className="text-gray-500 text-sm mt-1">Total: {employees.length} pegawai</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
        >
          <UserPlus size={18} />
          Tambah Pegawai
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, username, departemen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {formData.id ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!formData.id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <input
                    type="text" name="username" value={formData.username}
                    onChange={handleInputChange} required
                    placeholder="Contoh: AMP0001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text" name="full_name" value={formData.full_name}
                  onChange={handleInputChange} required
                  placeholder="Nama lengkap pegawai"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email" name="email" value={formData.email}
                  onChange={handleInputChange} required
                  placeholder="email@puskesmas.local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="">Pilih Role</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin_puskesmas">Admin Puskesmas</option>
                    <option value="kepala_unit">Kepala Unit</option>
                    <option value="pegawai">Pegawai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select name="employee_status" value={formData.employee_status} onChange={handleInputChange} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="">Pilih Status</option>
                    <option value="asn">ASN</option>
                    <option value="pppk_penuh_waktu">PPPK Penuh Waktu</option>
                    <option value="pppk_paruh_waktu">PPPK Paruh Waktu</option>
                    <option value="tpk">TPK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departemen</label>
                <input
                  type="text" name="department" value={formData.department}
                  onChange={handleInputChange}
                  placeholder="Contoh: Poli Umum"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                <input
                  type="text" name="position" value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Contoh: Dokter Umum"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
                  Batal
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition disabled:opacity-50">
                  {loading ? 'Menyimpan...' : formData.id ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-500">Memuat data...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Tidak ada data pegawai</p>
            <p className="text-sm mt-1">Klik "Tambah Pegawai" untuk menambahkan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Departemen</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Jabatan</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">{emp.full_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{emp.username || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge(emp.role)}`}>
                        {emp.role || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{emp.employee_status || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{emp.department || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{emp.position || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(emp)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(emp.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={15} />
                        </button>
                      </div>
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
};

export default EmployeesPage;