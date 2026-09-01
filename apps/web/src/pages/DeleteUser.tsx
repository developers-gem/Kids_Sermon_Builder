import React, { useState } from 'react';

const DeleteUser = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handleDeleteUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
        

    try {
      const response = await fetch(
        'https://kids-sermon-builder-api.onrender.com/api/auth/delete-user',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert('User deleted successfully');
        setEmail('');
      } else {
        alert(`Error: ${data.message || 'Something went wrong'}`);
      }
    } catch (error) {
      alert('Network error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#fbf8f3] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-amber-950/10 p-8 flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="text-center space-y-1">
          <span className="text-xs font-bold tracking-widest text-emerald-700 uppercase">
            Kids-Sermon-Builder Care
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Delete Account
          </h1>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50/80 border border-red-200/80 rounded-xl p-3.5 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-xs leading-relaxed text-red-800">
            This action is <strong>permanent and irreversible</strong>. All your saved sermons, preferences, and data will be permanently removed.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleDeleteUser} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-stone-700"
            >
              Account Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 bg-[#fdfcfa] border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-medium text-sm transition duration-150 shadow-sm shadow-red-600/15 flex items-center justify-center cursor-pointer"
          >
            {isLoading ? 'Deleting Account...' : 'Permanently Delete Account'}
          </button>
        </form>

      </div>
    </main>
  );
};

export default DeleteUser;