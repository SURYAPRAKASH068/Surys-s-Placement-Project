import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BrainCircuit, Sparkles, TrendingUp, AlertCircle, Info, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

interface Prediction {
  probability: number;
  risk_category: string;
  performance_score: number;
  academic_standing: string;
  explanation: string;
  industry_insights?: string;
  company_matches?: Array<{ company: string; match_score: number; reason: string }>;
  weak_areas?: string[];
  recommendations?: Array<{ category: string; suggestion: string; priority: string }>;
  feature_importance?: Array<{ feature: string; impact: number; reason: string }>;
}

const AIPrediction: React.FC = () => {
  const { token, user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'student') {
      fetch('/api/students', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setStudents(data));
    } else {
      setSelectedStudentId(user.id.toString());
      // Fetch own profile for completeness check and existing prediction
      fetch(`/api/students/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setStudents([data]); // Store own profile in students array for easy access
        if (data.ai_prediction) {
          try {
            const parsed = typeof data.ai_prediction === 'string' ? JSON.parse(data.ai_prediction) : data.ai_prediction;
            setPrediction(parsed);
          } catch (e) {
            console.error("Failed to parse existing prediction", e);
          }
        }
      });
    }
  }, [token, user]);

  // Handle student selection change for non-student roles
  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    const student = students.find(s => s.id.toString() === id);
    if (student && student.ai_prediction) {
      try {
        const parsed = typeof student.ai_prediction === 'string' ? JSON.parse(student.ai_prediction) : student.ai_prediction;
        setPrediction(parsed);
      } catch (e) {
        console.error("Failed to parse existing prediction", e);
        setPrediction(null);
      }
    } else {
      setPrediction(null);
    }
  };

  const [completeness, setCompleteness] = useState({ score: 0, missing: [] as string[] });

  useEffect(() => {
    if (user?.role === 'student') {
      const student = students.find(s => s.id.toString() === user.id.toString()) || user;
      const fields = [
        { name: 'CGPA', value: student.cgpa },
        { name: 'Attendance', value: student.attendance },
        { name: 'Coding Score', value: student.coding_score },
        { name: 'Aptitude Score', value: student.aptitude_score },
        { name: 'Skills', value: student.skills && student.skills !== '[]' && student.skills !== '' }
      ];
      const filled = fields.filter(f => f.value !== undefined && f.value !== null && f.value !== 0 && f.value !== false);
      const missing = fields.filter(f => f.value === undefined || f.value === null || f.value === 0 || f.value === false).map(f => f.name);
      setCompleteness({ 
        score: (filled.length / fields.length) * 100, 
        missing 
      });
    }
  }, [students, user]);

  const handlePredict = async () => {
    if (!selectedStudentId) return;
    
    // Check if current student profile is complete (if student role)
    if (user?.role === 'student') {
      const student = students.find(s => s.id.toString() === selectedStudentId) || user;
      const missingFields = [];
      if (!student.cgpa && student.cgpa !== 0) missingFields.push('CGPA');
      if (student.attendance === undefined || student.attendance === null) missingFields.push('Attendance');
      if (student.coding_score === undefined || student.coding_score === null) missingFields.push('Coding Score');
      if (!student.skills || student.skills === '[]' || student.skills === '') missingFields.push('Skills');

      if (missingFields.length > 0) {
        alert(`Please complete your profile details (${missingFields.join(', ')}) in the Profile tab before running the AI analysis.`);
        return;
      }
    }

    setLoading(true);
    setPrediction(null);
    setError(null);
    try {
      // 1. Get context from backend
      const contextRes = await fetch(`/api/ai/context/${selectedStudentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!contextRes.ok) throw new Error('Failed to fetch student context');
      const context = await contextRes.json();

      // 2. Call Gemini API
      const apiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
      if (!apiKey) throw new Error('Gemini API Key not configured in environment');

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analyze student profile and predict placement probability: ${JSON.stringify(context.student)}. Companies: ${JSON.stringify(context.companies)}. Trends: ${JSON.stringify(context.historicalStats)}. Be critical and realistic.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
          systemInstruction: "You are a professional placement predictor. Return ONLY JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              probability: { type: Type.NUMBER },
              performance_score: { type: Type.NUMBER },
              academic_standing: { type: Type.STRING },
              risk_category: { type: Type.STRING },
              explanation: { type: Type.STRING },
              industry_insights: { type: Type.STRING },
              company_matches: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    company: { type: Type.STRING }, 
                    match_score: { type: Type.NUMBER }, 
                    reason: { type: Type.STRING } 
                  }, 
                  required: ["company", "match_score", "reason"] 
                } 
              },
              weak_areas: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    category: { type: Type.STRING }, 
                    suggestion: { type: Type.STRING }, 
                    priority: { type: Type.STRING } 
                  }, 
                  required: ["category", "suggestion", "priority"] 
                } 
              },
              feature_importance: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    feature: { type: Type.STRING }, 
                    impact: { type: Type.NUMBER }, 
                    reason: { type: Type.STRING } 
                  }, 
                  required: ["feature", "impact", "reason"] 
                } 
              }
            },
            required: ["probability", "performance_score", "academic_standing", "risk_category", "explanation", "weak_areas", "recommendations", "feature_importance", "industry_insights", "company_matches"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI model");
      
      const result = JSON.parse(text.trim());

      // 3. Save prediction back to server
      await fetch('/api/ai/save-prediction', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ studentId: selectedStudentId, prediction: result })
      });

      setPrediction(result);
      setStudents(prev => prev.map(s => s.id.toString() === selectedStudentId ? { ...s, ai_prediction: result } : s));
    } catch (err: any) {
      console.error("AI Prediction Error:", err);
      let msg = err.message || 'Prediction failed';
      if (msg.includes('API key not valid')) {
        msg = "Invalid Gemini API Key. Please check your project settings in AI Studio.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <BrainCircuit size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold">AI Placement Predictor</h3>
            <p className="text-gray-500">Predict placement probability using Explainable AI (XAI)</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          {user?.role !== 'student' ? (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
              <select 
                value={selectedStudentId}
                onChange={e => handleStudentChange(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">Choose a student...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.branch})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex-1">
              <p className="text-gray-600 mb-2">Predicting for: <span className="font-bold">{user.name}</span></p>
            </div>
          )}
          <button 
            onClick={handlePredict}
            disabled={loading || !selectedStudentId}
            className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px]"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Predict Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}

        {prediction ? (
          <motion.div 
            key="prediction-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Probability Score & Performance */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="relative w-40 h-40 mb-6">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#F3F4F6" strokeWidth="8" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" stroke="#10B981" strokeWidth="8" 
                      strokeDasharray={`${(prediction.probability || 0) * 2.827} 282.7`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-gray-900">
                      {typeof prediction.probability === 'number' ? `${prediction.probability}%` : '0%'}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Placement</span>
                  </div>
                </div>
                <div className={`px-4 py-1 rounded-full text-xs font-bold ${
                  prediction.risk_category === 'Low' ? 'bg-emerald-100 text-emerald-600' :
                  prediction.risk_category === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                }`}>
                  Risk: {prediction.risk_category}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="relative w-40 h-40 mb-6">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#F3F4F6" strokeWidth="8" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" stroke="#6366F1" strokeWidth="8" 
                      strokeDasharray={`${(prediction.performance_score || 0) * 2.827} 282.7`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-gray-900">
                      {typeof prediction.performance_score === 'number' ? `${prediction.performance_score}%` : '0%'}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Performance</span>
                  </div>
                </div>
                <div className={`px-4 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-600`}>
                  Standing: {prediction.academic_standing}
                </div>
              </div>
            </div>

            {/* XAI Explanation */}
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6 text-emerald-600">
                <Info size={20} />
                <h4 className="font-bold text-lg uppercase tracking-tight">Explainable AI (XAI) Insights</h4>
              </div>
              <div className="prose prose-emerald max-w-none text-gray-600">
                <ReactMarkdown>{prediction.explanation}</ReactMarkdown>
              </div>

              {/* Industry Insights */}
              {prediction.industry_insights && (
                <div className="mt-10 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                  <h5 className="font-bold text-sm text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={18} /> Market Trends & Industry Insights
                  </h5>
                  <div className="text-sm text-indigo-900 leading-relaxed font-medium">
                    <ReactMarkdown>{prediction.industry_insights}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Company Matches */}
              {prediction.company_matches && prediction.company_matches.length > 0 && (
                <div className="mt-10">
                  <h5 className="font-bold text-sm text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Building2 size={18} /> Best-Fit Company Matches
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {prediction.company_matches.map((match, idx) => (
                      <div key={idx} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-bold text-gray-900">{match.company}</span>
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                            {match.match_score}% Match
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{match.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak Areas */}
              {prediction.weak_areas && prediction.weak_areas.length > 0 && (
                <div className="mt-10">
                  <h5 className="font-bold text-sm text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <AlertCircle size={18} /> Identified Weak Areas
                  </h5>
                  <ul className="space-y-3 list-none">
                    {prediction.weak_areas.map((area, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-4 bg-red-50/30 rounded-2xl border border-red-100/50 group hover:bg-red-50 transition-colors">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 group-hover:scale-125 transition-transform" />
                        <span className="text-sm font-semibold text-gray-700">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {prediction.recommendations && prediction.recommendations.length > 0 && (
                <div className="mt-10">
                  <h5 className="font-bold text-sm text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <TrendingUp size={18} /> Actionable Roadmap
                  </h5>
                  <div className="space-y-4">
                    {prediction.recommendations.map((rec, idx) => (
                      <div key={idx} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-5 group">
                        <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          rec.priority === 'High' ? 'bg-red-100 text-red-600' :
                          rec.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {rec.priority === 'High' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{rec.category}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                              rec.priority === 'High' ? 'bg-red-500 text-white' :
                              rec.priority === 'Medium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                            }`}>
                              {rec.priority} Priority
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 font-bold leading-relaxed">{rec.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Feature Importance */}
              <div className="mt-12 pt-10 border-t border-gray-50">
                <h5 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <BrainCircuit size={16} /> Feature Impact Analysis (XAI)
                </h5>
                <div className="space-y-6">
                  {prediction.feature_importance?.map((feat, idx) => (
                    <div key={idx} className="group relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700">{feat.feature}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl shadow-xl z-10 leading-relaxed">
                              <p className="font-bold mb-1 text-emerald-400">Why this matters:</p>
                              {feat.reason}
                              <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1"></div>
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs font-black ${feat.impact > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {feat.impact > 0 ? 'Positive Impact' : 'Negative Impact'} ({feat.impact > 0 ? '+' : ''}{feat.impact})
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${feat.impact > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ 
                              width: `${Math.abs(feat.impact || 0) * 10}%`,
                              marginLeft: feat.impact < 0 ? `${50 - Math.abs(feat.impact) * 5}%` : '0'
                            }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : !loading && (
          <motion.div 
            key="no-prediction"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
              {loading ? (
                <Loader2 size={48} className="animate-spin" />
              ) : (
                <Sparkles size={48} className="animate-pulse" />
              )}
            </div>
            <div className="max-w-md">
              <h4 className="text-2xl font-black text-gray-900 mb-2">
                {loading ? 'AI is Thinking...' : (user?.role === 'student' ? 'Unlock Your Career Potential' : 'Ready for Analysis')}
              </h4>
              <p className="text-gray-500 leading-relaxed mb-6">
                {loading 
                  ? "Our Gemini AI is currently analyzing academic records, skill sets, and market trends to generate your personalized placement roadmap."
                  : (user?.role === 'student' 
                    ? "Our advanced Gemini AI is ready to analyze your profile. Get personalized placement probabilities, performance scores, and a custom roadmap to your dream job."
                    : "Select a student and click 'Predict Now' to generate a deep-dive analysis of their placement readiness and potential risk factors.")}
              </p>
              
              {!loading && user?.role === 'student' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 text-left">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-gray-700">Profile Completeness</span>
                      <span className="text-sm font-black text-emerald-600">{Math.round(completeness.score)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000" 
                        style={{ width: `${completeness.score}%` }}
                      ></div>
                    </div>
                    {completeness.missing.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Missing Information:</p>
                        <div className="flex flex-wrap gap-2">
                          {completeness.missing.map(m => (
                            <span key={m} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500">
                              {m}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-amber-600 mt-4 flex items-center gap-1">
                          <AlertCircle size={12} /> Complete these in the Profile tab for a better prediction.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 flex items-center gap-1 font-bold">
                        <CheckCircle2 size={14} /> Your profile is ready for analysis!
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={handlePredict}
                    disabled={loading}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                    {loading ? 'Analyzing Your Future...' : 'Run AI Analysis Now'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIPrediction;
