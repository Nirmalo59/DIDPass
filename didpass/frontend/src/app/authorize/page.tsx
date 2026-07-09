"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ethers } from "ethers";

function AuthorizeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [client_id, setClientId] = useState<string | null>(null);
  const [redirect_uri, setRedirectUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setClientId(searchParams.get("client_id") || "Unknown Application");
    setRedirectUri(searchParams.get("redirect_uri"));
    
    // Listen for the user switching accounts directly in MetaMask
    if ((window as any).ethereum) {
      (window as any).ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setError(`MetaMask account switched to ${accounts[0].substring(0,6)}... Click "Sign to Allow" to use this new account.`);
        }
      });
    }
  }, [searchParams]);

  const handleAuthorize = async () => {
    if (!redirect_uri) return;
    setError("");
    setLoading(true);

    try {
      // 1. Ensure MetaMask is present
      if (!(window as any).ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      // 2. Connect to the active MetaMask wallet
      // Note: MetaMask requires the user to manually switch their active account in the extension UI
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      const provider = new ethers.BrowserProvider((window as any).ethereum);

      // 3. Request Nonce (Challenge)
      const nonceRes = await fetch(`http://127.0.0.1:5555/api/auth/nonce?address=${address}`);
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceData.message);

      // 4. Sign Nonce using the currently active account
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(nonceData.nonce);

      // 5. Verify Signature with Backend
      // Notice we do NOT pass fullName or email, so if the wallet isn't registered, it will FAIL!
      const verifyRes = await fetch(`http://127.0.0.1:5555/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          signature,
          originalMessage: nonceData.nonce
        })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        // If it throws "fullName and email required", it means it's an unregistered wallet.
        if (verifyData.message?.includes("fullName and email required")) {
          throw new Error("This Wallet Address is not registered on DIDPass! Please go to DIDPass and Create an Identity first.");
        }
        throw new Error(verifyData.message || "Authentication failed");
      }

      // 6. Success! Send token back to Job Portal
      window.location.href = `${redirect_uri}?token=${verifyData.token}&user=${encodeURIComponent(JSON.stringify(verifyData.user))}`;

    } catch (err: any) {
      setError(err.message || "Authorization failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 max-md:hidden top-0 -z-10 h-full w-full bg-transparent bg-[linear-gradient(to_right,#57534e_1px,transparent_1px),linear-gradient(to_bottom,#57534e_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-10"></div>
      
      <div className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-center">
        {/* Glow effect */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

        <div className="mb-6 relative z-10 flex justify-center items-center space-x-4">
           <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center font-bold text-black text-xl">
             JP
           </div>
           <div className="text-gray-500">↔</div>
           <div className="w-12 h-12 bg-black border border-gray-700 rounded-lg flex items-center justify-center font-bold text-white text-xl">
             DID
           </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white mb-2">
            Authorization Request
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            <strong className="text-white">{client_id}</strong> wants to access your DIDPass Identity.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-3 rounded-lg mb-6 text-left break-words relative z-10">
            {error}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-left mb-6 relative z-10">
          <p className="text-sm text-gray-300 font-medium mb-2">This application will be able to:</p>
          <ul className="text-sm text-gray-500 space-y-2">
            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Verify your true identity.</li>
            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Read your verified credentials.</li>
            <li className="flex items-center"><span className="text-red-500 mr-2">✕</span> Cannot view your private keys.</li>
          </ul>
        </div>

        <div className="flex gap-4 relative z-10">
          <button 
            onClick={() => window.history.back()}
            className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors border border-gray-700"
          >
            Cancel
          </button>
          <button 
            onClick={handleAuthorize}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-200 text-black rounded-lg font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {loading ? "Signing..." : "Sign to Allow"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <AuthorizeContent />
    </Suspense>
  );
}
