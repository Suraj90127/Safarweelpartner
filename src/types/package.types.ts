// Package Types

export interface Package {
  id: string;
  _id?: string;
  title: string;
  amount: string | number;
  packageType: string;
  duration: string | number;
  commission: string | number;
  saving: string;
  description: string;
  color?: string;
  gradient?: string[];
  borderColor?: string;
  badgeBg?: string;
  badgeText?: string;
  icon?: string;
}

export interface PackageState {
  packages: Package[];
  loading: boolean;
  buyLoading: boolean;
  error: string | null;
}
