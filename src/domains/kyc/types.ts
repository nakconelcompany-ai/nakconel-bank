export type KycStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface KycSubmission {
  id: string;
  userId: string;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  bvn: string;
  idType: string;
  status: KycStatus;
  createdAt: string;
}
