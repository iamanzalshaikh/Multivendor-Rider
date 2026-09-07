import { apiFetch } from '@/lib/apiFetch';

export async function deleteAccount() {
  return apiFetch('/users/delete-account', { method: 'DELETE' });
}
