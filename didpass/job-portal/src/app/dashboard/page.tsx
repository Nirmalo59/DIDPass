"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  useEffect(() => {
    // 1. Check if we just received a token from DIDPass SSO
    const urlToken = searchParams.get("token");
    const urlUser = searchParams.get("user");
    
    if (urlToken && urlUser) {
      // Save SSO credentials
      localStorage.setItem("techjobs_token", urlToken);
      localStorage.setItem("techjobs_user", decodeURIComponent(urlUser));
      // Clean up URL
      router.replace("/dashboard");
      return;
    }

    // 2. Load from local storage
    const storedToken = localStorage.getItem("techjobs_token");
    const storedUser = localStorage.getItem("techjobs_user");

    if (!storedToken || !storedUser) {
      // Not authenticated, send back to login
      router.push("/");
    } else {
      setUser(JSON.parse(storedUser));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyFile) return;

    setIsVerifying(true);
    setVerifyResult(null);

    const formData = new FormData();
    formData.append("document", verifyFile);

    try {
      const res = await fetch("http://127.0.0.1:5555/api/documents/verify", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setVerifyResult(data);
    } catch (err: any) {
      setVerifyResult({ authentic: false, message: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Authenticating via DIDPass...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center px-8 shadow-sm">
        <h1 className="text-xl font-bold flex items-center">
          <span className="text-blue-600 mr-2 text-2xl">💼</span> TechJobs
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Hello, {user.fullName}</span>
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
            {user.fullName.charAt(0)}
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem("techjobs_token");
              localStorage.removeItem("techjobs_user");
              router.push("/");
            }}
            className="text-sm text-gray-500 hover:text-red-600 font-semibold ml-2 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto">
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-8 flex items-center">
          <span className="mr-2">✅</span> Successfully authenticated using DIDPass Identity Provider.
        </div>

        {/* --- Verify Credentials UI --- */}
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <span className="text-blue-600">🛡️</span> Verify Applicant Credentials
          </h2>
          <p className="text-gray-500 mb-6">
            Upload any applicant's document (e.g. University Degree, Work Certificate) to mathematically verify its authenticity against the DIDPass blockchain registry.
          </p>

          <form onSubmit={handleVerify} className="space-y-4 max-w-xl">
            <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-6 text-center transition-colors bg-gray-50">
              <input 
                type="file" 
                id="verify-upload" 
                className="hidden" 
                onChange={(e) => setVerifyFile(e.target.files ? e.target.files[0] : null)} 
              />
              <label htmlFor="verify-upload" className="cursor-pointer block">
                {verifyFile ? (
                  <span className="text-blue-600 font-semibold">{verifyFile.name}</span>
                ) : (
                  <span className="text-gray-500 font-medium">Click to upload a document to verify</span>
                )}
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isVerifying || !verifyFile}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors shadow-md"
            >
              {isVerifying ? "Verifying on Blockchain..." : "Verify Authenticity"}
            </button>
          </form>

          {verifyResult && (
            <div className={`mt-6 p-5 rounded-xl border ${verifyResult.authentic ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{verifyResult.authentic ? '✅' : '❌'}</span>
                <div>
                  <h3 className={`font-bold ${verifyResult.authentic ? 'text-green-800' : 'text-red-800'}`}>
                    {verifyResult.message}
                  </h3>
                  {verifyResult.authentic && (
                    <div className="mt-3 space-y-1 text-sm text-gray-700 font-mono bg-white p-3 rounded border border-gray-200">
                      <p><span className="text-gray-400">Issuer:</span> {verifyResult.issuer}</p>
                      <p><span className="text-gray-400">Timestamp:</span> {verifyResult.timestamp}</p>
                      <p><span className="text-gray-400">Hash:</span> {verifyResult.documentHash}</p>
                    </div>
                  )}
                  {!verifyResult.authentic && verifyResult.documentHash && (
                    <div className="mt-3 space-y-1 text-sm text-gray-700 font-mono bg-white p-3 rounded border border-gray-200">
                      <p><span className="text-gray-400">Hash:</span> {verifyResult.documentHash}</p>
                      <p className="text-xs mt-2 text-red-500 font-sans">This document hash was not found in the blockchain registry. It may be forged or altered.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-6">Recommended Jobs for You</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">Senior Smart Contract Engineer</h3>
                <p className="text-gray-500 text-sm">Decentralized Finance Corp</p>
              </div>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-semibold">$150k - $200k</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Looking for an expert in Solidity and cryptography to build the next generation of DeFi protocols.
            </p>
            <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold w-full">
              Apply with DIDPass Credential
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">Lead Security Architect</h3>
                <p className="text-gray-500 text-sm">CyberVault Solutions</p>
              </div>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-semibold">$180k - $220k</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              We need a specialist in Public Key Infrastructure (PKI) and zero-knowledge proofs.
            </p>
            <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold w-full">
              Apply with DIDPass Credential
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
