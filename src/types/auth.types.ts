// Auth types

export interface Driver {
  id: string;
  _id?: string;
  name: string;
  last_name?: string;
  phone: string;
  email?: string;
  profilePhoto?: string;
  gender?: string;
  dob?: string;
  profile_image_id?: string;
  city?: string;
  rating: number;
  totalTrips: number;
  vehicleType: VehicleType;
  vehicle: Vehicle;
  isVerified: boolean;
  isOnline: boolean;
  status: DriverStatus;
  wallet?: number;
  referral_code?: string;
  totalReferrals?: number;
  referralEarnings?: number;
  createdAt: string;
  updatedAt: string;
  documents?: {
    dlUploaded: boolean;
    profileSetupComplete: boolean;
    vehicleUploaded: boolean;
    rcUploaded?: boolean;
    aadhaarPanUploaded?: boolean;
    isVerified: boolean;
  };
  driverDocument?: any;
  driver_id?: any;
}

export type VehicleType = 'bike' | 'auto' | 'cab' | 'suv';

export type DriverStatus =
  | 'available'
  | 'on_ride'
  | 'offline'
  | 'suspended'
  | 'pending_verification';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  type: VehicleType;
}

export interface AuthState {
  driver: Driver | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SendOtpRequest {
  phone: string;
  countryCode: string;
  channel?: 'sms' | 'whatsapp';
}

export interface SendOtpResponse {
  success: boolean;
  message: string;

  expiresInSeconds: number;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
 
}

export interface VerifyOtpResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  driver: Driver;
  isSignup?: boolean;
  is_verified?: boolean;
}
