import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Trophy, User, Lock, Flag } from 'lucide-react';

interface CountryOption {
  code: string;
  name: string;
}

const COUNTRIES: CountryOption[] = [
  { code: 'ARG', name: 'Argentina' },
  { code: 'BRA', name: 'Brazil' },
  { code: 'FRA', name: 'France' },
  { code: 'ENG', name: 'England' },
  { code: 'GER', name: 'Germany' },
  { code: 'ESP', name: 'Spain' },
  { code: 'POR', name: 'Portugal' },
  { code: 'NED', name: 'Netherlands' },
  { code: 'BEL', name: 'Belgium' },
  { code: 'NOR', name: 'Norway' },
  { code: 'CRO', name: 'Croatia' },
  { code: 'URU', name: 'Uruguay' },
  { code: 'COL', name: 'Colombia' },
  { code: 'MEX', name: 'Mexico' },
  { code: 'USA', name: 'United States' },
  { code: 'CAN', name: 'Canada' },
  { code: 'JPN', name: 'Japan' },
  { code: 'KOR', name: 'South Korea' },
  { code: 'MAR', name: 'Morocco' },
  { code: 'SUI', name: 'Switzerland' },
  { code: 'SEN', name: 'Senegal' },
  { code: 'NGA', name: 'Nigeria' },
];

function getCountryCode(code: string): string {
  const map: Record<string, string> = {
    'ARG': 'ar', 'BRA': 'br', 'FRA': 'fr', 'ENG': 'gb-eng', 'GER': 'de',
    'ESP': 'es', 'POR': 'pt', 'NED': 'nl', 'BEL': 'be', 'CRO': 'hr',
    'URU': 'uy', 'COL': 'co', 'MEX': 'mx', 'USA': 'us', 'CAN': 'ca',
    'JPN': 'jp', 'KOR': 'kr', 'MAR': 'ma', 'NOR': 'no', 'SEN': 'sn',
    'NGA': 'ng', 'SUI': 'ch',
  };
  return map[code] || code.toLowerCase();
}

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [supportingCountry, setSupportingCountry] = useState('BRA');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }
      if (!fullName.trim()) {
        setError('Full name is required');
        setLoading(false);
        return;
      }
      if (!username.trim()) {
        setError('Username is required');
        setLoading(false);
        return;
      }

      const result = await signUp(fullName, username, password, supportingCountry);
      if (result.error) {
        setError(result.error);
      }
    } else {
      const result = await signIn(username, password);
      if (result.error) {
        setError(result.error);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-fifa-darker">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-fifa-gold to-yellow-600 mb-4">
            <Trophy className="w-8 h-8 text-fifa-darker" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">World Cup 2026</h1>
          <p className="text-gray-400">Knockout Stage Predictions</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-fifa-gold transition-colors"
                  placeholder="Enter your full name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-fifa-gold transition-colors"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-fifa-gold transition-colors"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {isSignUp && (
            <>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-fifa-gold transition-colors"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Supporting Country</label>
                <div className="relative">
                  <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <select
                    value={supportingCountry}
                    onChange={(e) => setSupportingCountry(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-11 pr-4 text-white focus:outline-none focus:border-fifa-gold transition-colors appearance-none cursor-pointer"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code} className="bg-fifa-dark">
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <img
                    src={`https://flagcdn.com/w40/${getCountryCode(supportingCountry)}.png`}
                    alt={supportingCountry}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-4 object-cover rounded"
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-fifa-gold to-yellow-600 text-fifa-darker font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-gray-400 hover:text-fifa-gold transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
