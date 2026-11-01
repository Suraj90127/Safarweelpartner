import { useEffect, useState } from 'react';
import {
  check,
  request,
  Permission,
  PermissionStatus,
  RESULTS,
} from 'react-native-permissions';

export const usePermission = (permission: Permission) => {
  const [status, setStatus] = useState<PermissionStatus>(RESULTS.UNAVAILABLE);

  useEffect(() => {
    check(permission).then(setStatus);
  }, [permission]);

  const requestPermission = async () => {
    const result = await request(permission);
    setStatus(result);
    return result;
  };

  return {
    status,
    isGranted: status === RESULTS.GRANTED,
    requestPermission,
  };
};
