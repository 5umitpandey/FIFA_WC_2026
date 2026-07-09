import { Layout, Trophy, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const FLAG_CODE_MAP: Record<string, string> = {
  'ARG': 'ar', 'BRA': 'br', 'FRA': 'fr', 'ENG': 'gb-eng', 'GER': 'de',
  'ESP': 'es', 'POR': 'pt', 'NED': 'nl', 'BEL': 'be', 'CRO': 'hr',
  'URU': 'uy', 'COL': 'co', 'MEX': 'mx', 'USA': 'us', 'CAN': 'ca',
  'JPN': 'jp', 'KOR': 'kr', 'MAR': 'ma', 'NOR': 'no', 'SEN': 'sn',
  'NGA': 'ng', 'SUI': 'ch',
};

function getFlagCode(code: string): string {
  return FLAG_CODE_MAP[code] || code.toLowerCase();
}

interface NavigationProps {
  currentPage: 'bracket' | 'leaderboard';
  onPageChange: (page: 'bracket' | 'leaderboard') => void;
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-fifa-darker/80 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-fifa-gold to-yellow-600 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-fifa-darker" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">World Cup 2026</h1>
              <p className="text-xs text-gray-400">Knockout Predictions</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onPageChange('bracket')}
              className={`nav-link px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentPage === 'bracket'
                  ? 'text-fifa-gold active'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Layout className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Bracket</span>
            </button>
            <button
              onClick={() => onPageChange('leaderboard')}
              className={`nav-link px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentPage === 'leaderboard'
                  ? 'text-fifa-gold active'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-gray-300">
              <span className="text-sm font-medium">{user?.full_name}</span>
              {user?.supporting_country && (
                <img
                  src={`https://flagcdn.com/w40/${getFlagCode(user.supporting_country)}.png`}
                  alt={user.supporting_country}
                  className="w-6 h-4 object-cover rounded"
                  loading="lazy"
                />
              )}
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
