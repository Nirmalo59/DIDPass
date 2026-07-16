"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  _id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  role: string;
  status: string;
  organizationName?: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = async (token: string) => {
    try {
      const res = await fetch("http://127.0.0.1:5555/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("didpass_token");
    const userData = localStorage.getItem("didpass_user");
    
    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'ADMIN') {
      router.push("/dashboard"); // Redirect non-admins back to dashboard
      return;
    }

    fetchUsers(token);
  }, [router]);

  const handleSuspend = async (userId: string) => {
    const token = localStorage.getItem("didpass_token");
    try {
      const res = await fetch(`http://127.0.0.1:5555/api/admin/users/${userId}/suspend`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers(token!); // Refresh the list
      }
    } catch (err) {
      console.error("Failed to suspend user", err);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    
    const token = localStorage.getItem("didpass_token");
    try {
      const res = await fetch(`http://127.0.0.1:5555/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers(token!); // Refresh the list
      }
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-300 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center font-bold text-white text-sm">
            🛡️
          </div>
          <h1 className="text-xl font-bold tracking-tight">Admin Console</h1>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold text-gray-600 hover:text-black transition-colors">
          Back to Dashboard
        </Link>
      </header>

      <div className="max-w-7xl mx-auto my-10 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="text-gray-500 text-sm mt-1">View, suspend, or delete registered identities.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 font-semibold">
                  <th className="px-6 py-4">Name / Org</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Wallet Address</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{user.fullName}</div>
                      {user.organizationName && (
                        <div className="text-xs text-blue-600 font-medium mt-0.5">{user.organizationName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit">
                        {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(38)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        user.role === 'ADMIN' ? 'bg-black text-white' : 
                        user.role === 'ISSUER' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                        user.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {user.role !== 'ADMIN' && (
                        <>
                          <button 
                            onClick={() => handleSuspend(user._id)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-md border ${
                              user.status === 'ACTIVE' 
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' 
                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            } transition-colors`}
                          >
                            {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button 
                            onClick={() => handleDelete(user._id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-md border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
