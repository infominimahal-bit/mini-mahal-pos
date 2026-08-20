import { AuthProvider } from '../context/AuthContext';
import { AppProvider } from '../context/SupabaseAppContext';
import { TouchKeyboardProvider } from '../providers/TouchKeyboardProvider';
import { AppContent } from './AppContent';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <TouchKeyboardProvider>
          <AppContent />
        </TouchKeyboardProvider>
      </AppProvider>
    </AuthProvider>
  );
}
