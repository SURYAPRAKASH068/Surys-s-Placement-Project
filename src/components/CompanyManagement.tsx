import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, CheckCircle, XCircle, Download, Mail, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Company {
  id: number;
  name: string;
  min_cgpa: number;
  max_backlogs: number;
  allowed_branches: string;
  required_skills: string;
  salary_package: number;
  drive_year: number;
  description?: string;
}

interface EligibleStudent {
  id: number;
  name: string;
  email: string;
  branch: string;
  cgpa: number;
  backlogs: number;
}

const CompanyManagement: React.FC = () => {
  const { token, user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudent[]>([]);
  const [isNotifying, setIsNotifying] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmationInput, setDeleteAllConfirmationInput] = useState('');
  const CONFIRMATION_WORD = 'DELETE_ALL_COMPANIES';

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newCompany, setNewCompany] = useState({
    name: '',
    min_cgpa: 7.0,
    max_backlogs: 0,
    allowed_branches: ['CSE', 'ECE', 'ME', 'CIVIL', 'EEE'],
    required_skills: [] as string[],
    salary_package: 5.0,
    drive_year: new Date().getFullYear(),
    description: ''
  });

  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, [token]);

  const fetchCompanies = async () => {
    const res = await fetch('/api/companies', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setCompanies(data);
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...newCompany,
          allowed_branches: JSON.stringify(newCompany.allowed_branches),
          required_skills: JSON.stringify(newCompany.required_skills)
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchCompanies();
        alert('Company drive created! Eligible students are being notified via email.');
      }
    } catch (err) {
      alert('Failed to create company drive');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!confirm('Are you sure you want to delete this company drive?')) return;
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCompanies();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete company drive');
      }
    } catch (err) {
      alert('Failed to delete company drive');
    }
  };

  const checkEligibility = async (companyId: number) => {
    const res = await fetch(`/api/companies/${companyId}/eligible`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setEligibleStudents(data);
    setSelectedCompany(companies.find(c => c.id === companyId) || null);
  };

  const exportEligibleList = () => {
    if (!selectedCompany) return;
    const ws = XLSX.utils.json_to_sheet(eligibleStudents);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Eligible Students");
    XLSX.writeFile(wb, `${selectedCompany.name}_Eligible_List.xlsx`);
  };

  const handleNotifyAll = async () => {
    if (!selectedCompany) return;
    if (!confirm(`Are you sure you want to notify all ${eligibleStudents.length} eligible students?`)) return;

    setIsNotifying(true);
    try {
      const res = await fetch(`/api/companies/${selectedCompany.id}/notify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Successfully queued notifications for ${data.notifiedCount} students.`);
      }
    } catch (err) {
      alert('Failed to send notifications.');
    } finally {
      setIsNotifying(false);
    }
  };

  const handleDeleteAllCompanies = () => {
    setShowDeleteAllModal(true);
    setDeleteAllConfirmationInput('');
  };

  const confirmDeleteAll = async () => {
    if (deleteAllConfirmationInput !== CONFIRMATION_WORD) return;
    
    try {
      const res = await fetch('/api/companies', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setShowDeleteAllModal(false);
        fetchCompanies();
        alert('All companies data deleted successfully.');
      } else {
        const errorData = await res.json();
        alert(`Failed to delete companies: ${errorData.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Delete all error:', err);
      alert('A network error occurred while trying to delete companies.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Placement Drives</h3>
        <div className="flex gap-3">
          {(user?.role === 'admin' || user?.role === 'faculty') && (
            <button 
              onClick={handleDeleteAllCompanies}
              disabled={companies.length === 0}
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 transition-all border border-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              <span className="font-medium">Delete All Companies Data</span>
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'faculty') && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus size={18} />
              <span className="font-medium">Add Company</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <div key={company.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                <Building2 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{company.name}</h4>
                <p className="text-sm text-emerald-600 font-medium">{company.salary_package} LPA</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Min CGPA</span>
                <span className="font-medium">{company.min_cgpa}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Max Backlogs</span>
                <span className="font-medium">{company.max_backlogs}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Year</span>
                <span className="font-medium">{company.drive_year}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => checkEligibility(company.id)}
                className="flex-1 bg-emerald-50 text-emerald-600 font-semibold py-2 rounded-xl hover:bg-emerald-100 transition-all text-sm"
              >
                Check Eligibility
              </button>
              <button className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 rounded-xl transition-all">
                <Mail size={18} />
              </button>
              <button 
                onClick={() => handleDeleteCompany(company.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Eligible Students Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Eligible Students for {selectedCompany.name}</h3>
                <p className="text-sm text-gray-500">{eligibleStudents.length} students found</p>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <XCircle size={24} className="text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left">
                <thead className="text-sm font-semibold text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="pb-4">Name</th>
                    <th className="pb-4">Branch</th>
                    <th className="pb-4">CGPA</th>
                    <th className="pb-4">Backlogs</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {eligibleStudents.map(s => (
                    <tr key={s.id}>
                      <td className="py-4 text-sm font-medium">{s.name}</td>
                      <td className="py-4 text-sm text-gray-600">{s.branch}</td>
                      <td className="py-4 text-sm font-bold">{s.cgpa}</td>
                      <td className="py-4 text-sm text-gray-600">{s.backlogs}</td>
                      <td className="py-4">
                        <span className="text-emerald-500 flex items-center gap-1 text-xs font-bold">
                          <CheckCircle size={14} /> ELIGIBLE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={handleNotifyAll}
                disabled={isNotifying || eligibleStudents.length === 0}
                className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-semibold hover:bg-blue-100 transition-all disabled:opacity-50"
              >
                <Mail size={18} /> {isNotifying ? 'Notifying...' : 'Notify All'}
              </button>
              <button 
                onClick={exportEligibleList}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold"
              >
                <Download size={18} /> Download Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8">
            <h3 className="text-2xl font-bold mb-6">Add New Placement Drive</h3>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input 
                  type="text" required 
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newCompany.name}
                  onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min CGPA</label>
                  <input 
                    type="number" step="0.1" required 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={isNaN(newCompany.min_cgpa) ? '' : newCompany.min_cgpa}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setNewCompany({...newCompany, min_cgpa: isNaN(val) ? 0 : val});
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Backlogs</label>
                  <input 
                    type="number" required 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={isNaN(newCompany.max_backlogs) ? '' : newCompany.max_backlogs}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setNewCompany({...newCompany, max_backlogs: isNaN(val) ? 0 : val});
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Package (LPA)</label>
                <input 
                  type="number" step="0.1" required 
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={isNaN(newCompany.salary_package) ? '' : newCompany.salary_package}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setNewCompany({...newCompany, salary_package: isNaN(val) ? 0 : val});
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Branches</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['CSE', 'ECE', 'ME', 'CIVIL', 'EEE'].map(branch => (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => {
                        const branches = newCompany.allowed_branches.includes(branch)
                          ? newCompany.allowed_branches.filter(b => b !== branch)
                          : [...newCompany.allowed_branches, branch];
                        setNewCompany({...newCompany, allowed_branches: branches});
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        newCompany.allowed_branches.includes(branch)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {branch}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Add skill..."
                    className="flex-1 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (skillInput.trim()) {
                          setNewCompany({...newCompany, required_skills: [...newCompany.required_skills, skillInput.trim()]});
                          setSkillInput('');
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newCompany.required_skills.map(skill => (
                    <span key={skill} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-1">
                      {skill}
                      <button 
                        type="button" 
                        onClick={() => setNewCompany({...newCompany, required_skills: newCompany.required_skills.filter(s => s !== skill)})}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 text-gray-500 font-semibold">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Drive'}
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
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Clear All Drives</h3>
            </div>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              You are about to <span className="font-bold text-red-600">permanently delete all placement drives</span>. 
              This will also remove all student applications for these drives. This action cannot be undone.
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
                  Delete All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
