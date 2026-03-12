import React, { useState, useEffect } from 'react';
import { X, Search, Download, Filter, Users, UserCheck, UserMinus, Award, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface BranchDrillDownProps {
  branchName: string;
  onClose: () => void;
}

const BranchDrillDown: React.FC<BranchDrillDownProps> = ({ branchName, onClose }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'placed' | 'unplaced'>('placed');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cgpaFilter, setCgpaFilter] = useState(0);
  const [skillFilter, setSkillFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStudents();
    setCurrentPage(1);
  }, [branchName, activeTab]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/branch/${branchName}/${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const url = `/api/admin/branch/${branchName}/export/${activeTab}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${branchName}_${activeTab}_Students.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.register_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCgpa = s.cgpa >= cgpaFilter;
    const matchesSkill = !skillFilter || s.skills.toLowerCase().includes(skillFilter.toLowerCase());
    const matchesCompany = !companyFilter || (s.company_name?.toLowerCase().includes(companyFilter.toLowerCase()));
    
    return matchesSearch && matchesCgpa && matchesSkill && matchesCompany;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-black tracking-tight text-gray-900">{branchName} Branch</h2>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">Drill Down</span>
            </div>
            <p className="text-gray-500 text-sm">Detailed placement analysis and student records</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stats & Tabs */}
        <div className="px-8 py-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-6">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
            <button 
              onClick={() => setActiveTab('placed')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'placed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <UserCheck size={18} />
              Placed Students
            </button>
            <button 
              onClick={() => setActiveTab('unplaced')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'unplaced' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <UserMinus size={18} />
              Unplaced Students
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Total Count</p>
                <p className="text-xl font-black text-emerald-900">{students.length}</p>
              </div>
            </div>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20"
            >
              <Download size={18} />
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 py-6 bg-gray-50/30 border-b border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search name or reg no..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white"
              value={cgpaFilter}
              onChange={e => setCgpaFilter(parseFloat(e.target.value))}
            >
              <option value="0">Min CGPA: All</option>
              <option value="6">6.0+</option>
              <option value="7">7.0+</option>
              <option value="8">8.0+</option>
              <option value="9">9.0+</option>
            </select>
          </div>
          <div className="relative">
            <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Filter by skills..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={skillFilter}
              onChange={e => setSkillFilter(e.target.value)}
            />
          </div>
          {activeTab === 'placed' && (
            <div className="relative">
              <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Filter by company..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold animate-pulse">Fetching student records...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                <Search size={40} />
              </div>
              <p className="font-bold">No students found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Academic</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                    {activeTab === 'placed' && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Placement</th>}
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/80 transition-all group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-bold group-hover:bg-emerald-500 group-hover:text-white transition-all">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{student.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{student.register_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">{student.branch}</span>
                          <span className="text-sm font-black text-gray-900">{student.cgpa} CGPA</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(JSON.parse(student.skills || '[]')).slice(0, 2).map((skill: string, i: number) => (
                            <span key={i} className="text-[10px] text-gray-400">#{skill}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm text-gray-600">{student.email}</p>
                        <p className="text-xs text-gray-400">{student.phone}</p>
                      </td>
                      {activeTab === 'placed' && (
                        <td className="px-6 py-5">
                          <p className="font-bold text-emerald-600">{student.company_name}</p>
                          <p className="text-xs text-gray-400 font-bold">{student.package} LPA</p>
                        </td>
                      )}
                      <td className="px-6 py-5 text-right">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${activeTab === 'placed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {student.placement_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && filteredStudents.length > 0 && (
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of <span className="font-bold text-gray-900">{filteredStudents.length}</span> students
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold hover:bg-white transition-all disabled:opacity-30"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${currentPage === i + 1 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'hover:bg-white border border-transparent hover:border-gray-200 text-gray-500'}`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold hover:bg-white transition-all disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default BranchDrillDown;
