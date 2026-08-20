import { apiFetch } from '@/lib/apiFetch';
import { clearTokens, getRefreshToken, setTokens } from '@/lib/storage';
import { loginRider, registerRider } from '@/services/riders';
import { registerForPushNotifications, unregisterForPushNotifications } from '@/lib/pushNotifications';
import { useRiderStore } from '@/stores/riderStore';
import type { ApiEnvelope, RiderProfile, RiderUser } from '@/types/rider';

type AuthPayload = {
  user?: RiderUser;
  rider?: RiderProfile;
  accessToken?: string;
  refreshToken?: string;
};

export async function saveAuthFromResponse(body: ApiEnvelope<AuthPayload>) {
  const data = body?.data;
  if (!data?.accessToken || !data?.refreshToken) {
    throw new Error('Login response did not include tokens');
  }
  await setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  if (data.rider) {
    useRiderStore.getState().setRider(data.rider);
  }
}

export async function loginWithEmailPassword(input: { email: string; password: string }) {
  const body = await loginRider(input);
  await saveAuthFromResponse(body);
  void registerForPushNotifications();
  return body.data!;
}

export async function registerWithEmailPassword(input: {
  fullName: string;
  email: string;
  password: string;
  mobile?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  drivingLicenseUri?: string;
  aadhaarCardUri?: string;
  profileImageUri?: string;
  bankAccountDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode?: string;
  };
}) {
  const body = await registerRider(input);
  return body.data;
}

export async function logout() {
  const refreshToken = await getRefreshToken();
  try {
    if (refreshToken) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        _retry: true,
      } as RequestInit & { _retry?: boolean });
    }
  } catch {
    // clear local session anyway
  }
  await unregisterForPushNotifications();
  await clearTokens();
  useRiderStore.getState().clearRider();
}
