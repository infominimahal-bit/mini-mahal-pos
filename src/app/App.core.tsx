import { AuthProvider } from '../context/AuthContext';
import { AppProvider } from '../context/SupabaseAppContext';
import { TouchKeyboardProvider } from '../providers/TouchKeyboardProvider';
import { AppContent } from './AppContent';
import { ConflictBanner } from '../components/shared/ConflictBanner';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <TouchKeyboardProvider>
          <AppContent />
          <ConflictBanner />
        </TouchKeyboardProvider>
      </AppProvider>
    </AuthProvider>
  );
}
