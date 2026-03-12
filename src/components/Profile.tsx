import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, GraduationCap, Code, Brain, Download, Plus, X, TrendingUp, AlertCircle, Info, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import { safeParseJson } from '../lib/utils';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  branch: string;
  cgpa: number;
  attendance: number;
  backlogs: number;
  coding_score: number;
  aptitude_score: number;
  skills: string;
  placement_status: string;
  ai_prediction?: string;
}

const Profile: React.FC = () => {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (user) {
      fetch(`/api/students/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setProfile(data));
    }
  }, [user, token]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    const res = await fetch(`/api/students/${user.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(profile)
    });
    if (res.ok) {
      setIsEditing(false);
      alert('Profile updated successfully!');
    }
  };

  const generateResume = () => {
    if (!profile) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(profile.name || 'Student', 20, 20);
    doc.setFontSize(12);
    doc.text(`Email: ${profile.email}`, 20, 30);
    doc.text(`Branch: ${profile.branch}`, 20, 35);
    doc.text(`CGPA: ${profile.cgpa}`, 20, 40);
    
    doc.setFontSize(16);
    doc.text("Skills", 20, 55);
    doc.setFontSize(12);
    const skills = safeParseJson(profile.skills);
    doc.text(Array.isArray(skills) ? skills.join(", ") : "", 20, 65);

    doc.setFontSize(16);
    doc.text("Academic Performance", 20, 80);
    doc.setFontSize(12);
    doc.text(`Attendance: ${profile.attendance}%`, 20, 90);
    doc.text(`Backlogs: ${profile.backlogs}`, 20, 95);
    doc.text(`Coding Score: ${profile.coding_score}/100`, 20, 100);
    doc.text(`Aptitude Score: ${profile.aptitude_score}/100`, 20, 105);

    doc.save(`${profile.name || 'Student'}_Resume.pdf`);
  };

  const addSkill = () => {
    if (!newSkill.trim() || !profile) return;
    const currentSkills = safeParseJson(profile.skills);
    if (!Array.isArray(currentSkills)) {
      setProfile({ ...profile, skills: JSON.stringify([newSkill.trim()]) });
    } else if (!currentSkills.includes(newSkill.trim())) {
      const updatedSkills = [...currentSkills, newSkill.trim()];
      setProfile({ ...profile, skills: JSON.stringify(updatedSkills) });
    }
    setNewSkill('');
  };

  const removeSkill = (skillToRemove: string) => {
    if (!profile) return;
    const currentSkills = safeParseJson(profile.skills);
    if (Array.isArray(currentSkills)) {
      const updatedSkills = currentSkills.filter((s) => s !== skillToRemove);
      setProfile({ ...profile, skills: JSON.stringify(updatedSkills) });
    }
  };

  if (!profile) return <div>Loading profile...</div>;

  const aiPrediction = safeParseJson(profile.ai_prediction, {});

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
        <div className="w-32 h-32 rounded-3xl bg-emerald-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-emerald-500/20">
          {profile.name?.[0] || '?'}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-3xl font-bold text-gray-900">{profile.name || 'Unknown User'}</h3>
          <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2 mt-1">
            <Mail size={16} /> {profile.email}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider">{profile.branch}</span>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">CGPA: {profile.cgpa}</span>
            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold uppercase tracking-wider">{profile.placement_status}</span>
          </div>
        </div>
        <button 
          onClick={generateResume}
          className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg"
        >
          <Download size={20} /> Resume
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4 text-emerald-600">
            <GraduationCap size={20} />
            <h4 className="font-bold">Academic</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Attendance</span>
              <span className="font-bold">{profile.attendance}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Backlogs</span>
              <span className="font-bold">{profile.backlogs}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4 text-blue-600">
            <Code size={20} />
            <h4 className="font-bold">Technical</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Coding Score</span>
              <span className="font-bold">{profile.coding_score}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Aptitude</span>
              <span className="font-bold">{profile.aptitude_score}/100</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4 text-amber-600">
            <Brain size={20} />
            <h4 className="font-bold">Skills</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {safeParseJson(profile.skills).map((skill: string, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium">{skill}</span>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      {profile.ai_prediction && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">AI Placement Insights</h4>
                <p className="text-sm text-gray-500">Personalized analysis based on your profile</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-2xl font-black text-emerald-600">
                  {typeof aiPrediction.probability === 'number' 
                    ? `${aiPrediction.probability}%` 
                    : 'N/A'}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Placement</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-indigo-600">
                  {typeof aiPrediction.performance_score === 'number' 
                    ? `${aiPrediction.performance_score}%` 
                    : 'N/A'}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performance</div>
              </div>
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Weak Areas */}
              <div>
                <h5 className="font-bold text-sm text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertCircle size={16} /> Critical Gaps
                </h5>
                <div className="flex flex-wrap gap-2">
                  {aiPrediction.weak_areas?.map((area: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-100">
                      {area}
                    </span>
                  ))}
                  {(!aiPrediction.weak_areas || aiPrediction.weak_areas.length === 0) && (
                    <p className="text-sm text-gray-400 italic">No significant weak areas identified.</p>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h5 className="font-bold text-sm text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingUp size={16} /> Roadmap
                </h5>
                <div className="space-y-3">
                  {aiPrediction.recommendations?.slice(0, 2).map((rec: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                      <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                        rec.priority === 'High' ? 'bg-red-500' :
                        rec.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{rec.category}</p>
                        <p className="text-[11px] text-gray-700 font-bold leading-tight">{rec.suggestion}</p>
                      </div>
                    </div>
                  ))}
                  {(!aiPrediction.recommendations || aiPrediction.recommendations.length === 0) && (
                    <p className="text-sm text-gray-400 italic">No specific recommendations at this time.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Industry Insights Summary */}
            {aiPrediction.industry_insights && (
              <div className="mt-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <h5 className="font-bold text-[10px] text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Sparkles size={14} /> Market Insight
                </h5>
                <p className="text-[11px] text-indigo-900 leading-relaxed line-clamp-2">
                  {aiPrediction.industry_insights}
                </p>
              </div>
            )}
          
          <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center">
            <p className="text-xs text-gray-400">
              <Info size={12} className="inline mr-1" /> 
              These insights are generated by AI and should be used as a guide for improvement.
            </p>
            <button 
              onClick={() => window.location.hash = '#ai-prediction'} 
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              View Full Analysis →
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-xl font-bold">Edit Profile Details</h4>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-emerald-600 font-bold hover:underline"
          >
            {isEditing ? 'Cancel' : 'Edit Details'}
          </button>
        </div>

        <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CGPA</label>
            <input 
              type="number" step="0.1" disabled={!isEditing}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50"
              value={profile.cgpa || ''}
              onChange={e => setProfile({...profile, cgpa: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attendance (%)</label>
            <input 
              type="number" disabled={!isEditing}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50"
              value={profile.attendance || ''}
              onChange={e => setProfile({...profile, attendance: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Backlogs</label>
            <input 
              type="number" disabled={!isEditing}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50"
              value={profile.backlogs ?? ''}
              onChange={e => setProfile({...profile, backlogs: e.target.value === '' ? 0 : parseInt(e.target.value)})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coding Score</label>
            <input 
              type="number" disabled={!isEditing}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50"
              value={profile.coding_score ?? ''}
              onChange={e => setProfile({...profile, coding_score: e.target.value === '' ? 0 : parseInt(e.target.value)})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aptitude Score</label>
            <input 
              type="number" disabled={!isEditing}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50"
              value={profile.aptitude_score ?? ''}
              onChange={e => setProfile({...profile, aptitude_score: e.target.value === '' ? 0 : parseInt(e.target.value)})}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex gap-2">
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
                <div className="flex flex-wrap gap-2">
                  {safeParseJson(profile.skills).map((s: string, i: number) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {safeParseJson(profile.skills).map((s: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            )}
          </div>
          {isEditing && (
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20">Save Changes</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile;
