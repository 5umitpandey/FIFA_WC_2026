import { useState } from 'react';
import AuthProvider, { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/Auth';
import { Navigation } from './components/Navigation';
import { Bracket } from './components/Bracket';
import { Leaderboard } from './components/Leaderboard';
import { MyPredictions } from './components/MyPredictions';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<'bracket' | 'leaderboard'>('bracket');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fifa-darker">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-fifa-gold/30 border-t-fifa-gold animate-spin"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-fifa-darker">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <MyPredictions />
        {currentPage === 'bracket' ? <Bracket /> : <Leaderboard />}
      </main>
      <footer className="text-center py-6 text-gray-500 text-sm">
        World Cup 2026 Knockout Predictions
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
