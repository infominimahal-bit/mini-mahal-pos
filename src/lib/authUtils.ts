export async function hashPasswordString(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('crypto.subtle.digest failed, using fallback hash');
    }
  }

  // Fallback for HTTP (non-secure context, e.g., local IP on tablet)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'fb_' + Math.abs(hash).toString(16);
}

// Helper function to convert auth error messages to user-friendly text
export function getAuthErrorMessage(errorMessage: string): string {
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.'
  }
  if (errorMessage.includes('Email not confirmed')) {
    return 'Please check your email and click the confirmation link to activate your account.'
  }
  if (errorMessage.includes('User already registered')) {
    return 'An account with this email already exists. Please sign in instead.'
  }
  if (errorMessage.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.'
  }
  if (errorMessage.includes('Invalid email')) {
    return 'Please enter a valid email address.'
  }
  if (errorMessage.includes('Too many requests')) {
    return 'Too many attempts. Please wait a few minutes before trying again.'
  }
  if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch') || errorMessage.includes('Load failed')) {
    return 'Network connection issue. Please check your internet connection.'
  }
  // Default fallback message
  return 'An unexpected error occurred. Please try again.'
}
