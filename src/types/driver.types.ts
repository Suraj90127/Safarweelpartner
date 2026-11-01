// Driver types

export interface EarningEntry {
  id: string;
  rideId: string;
  amount: number;
  currency: string;
  date: string;
  paymentMethod: string;
  bonus?: number;
}

export interface EarningsSummary {
  today: number;
  weekly: number;
  monthly: number;
  totalTrips: number;
  avgRating: number;
  currency: string;
}

export interface DashboardStats {
  todayEarnings: number;
  weeklyEarnings: number;
  totalTrips: number;
  onlineHours: number;
  acceptanceRate: number;
  cancellationRate: number;
  rating: number;
  currency: string;
  todayCompleted?: number;
  todayCancelled?: number;
  todayDistanceKm?: number;
}

export interface RatingDistributionItem {
  stars: number;
  count: number;
  percentage: number;
}

export interface RatingDetails {
  averageRating: number;
  totalCount: number;
  distribution: RatingDistributionItem[];
}

export interface DriverIncentive {
  _id: string;
  title: string;
  type: 'daily' | 'weekly' | string;
  targetTrips: number;
  completedTrips: number;
  rewardAmount: number;
  currency?: string;
  description?: string;
  isActive?: boolean;
}

export interface DistanceFareTier {
  fromKm: number;
  toKm: number;
  farePerKm: number;
}

export interface RateCard {
  _id: string;
  serviceId: string;
  typeName: string;
  distanceFare: DistanceFareTier[];
  timeFare: number;
  baseFare: number;
  platformFee: number;
  waitTimeCharge: {
    perMinute: number;
    afterMinutes: number;
    maxCharge: number;
  };
  longPickupFare: {
    perKm: number;
    afterKm: number;
    maxCharge: number;
  };
  cancellationFare: {
    minFare: number;
    maxFare: number;
  };
  surgeFareEnabled: boolean;
  nightFare: {
    percentage: number;
    startTime: string;
    endTime: string;
  };
  commission: number;
  gstPercentage: number;
  handlingFee: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReferralEarnTier {
  _id?: string;
  title: string;
  subtitle: string;
  amount: number;
  duration: number;
  rideCount: number;
  type: string;
}

export interface DriverReferralEarn {
  _id: string;
  amount: number;
  name: string;
  description: string;
  serviceId: string;
  tiers: ReferralEarnTier[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DriverState {
  profile: import('./auth.types').Driver | null;
  isOnline: boolean;
  dashboardStats: DashboardStats | null;
  earnings: EarningsSummary | null;
  isLoading: boolean;
  error: string | null;
  vehicle: any | null;
  referrals: any[];
  referralsLoading: boolean;
  referralsError: string | null;
  driverDocument: any | null;
  documentsLoading: boolean;
  documentsError: string | null;
  ratingDetails: RatingDetails | null;
  ratingLoading: boolean;
  ratingError: string | null;
  incentives: DriverIncentive[] | null;
  incentivesLoading: boolean;
  incentivesError: string | null;
  rateCards: RateCard[] | null;
  rateCardsLoading: boolean;
  rateCardsError: string | null;
  referralEarn: DriverReferralEarn[] | null;
  referralEarnLoading: boolean;
  referralEarnError: string | null;
}

export interface ReferralSummaryResponse {
  referralCount: number;
  referral_code: string | null;
  referralEarnings: number;
}

