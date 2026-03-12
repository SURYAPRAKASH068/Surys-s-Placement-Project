import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Download, Search, Edit2, Trash2, User, Plus, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { safeParseJson } from '../lib/utils';

interface Student {
  id: number;
  name: string;
  email: string;
  branch: string;
  cgpa: number;
  backlogs: number;
  attendance: number;
  skills: string;
  placement_status: string;
  register_number?: string;
  phone?: string;
  company_name?: string;
  package?: number;
}

const StudentManagement: React.FC = () => {
  const { token } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmationInput, setDeleteAllConfirmationInput] = useState('');
  const CONFIRMATION_WORD = 'DELETE_ALL_STUDENTS';

  useEffect(() => {
    fetchStudents();
  }, [token]);

  const fetchStudents = async () => {
    const res = await fetch('/api/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setStudents(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/bulk-upload/students', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        alert('Bulk upload successful!');
        fetchStudents();
      }
    } catch (err) {
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(students.map(s => ({
      ...s,
      skills: typeof s.skills === 'string' ? s.skills : JSON.stringify(s.skills)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_List.xlsx");
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const res = await fetch(`/api/students/${editingStudent.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(editingStudent)
    });
    if (res.ok) {
      setEditingStudent(null);
      fetchStudents();
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    const res = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      fetchStudents();
    }
  };

  const handleDeleteAllStudents = () => {
    setShowDeleteAllModal(true);
    setDeleteAllConfirmationInput('');
  };

  const confirmDeleteAll = async () => {
    if (deleteAllConfirmationInput !== CONFIRMATION_WORD) return;
    
    try {
      const res = await fetch('/api/students', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setShowDeleteAllModal(false);
        fetchStudents();
        alert('All student records have been deleted.');
      } else {
        const errorData = await res.json();
        alert(`Failed to delete students: ${errorData.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Delete all error:', err);
      alert('A network error occurred while trying to delete students.');
    }
  };

  const addSkill = () => {
    if (!newSkill.trim() || !editingStudent) return;
    const currentSkills = safeParseJson(editingStudent.skills);
    if (!Array.isArray(currentSkills)) {
      setEditingStudent({ ...editingStudent, skills: JSON.stringify([newSkill.trim()]) });
    } else if (!currentSkills.includes(newSkill.trim())) {
      const updatedSkills = [...currentSkills, newSkill.trim()];
      setEditingStudent({ ...editingStudent, skills: JSON.stringify(updatedSkills) });
    }
    setNewSkill('');
  };

  const removeSkill = (skillToRemove: string) => {
    if (!editingStudent) return;
    const currentSkills = safeParseJson(editingStudent.skills);
    if (Array.isArray(currentSkills)) {
      const updatedSkills = currentSkills.filter((s) => s !== skillToRemove);
      setEditingStudent({ ...editingStudent, skills: JSON.stringify(updatedSkills) });
    }
  };

  const filteredStudents = students.filter(s => 
    (s.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (s.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (s.branch?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search students by name, email or branch..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDeleteAllStudents}
            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl hover:bg-red-100 transition-all"
          >
            <Trash2 size={18} />
            <span className="font-medium">Delete All</span>
          </button>
          <label className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
            <Upload size={18} />
            <span className="font-medium">Bulk Upload</span>
            <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Download size={18} />
            <span className="font-medium">Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-bottom border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Student / Reg No</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Branch</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Academic / Skills</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Placement Info</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50 transition-all">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      <User size={14} className="mr-0.5" />
                      {student.name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{student.register_number}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{student.branch}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{student.cgpa} CGPA</span>
                    <span className="text-[10px] text-gray-400">({student.backlogs} Backlogs)</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {safeParseJson(student.skills).slice(0, 3).map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {student.placement_status === 'placed' ? (
                    <div>
                      <p className="text-sm font-bold text-emerald-600">{student.company_name}</p>
                      <p className="text-xs text-gray-400">{student.package} LPA</p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Not Placed</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={async () => {
                      const newStatus = student.placement_status === 'placed' ? 'unplaced' : 'placed';
                      const res = await fetch(`/api/students/${student.id}`, {
                        method: 'PUT',
                        headers: { 
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}` 
                        },
                        body: JSON.stringify({ ...student, placement_status: newStatus })
                      });
                      if (res.ok) fetchStudents();
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                      student.placement_status === 'placed' 
                        ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={`Click to mark as ${student.placement_status === 'placed' ? 'unplaced' : 'placed'}`}
                  >
                    {student.placement_status}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingStudent(student)}
                      className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteStudent(student.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Edit Student Data</h3>
              <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CGPA</label>
                  <input 
                    type="number" step="0.1" required 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={editingStudent.cgpa || ''}
                    onChange={e => setEditingStudent({...editingStudent, cgpa: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Backlogs</label>
                  <input 
                    type="number" required 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={editingStudent.backlogs ?? ''}
                    onChange={e => setEditingStudent({...editingStudent, backlogs: e.target.value === '' ? 0 : parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Register Number</label>
                  <input 
                    type="text" required 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={editingStudent.register_number || ''}
                    onChange={e => setEditingStudent({...editingStudent, register_number: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input 
                    type="text" required 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={editingStudent.phone || ''}
                    onChange={e => setEditingStudent({...editingStudent, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placement Status</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={editingStudent.placement_status}
                    onChange={e => setEditingStudent({...editingStudent, placement_status: e.target.value})}
                  >
                    <option value="unplaced">Unplaced</option>
                    <option value="placed">Placed</option>
                  </select>
                </div>
                {editingStudent.placement_status === 'placed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Package (LPA)</label>
                    <input 
                      type="number" step="0.1"
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={editingStudent.package || ''}
                      onChange={e => setEditingStudent({...editingStudent, package: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                    />
                  </div>
                )}
              </div>

              {editingStudent.placement_status === 'placed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input 
                    type="text"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={editingStudent.company_name || ''}
                    onChange={e => setEditingStudent({...editingStudent, company_name: e.target.value})}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text"
                    placeholder="Add a skill..."
                    className="flex-1 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <button 
                    type="button"
                    onClick={addSkill}
                    className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {safeParseJson(editingStudent.skills).map((s: string, i: number) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 border-2 border-red-100 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tight">Irreversible Action</h3>
            </div>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              You are about to <span className="font-bold text-red-600">permanently delete all student records</span>. 
              This action cannot be undone and will remove all associated data including placement status and skills.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Type <span className="text-red-600 select-all">{CONFIRMATION_WORD}</span> to confirm
                </label>
                <input 
                  type="text"
                  className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-50 outline-none transition-all font-mono text-sm"
                  placeholder="Type confirmation here..."
                  value={deleteAllConfirmationInput}
                  onChange={e => setDeleteAllConfirmationInput(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowDeleteAllModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteAll}
                  disabled={deleteAllConfirmationInput !== CONFIRMATION_WORD}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Delete Everything
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
