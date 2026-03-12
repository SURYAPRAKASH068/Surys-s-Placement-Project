import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Target, ChevronRight } from 'lucide-react';
import BranchDrillDown from './BranchDrillDown';
import { AnimatePresence } from 'motion/react';

const Analytics: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics/overview', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setData(data));
  }, [token]);

  if (!data) return <div className="h-screen flex items-center justify-center">Loading analytics...</div>;

  const processedData = data.branchStats.map((s: any) => ({
    ...s,
    unplaced: (s.total || 0) - (s.placed || 0),
    successRate: parseFloat((s.total > 0 ? (s.placed / s.total) * 100 : 0).toFixed(1))
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Placement Success Rate (%) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-bold">Placement Success Rate (%)</h4>
              <p className="text-xs text-gray-500 mt-1">Percentage of students placed per branch</p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedData}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="branch" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} unit="%" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value}%`, 'Success Rate']}
                />
                <Area type="monotone" dataKey="successRate" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Comparison (Stacked) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-bold">Branch Comparison</h4>
              <p className="text-xs text-gray-500 mt-1">Placed vs Unplaced distribution</p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Target size={20} />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis dataKey="branch" type="category" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="placed" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} barSize={20} name="Placed" />
                <Bar dataKey="unplaced" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} name="Unplaced" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Stats Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100">
          <h4 className="text-xl font-bold">Branch-wise Detailed Statistics</h4>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 text-sm font-semibold text-gray-600">Branch</th>
              <th className="px-8 py-4 text-sm font-semibold text-gray-600">Total Students</th>
              <th className="px-8 py-4 text-sm font-semibold text-gray-600">Placed</th>
              <th className="px-8 py-4 text-sm font-semibold text-gray-600">Unplaced</th>
              <th className="px-8 py-4 text-sm font-semibold text-gray-600">Success Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {processedData.map((stat: any, idx: number) => (
              <tr 
                key={idx} 
                className="hover:bg-emerald-50/50 transition-all cursor-pointer group"
                onClick={() => setSelectedBranch(stat.branch)}
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-bold group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      {stat.branch.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{stat.branch}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Department</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <p className="text-lg font-black text-gray-900">{stat.total}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Students</p>
                </td>
                <td className="px-8 py-5">
                  <p className="text-lg font-black text-emerald-600">{stat.placed}</p>
                  <p className="text-[10px] text-emerald-600/50 uppercase tracking-widest font-bold">Placed</p>
                </td>
                <td className="px-8 py-5">
                  <p className="text-lg font-black text-red-500">{stat.unplaced}</p>
                  <p className="text-[10px] text-red-500/50 uppercase tracking-widest font-bold">Unplaced</p>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Success Rate</span>
                        <span className="text-sm font-black text-gray-900">{stat.successRate}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full shadow-sm"
                          style={{ width: `${stat.successRate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="p-2 text-gray-300 group-hover:text-emerald-500 transition-all">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedBranch && (
          <BranchDrillDown 
            branchName={selectedBranch} 
            onClose={() => setSelectedBranch(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Analytics;
