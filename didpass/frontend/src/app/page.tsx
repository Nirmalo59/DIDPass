"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { renderCanvas, ShineBorder, TypeWriter } from "@/components/ui/hero-designali";
import { Plus } from "lucide-react"; 
import { Button } from "@/components/ui/button"; 

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>("Connecting to Backend...");

  const talkAbout = [
    "Cryptography",
    "Digital Signatures",
    "Web3 Apps",
    "DID Issuance",
    "Secure Key Management",
    "Hybrid Encryption",
    "Data Privacy",
  ];

  useEffect(() => {
    fetch("http://127.0.0.1:5555/api/health")
      .then(res => res.json())
      .then(data => setBackendStatus(data.message || "Backend Connected!"))
      .catch(err => setBackendStatus("Backend Disconnected / Error"));
  }, []);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 max-md:hidden top-0 -z-10 h-full w-full bg-transparent bg-[linear-gradient(to_right,#57534e_1px,transparent_1px),linear-gradient(to_bottom,#57534e_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-10"></div>
      
      <div className="text-center max-w-3xl z-10">
        <h1 className="text-6xl font-extrabold tracking-tighter text-white mb-6">
          Welcome to <span className="text-blue-600">DIDPass</span>
        </h1>
        
        <div className="text-2xl text-gray-400 mb-8 font-medium">
          The future of <TypeWriter strings={talkAbout} />
        </div>
        
        <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
          A truly decentralized identity portal that issues cryptographic credentials directly to your wallet.
          Experience a passwordless future where you own your data.
        </p>

        <ShineBorder className="p-1 mb-8" color="#2563eb">
          <div className="bg-gray-950 p-6 rounded-xl flex items-center justify-between border border-gray-800">
            <div className="text-left">
              <h3 className="text-white font-bold mb-1">System Status</h3>
              <p className="text-sm text-gray-500">{backendStatus}</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${backendStatus.includes('Error') ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'}`}></div>
          </div>
        </ShineBorder>

        <div className="flex gap-4 justify-center">
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-xl font-bold text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Access Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
