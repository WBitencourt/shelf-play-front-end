import { api } from "@/actions/api";
import { getTranslations } from 'next-intl/server';

export interface GetUserParams {
  user: {
    id: string;
  }
}

async function getUser({ user }: GetUserParams) {
  const t = await getTranslations();

  try {
    if(!user.id) {
      throw new Error(t('actions.user.validation.id'));
    }

    const response = await api.authenticated(`/users/${user.id}`, {
      method: 'GET',
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.cause === 'validation') {
      throw error;
    }

    throw new Error(t('actions.user.error.getUser'));
  } 
} 

export const services = {
  getUser,
}