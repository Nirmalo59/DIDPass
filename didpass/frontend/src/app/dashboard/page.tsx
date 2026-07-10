"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Document Issuance State
  const [file, setFile] = useState<File | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("didpass_token");
    const userData = localStorage.getItem("didpass_user");
    if (!token || !userData) {
      router.push("/login");
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("didpass_token");
    localStorage.removeItem("didpass_user");
    router.push("/");
  };

  const handleIssueDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsIssuing(true);
    setIssueResult(null);

    const formData = new FormData();
    formData.append("document", file);

    try {
      const res = await fetch("http://127.0.0.1:5555/api/documents/issue", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setIssueResult({ success: true, ...data });
    } catch (err: any) {
      setIssueResult({ success: false, message: err.message });
    } finally {
      setIsIssuing(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  return (
    <main className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              DP
            </div>
            <h1 className="text-2xl font-bold tracking-tight">DID<span className="text-blue-500">Pass</span> Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Show logs link only if Admin or Issuer if desired, but for this demo, anyone can view logs */}
            <Link 
              href="/logs"
              className="px-4 py-2 bg-green-600/10 text-green-500 hover:bg-green-600/20 rounded-lg text-sm font-medium transition-colors border border-green-500/20 flex items-center gap-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live Audit Logs
            </Link>
            
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
            >
              Log Out
            </button>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
            
            <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
              Your Identity Profile
            </h2>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Full Name</p>
                <p className="text-2xl font-semibold text-white">{user.fullName}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Verified Email</p>
                <p className="text-xl text-gray-300">{user.email}</p>
              </div>
              
              <div className="pt-6 border-t border-gray-800">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">Wallet Address</p>
                <div className="bg-black/80 border border-gray-800 p-4 rounded-xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex-shrink-0 shadow-lg"></div>
                  <p className="text-gray-300 font-mono text-sm break-all">{user.walletAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Role-Based Access Control: Only show Issuance UI to ISSUERS */}
          {user.role === 'ISSUER' || user.role === 'ADMIN' ? (
            <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
              
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
                Issue Document (On-Chain)
              </h2>
              
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                As an authorized issuer, you can upload a document here. Our system will generate a mathematically unbreakable SHA-256 hash and anchor it permanently to the blockchain.
              </p>

              <form onSubmit={handleIssueDocument} className="space-y-6">
                <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-gray-500 transition-colors bg-black/50">
                  <input 
                    type="file" 
                    id="doc-upload" 
                    className="hidden" 
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer block">
                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center">📄</div>
                        <span className="text-blue-400 font-medium truncate max-w-[200px]">{file.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-gray-800 text-gray-400 rounded-full flex items-center justify-center">⬆️</div>
                        <span className="text-gray-400">Click to select a document</span>
                      </div>
                    )}
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={isIssuing || !file}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold text-lg transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                >
                  {isIssuing ? "Anchoring Hash to Blockchain..." : "Anchor to Blockchain"}
                </button>
              </form>

              {issueResult && (
                <div className={`mt-6 p-5 rounded-xl text-sm break-words relative overflow-hidden ${issueResult.success ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'}`}>
                  {issueResult.success && <div className="absolute top-0 right-0 w-full h-1 bg-green-500"></div>}
                  {!issueResult.success && <div className="absolute top-0 right-0 w-full h-1 bg-red-500"></div>}
                  
                  <p className={`font-bold mb-3 ${issueResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {issueResult.message}
                  </p>
                  
                  {issueResult.success && (
                    <div className="mt-4 p-3 bg-black/60 rounded-lg text-xs font-mono space-y-2 text-gray-300">
                      <div>
                        <span className="text-gray-500 block mb-1">Document Hash (SHA-256)</span>
                        <span className="text-green-300">{issueResult.documentHash}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Transaction ID</span>
                        <span className="text-purple-300">{issueResult.transactionHash}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-950/50 border border-gray-800/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-bold text-gray-300 mb-2">Restricted Access</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Your identity is registered as a <strong className="text-gray-300">HOLDER</strong>. You do not have permission to issue documents to the blockchain. Only Authorized <strong className="text-purple-400">ISSUERS</strong> can access this console.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
