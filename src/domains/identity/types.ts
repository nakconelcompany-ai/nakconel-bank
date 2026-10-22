export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  pinHash: string;
  kycStatus: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
}
