"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LogEntry {
  _id: string;
  action: string;
  details: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'INFO';
  walletAddress?: string;
  transactionHash?: string;
  ipAddress?: string;
  createdAt: string;
}

export default function AuditLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll for new logs every 3 seconds
  useEffect(() => {
    // Strict RBAC: Only ADMINs can view the web logs
    const userData = localStorage.getItem("didpass_user");
    if (!userData) {
      router.push("/login");
      return;
    }
    
    const user = JSON.parse(userData);
    if (user.role !== 'ADMIN') {
      router.push("/dashboard"); // Kick out Holders AND Issuers
      return;
    }

    const fetchLogs = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5555/api/logs");
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'FAILED': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'PENDING': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'INFO': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(34,197,94,0.5)]">
              🛡️
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Real-Time <span className="text-green-500">Audit Logs</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <div className="bg-gray-950 border border-gray-800 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
          
          <div className="p-6 border-b border-gray-800 bg-black/50 flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Live System Monitor
            </h2>
            <p className="text-xs text-gray-500 font-mono">Auto-refreshing every 3s</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/80 text-gray-400 font-mono text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                  <th className="px-6 py-4 font-medium w-1/2">Details</th>
                  <th className="px-6 py-4 font-medium">Wallet / IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50 font-mono text-xs">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Loading logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-900/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded border text-[10px] font-bold ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-300 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-gray-400 break-words max-w-md">
                        {log.details}
                        {log.transactionHash && (
                          <div className="mt-1 text-purple-400 text-[10px]">
                            TX: {log.transactionHash}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 truncate max-w-[150px]" title={log.walletAddress}>
                        {log.walletAddress ? `${log.walletAddress.substring(0, 8)}...` : log.ipAddress || 'System'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
