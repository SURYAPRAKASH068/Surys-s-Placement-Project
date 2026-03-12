import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Building2, CheckCircle2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';

const LivePlacementChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Initial data
    const initialData = [
      { time: '10:00', placements: 12 },
      { time: '10:05', placements: 15 },
      { time: '10:10', placements: 8 },
      { time: '10:15', placements: 22 },
      { time: '10:20', placements: 18 },
      { time: '10:25', placements: 25 },
    ];
    setData(initialData);

    const interval = setInterval(() => {
      if (!isPaused) {
        setData(prev => {
          if (prev.length === 0) return initialData;
          const lastTime = prev[prev.length - 1].time;
          const [hours, minutes] = lastTime.split(':').map(Number);
          let newMinutes = minutes + 5;
          let newHours = hours;
          if (newMinutes >= 60) {
            newMinutes = 0;
            newHours = (hours + 1) % 24;
          }
          const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
          
          const newData = [...prev, { time: newTime, placements: Math.floor(Math.random() * 30) + 5 }];
          if (newData.length > 10) {
            return newData.slice(1);
          }
          return newData;
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">Live Branch Placement Activity</h3>
          <p className="text-xs text-gray-400">Real-time placement updates across branches</p>
        </div>
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
            isPaused ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isPaused ? 'Resume Live' : 'Pause Live'}
        </button>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPlacements" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
            />
            <Area 
              type="monotone" 
              dataKey="placements" 
              stroke="#10B981" 
              strokeWidth={4} 
              fillOpacity={1}
              fill="url(#colorPlacements)"
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/analytics/overview', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setStats(data));
  }, [token]);

  if (!stats) return <div>Loading dashboard...</div>;

  const BRANCH_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={stats.totalStudents} icon={Users} color="blue" />
        <StatCard title="Placed Students" value={stats.placedStudents} icon={CheckCircle2} color="emerald" />
        <StatCard title="Companies" value={stats.totalCompanies} icon={Building2} color="amber" />
        <StatCard title="Placement %" value={`${(stats.totalStudents > 0 ? (stats.placedStudents / stats.totalStudents) * 100 : 0).toFixed(1)}%`} icon={TrendingUp} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LivePlacementChart />
        
        {/* Branch-wise Placement Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6">Branch-wise Placement</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.branchStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="branch" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#4B5563' }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
                />
                <Legend iconType="circle" verticalAlign="top" align="right" height={36} />
                <Bar dataKey="total" fill="#000000" radius={[6, 6, 0, 0]} name="Total Students" />
                <Bar dataKey="placed" radius={[6, 6, 0, 0]} name="Placed Students">
                  {stats.branchStats?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={BRANCH_COLORS[index % BRANCH_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Placement Status Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6">Placement Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Placed', value: stats.placedStudents || 0 },
                    { name: 'Unplaced', value: Math.max(0, (stats.totalStudents || 0) - (stats.placedStudents || 0)) }
                  ]}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#F3F4F6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-gray-600">Placed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              <span className="text-sm text-gray-600">Unplaced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  color: 'blue' | 'emerald' | 'amber' | 'indigo';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: 'from-blue-500/10 to-blue-600/5 text-blue-600 border-blue-100',
    emerald: 'from-emerald-500/10 to-emerald-600/5 text-emerald-600 border-emerald-100',
    amber: 'from-amber-500/10 to-amber-600/5 text-amber-600 border-amber-100',
    indigo: 'from-indigo-500/10 to-indigo-600/5 text-indigo-600 border-indigo-100',
  };

  const iconColors = {
    blue: 'bg-blue-500 text-white',
    emerald: 'bg-emerald-500 text-white',
    amber: 'bg-amber-500 text-white',
    indigo: 'bg-indigo-500 text-white',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} p-6 rounded-3xl shadow-sm border flex items-center gap-5 transition-all hover:scale-[1.02] hover:shadow-md cursor-default`}>
      <div className={`p-3.5 rounded-2xl shadow-lg ${iconColors[color]}`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{title}</p>
        <p className="text-2xl font-black tracking-tight">{value}</p>
      </div>
    </div>
  );
};

export default Dashboard;
