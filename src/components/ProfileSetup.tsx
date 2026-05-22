import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Chronotype = 'lion' | 'bear' | 'wolf' | 'dolphin';

export const ProfileSetup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { user } = useAuth();
  const [age, setAge] = useState(30);
  const [lifeExpectancy, setLifeExpectancy] = useState(80);
  const [chronotype, setChronotype] = useState<Chronotype>('bear');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);

    // Use type assertion to bypass temporary TypeScript inference issue
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        auth_user_id: user.id,
        age,
        life_expectancy: lifeExpectancy,
        chronotype,
        baseline_dws: 0,
        baseline_daily_minutes: 0,
      } as any);

    if (insertError) {
      setError(insertError.message);
    } else {
      onComplete(); // profile created, move to main app
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-100">Welcome to FocusFlow</h1>
          <p className="text-slate-400 mt-2">Let's set up your profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Age</label>
            <input
              type="number"
              min="18"
              max="100"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value) || 18)}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Used for lifetime productivity projections</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Life Expectancy</label>
            <input
              type="number"
              min="60"
              max="120"
              value={lifeExpectancy}
              onChange={(e) => setLifeExpectancy(parseInt(e.target.value) || 80)}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Default is 80 years</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Chronotype</label>
            <div className="grid grid-cols-2 gap-3">
              {(['lion', 'bear', 'wolf', 'dolphin'] as Chronotype[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChronotype(type)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    chronotype === type
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-medium capitalize">{type}</div>
                  <div className="text-xs opacity-70">
                    {type === 'lion' && 'Early riser, peak morning'}
                    {type === 'bear' && 'Follows sun, peak late morning'}
                    {type === 'wolf' && 'Evening person, peak afternoon/evening'}
                    {type === 'dolphin' && 'Irregular, light sleeper'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Start Using FocusFlow'}
          </button>
        </form>
      </div>
    </div>
  );
};