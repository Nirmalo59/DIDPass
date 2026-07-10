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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isIssuer = user.role === 'ISSUER' || user.role === 'ADMIN';

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-300 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
            DP
          </div>
          <h1 className="text-xl font-bold tracking-tight">DIDPass</h1>
        </div>
        <button onClick={handleLogout} className="text-sm font-semibold text-red-500 hover:text-red-700">
          Log Out
        </button>
      </header>

      {/* Main Desktop Container */}
      <div className="max-w-5xl mx-auto my-10 bg-white border border-gray-300 rounded-lg flex overflow-hidden min-h-[700px] shadow-sm">
        
        {/* Left Sidebar (Desktop Navigation) */}
        <div className="w-64 border-r border-gray-300 hidden md:block bg-white flex-shrink-0">
          <ul className="flex flex-col mt-4">
            <li>
              <div className="px-6 py-4 border-l-4 border-black font-semibold text-black bg-gray-50 cursor-pointer text-sm">
                Edit profile
              </div>
            </li>
            <li>
              <div className="px-6 py-4 border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 cursor-pointer text-sm transition-colors">
                Personal details
              </div>
            </li>
            {isIssuer && (
              <li>
                <div className="px-6 py-4 border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 cursor-pointer text-sm transition-colors flex justify-between items-center">
                  Professional tools
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 bg-white">
          <div className="max-w-2xl mx-auto py-10 px-6 md:px-12">
            
            {/* Profile Header */}
            <div className="flex items-center gap-6 mb-10">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px] flex-shrink-0">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center border border-gray-200">
                  <span className="text-xl font-bold text-gray-800">{user.fullName.charAt(0)}</span>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">{user.email.split('@')[0]}</h2>
                <button className="text-blue-500 font-semibold text-sm hover:text-blue-700">
                  Change profile photo
                </button>
              </div>
            </div>

            {/* Form Fields - Web Style (Label left, Input right) */}
            <div className="space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                <label className="md:w-1/4 text-gray-900 font-semibold text-sm md:text-right">Name</label>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={user.fullName} 
                    disabled 
                    className="w-full border border-gray-300 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Help people discover your account by using the name you're known by: either your full name, nickname, or business name.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                <label className="md:w-1/4 text-gray-900 font-semibold text-sm md:text-right">Email</label>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={user.email} 
                    disabled 
                    className="w-full border border-gray-300 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-8">
                <label className="md:w-1/4 text-gray-900 font-semibold text-sm md:text-right mt-2">Wallet Address</label>
                <div className="flex-1">
                  <textarea 
                    value={user.walletAddress} 
                    disabled 
                    rows={2}
                    className="w-full border border-gray-300 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-500 resize-none font-mono focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Your decentralized cryptographic identity used for signing.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                <label className="md:w-1/4 text-gray-900 font-semibold text-sm md:text-right">Account Role</label>
                <div className="flex-1">
                  <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold ${user.role === 'ISSUER' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-2 md:gap-8 pt-6">
                <div className="md:w-1/4"></div>
                <div className="flex-1">
                  <button disabled className="bg-blue-500 text-white font-semibold text-sm px-6 py-2 rounded-lg opacity-50 cursor-not-allowed">
                    Submit
                  </button>
                </div>
              </div>

            </div>

            {/* Issuance Section for Issuers */}
            {isIssuer && (
              <div className="mt-16 pt-10 border-t border-gray-200">
                <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-8">
                  <div className="md:w-1/4 text-gray-900 font-semibold text-sm md:text-right pt-2">
                    Professional Tools
                  </div>
                  <div className="flex-1">
                    <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                      <h3 className="text-sm font-bold text-gray-900 mb-1">Issue Blockchain Document</h3>
                      <p className="text-xs text-gray-500 mb-6">Upload a credential to permanently anchor its SHA-256 hash to the Ethereum network.</p>
                      
                      <form onSubmit={handleIssueDocument}>
                        <input 
                          type="file" 
                          id="doc-upload" 
                          className="hidden" 
                          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
                        />
                        <label 
                          htmlFor="doc-upload" 
                          className="block w-full border border-gray-300 rounded-md p-2 text-center text-sm font-semibold text-gray-700 cursor-pointer mb-4 bg-white hover:bg-gray-100 transition-colors"
                        >
                          {file ? file.name : "Choose File"}
                        </label>
                        
                        <button 
                          type="submit" 
                          disabled={isIssuing || !file}
                          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-colors"
                        >
                          {isIssuing ? "Anchoring..." : "Upload & Anchor"}
                        </button>
                      </form>

                      {issueResult && (
                        <div className={`mt-4 p-4 rounded-md text-xs border ${issueResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                          <p className="font-bold mb-2">{issueResult.message}</p>
                          {issueResult.success && (
                            <div className="space-y-3 font-mono text-[11px] break-all">
                              <div className="opacity-80">
                                <p>Hash: {issueResult.documentHash}</p>
                                <p>Tx: {issueResult.transactionHash}</p>
                              </div>
                              
                              {issueResult.magicLink && (
                                <div className="mt-3 p-3 bg-white border border-green-300 rounded-md shadow-sm">
                                  <p className="font-bold text-green-700 mb-1 flex items-center gap-1">
                                    <span>🪄</span> 10-Minute Magic Download Link
                                  </p>
                                  <p className="text-gray-500 mb-2">Copy this link and send it to the Holder. It expires in exactly 10 minutes.</p>
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="text" 
                                      value={issueResult.magicLink} 
                                      readOnly 
                                      className="flex-1 border border-gray-200 bg-gray-50 p-2 rounded text-gray-800 focus:outline-none"
                                    />
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        navigator.clipboard.writeText(issueResult.magicLink);
                                        alert("Magic Link copied to clipboard!");
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-bold transition-colors"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </main>
  );
}
