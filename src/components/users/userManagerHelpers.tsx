import { Crown, Shield, User } from 'lucide-react';

export const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin':
      return <Crown className="h-4 w-4" />;
    case 'manager':
      return <Shield className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

export const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'badge-warning';
    case 'manager':
      return 'badge-emerald-light';
    default:
      return 'badge-secondary';
  }
};
