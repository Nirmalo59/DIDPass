"use client";

import { useState } from "react";

export default function JobPortalHome() {
  const [loading, setLoading] = useState(false);

  const handleDIDPassLogin = () => {
    setLoading(true);
    // Redirect to DIDPass Identity Provider for SSO
    window.location.href = "http://localhost:3000/authorize?client_id=jobportal&redirect_uri=http://localhost:3001/dashboard";
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-xl text-center">
        
        <div className="mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-blue-600">💼</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TechJobs Portal</h1>
          <p className="text-gray-500 text-sm">
            Find your dream job in tech. Log in to apply, track applications, and receive offers securely.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
            <p className="font-semibold mb-1 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
              Passwordless System
            </p>
            TechJobs uses DIDPass for secure, decentralized authentication. We don't store your passwords.
          </div>

          <button 
            onClick={handleDIDPassLogin}
            disabled={loading}
            className="w-full bg-black text-white hover:bg-gray-800 font-semibold py-3 px-4 rounded-xl flex items-center justify-center transition-colors disabled:opacity-70"
          >
            {loading ? (
              "Redirecting to DIDPass..."
            ) : (
              <>
                <span className="mr-2 border border-gray-600 bg-gray-900 px-2 py-0.5 rounded text-xs">DID</span>
                Login with DIDPass
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          By logging in, you agree to the Terms of Service. Your data is protected by hybrid encryption via DIDPass.
        </p>
      </div>
    </main>
  );
}
