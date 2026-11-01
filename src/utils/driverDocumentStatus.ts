export type DriverDocumentStatus = 'verified' | 'pending' | 'rejected';

export const getDriverDocumentStatus = (
  statuses: Array<string | null | undefined>,
): DriverDocumentStatus => {
  const normalizedStatuses = statuses.map(status => status?.toLowerCase() || 'pending');

  if (normalizedStatuses.length === 0) {
    return 'pending';
  }

  if (normalizedStatuses.includes('rejected')) {
    return 'rejected';
  }

  if (normalizedStatuses.every(status => status === 'approved' || status === 'verified')) {
    return 'verified';
  }

  return 'pending';
};

export const getDriverDocumentStatusLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'verified':
      return 'Verified';
    case 'pending':
    case 'submitted':
      return 'Under review';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Not Uploaded';
  }
};
