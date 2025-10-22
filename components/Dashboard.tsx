import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Card from './shared/Card';
import Metric from './shared/Metric';
import StatusChip from './shared/StatusChip';

const activityData = [
  { Action: 'OCR completed', Document: 'Cardiac_Monitor_510k.pdf', Time: '2 min ago', Status: 'Success' },
  { Action: 'Agent review started', Document: 'IVD_Submission_2024.pdf', Time: '15 min ago', Status: 'Running' },
  { Action: 'Checklist generated', Document: 'Orthopedic_Implant.pdf', Time: '1 hour ago', Status: 'Success' },
  { Action: 'Agent failed', Document: 'Software_Validation.docx', Time: '2 hours ago', Status: 'Error' },
];

const confidenceData = [
  { name: 'Mon', Confidence: 92.1 },
  { name: 'Tue', Confidence: 93.5 },
  { name: 'Wed', Confidence: 94.2 },
  { name: 'Thu', Confidence: 93.8 },
  { name: 'Fri', Confidence: 94.7 },
];

const performanceData = [
  { name: 'Performance', Count: 12 },
  { name: 'Clinical', Count: 8 },
  { name: 'Documentation', Count: 15 },
  { name: 'Analytics', Count: 6 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Metric label="Active Sessions" value="12" delta="+2" />
        <Metric label="OCR Confidence" value="94.7%" delta="+0.5%" />
        <Metric label="Agents Running" value="3" />
        <Metric label="Avg. Review Time" value="4.2h" delta="-0.8h" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">📈 OCR Confidence Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={confidenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-secondary)" />
              <YAxis stroke="var(--color-text-secondary)" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-card-bg-start)', borderColor: 'var(--color-border)' }} />
              <Legend />
              <Line type="monotone" dataKey="Confidence" stroke="var(--color-primary)" strokeWidth={3} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">🎯 Agent Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-secondary)" />
              <YAxis stroke="var(--color-text-secondary)" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-card-bg-start)', borderColor: 'var(--color-border)' }} />
              <Legend />
              <Bar dataKey="Count" fill="var(--color-secondary)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      
      {/* Recent Activity and Model Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">🕒 Recent Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[var(--color-text-secondary)] uppercase bg-[var(--color-background-start)]">
                <tr>
                  <th className="px-4 py-2">Action</th>
                  <th className="px-4 py-2">Document</th>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {activityData.map((item, index) => (
                  <tr key={index} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background-start)]">
                    <td className="px-4 py-2 font-medium">{item.Action}</td>
                    <td className="px-4 py-2 text-gray-600">{item.Document}</td>
                    <td className="px-4 py-2 text-gray-500">{item.Time}</td>
                    <td className="px-4 py-2 text-center">
                       <StatusChip status={item.Status.toLowerCase() as any} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
           <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">🌐 Model Health</h3>
           <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-[var(--color-background-start)] rounded-lg">
               <span className="font-semibold">Gemini</span>
               <div className="flex items-center gap-2">
                 <span className="text-green-600 font-bold">Operational</span>
                 <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
               </div>
             </div>
             <div className="flex items-center justify-between p-3 bg-[var(--color-background-start)] rounded-lg">
               <span className="font-semibold">OpenAI</span>
                <div className="flex items-center gap-2">
                 <span className="text-green-600 font-bold">Operational</span>
                 <div className="h-3 w-3 rounded-full bg-green-500"></div>
               </div>
             </div>
             <div className="flex items-center justify-between p-3 bg-[var(--color-background-start)] rounded-lg">
               <span className="font-semibold">Grok</span>
               <div className="flex items-center gap-2">
                 <span className="text-orange-500 font-bold">Degraded</span>
                 <div className="h-3 w-3 rounded-full bg-orange-400"></div>
               </div>
             </div>
           </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
