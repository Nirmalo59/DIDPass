"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ethers } from "ethers";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ fullName: "", email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Listen for the user switching accounts directly in MetaMask
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          // If they switch accounts in MetaMask, reset any error and prompt them to click the button again
          setError(`MetaMask account switched to ${accounts[0].substring(0,6)}... Click the button below to sign in with this new account.`);
        } else {
          setError("MetaMask disconnected.");
        }
      });
    }
  }, []);

  const handleWalletConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install it to use DIDPass.");
      }

      // 2. Connect to the active MetaMask wallet
      // Note: MetaMask requires the user to manually switch their active account in the extension UI
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      
      const provider = new ethers.BrowserProvider(window.ethereum);

      // 3. Request Nonce from Backend
      const nonceRes = await fetch(`http://127.0.0.1:5555/api/auth/nonce?address=${address}`);
      const nonceData = await nonceRes.json();

      if (!nonceRes.ok) {
        throw new Error(nonceData.message || "Failed to get authentication nonce");
      }

      // 4. Sign the Nonce using the currently active account
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(nonceData.nonce);

      // 5. Verify Signature with Backend
      const verifyRes = await fetch(`http://127.0.0.1:5555/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          signature,
          originalMessage: nonceData.nonce,
          // Only send registration fields if creating an account
          fullName: !isLogin ? formData.fullName : undefined,
          email: !isLogin ? formData.email : undefined,
        })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.message || "Authentication failed");
      }

      // 6. Success! Save Token
      localStorage.setItem("didpass_token", verifyData.token);
      localStorage.setItem("didpass_user", JSON.stringify(verifyData.user));
      
      // If we are in an SSO OAuth flow (came from /authorize), let's redirect them back there.
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUri = searchParams.get("redirect_uri");
      const clientId = searchParams.get("client_id");
      
      if (redirectUri && clientId) {
        router.push(`/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`);
      } else {
        router.push("/dashboard");
      }

    } catch (err: any) {
      setError(err.message || "An error occurred during wallet connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 max-md:hidden top-0 -z-10 h-full w-full bg-transparent bg-[linear-gradient(to_right,#57534e_1px,transparent_1px),linear-gradient(to_bottom,#57534e_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-10"></div>
      
      <div className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-red-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isLogin ? "Welcome Back" : "Create Identity"}
          </h1>
          <p className="text-gray-400 text-sm">
            {isLogin 
              ? "Connect your cryptographic wallet to access your secure vault." 
              : "Register your Wallet Address to start managing your identity."}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-3 rounded-lg mb-4 relative z-10 break-words">
            {error}
          </div>
        )}

        <form className="space-y-4 relative z-10" onSubmit={handleWalletConnect}>
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="John Doe"
                  required={!isLogin}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="you@example.com"
                  required={!isLogin}
                />
              </div>
            </>
          )}

          <div className="pt-2">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Waiting for Signature..." : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M34.908 12.357L19.263 1.836a2.158 2.158 0 00-2.427 0L1.19 12.357a2.162 2.162 0 00-.916 1.776v16.142A2.163 2.163 0 002.437 32.44h31.224a2.163 2.163 0 002.163-2.165V14.133a2.16 2.16 0 00-.916-1.776zM18.049 3.633L31.815 12.89l-13.766 9.255-13.766-9.255L18.049 3.633zm15.547 26.642a.317.317 0 01-.317.317H2.82c-.175 0-.317-.142-.317-.317V15.753l14.52 9.762a1.85 1.85 0 002.052 0l14.52-9.762v14.522z" fill="currentColor"/>
                  </svg>
                  {isLogin ? "Connect Wallet to Sign In" : "Connect Wallet to Register"}
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center relative z-10">
          <p className="text-sm text-gray-400">
            {isLogin ? "Don't have an identity?" : "Already have an identity?"}{" "}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {isLogin ? "Create one here" : "Sign in here"}
            </button>
          </p>
        </div>

        <div className="mt-8 text-center relative z-10">
          <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
