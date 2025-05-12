import { ActionResultData, SafeActionResult, util } from "@/actions/util";
import { getUserSafeAction } from "./action";
import { useAuthStore } from "@/zustand-store/auth.store";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
}

interface GetUserAction {
  user: {
    id: string;
  }
}

const getUserAction = async (params: GetUserAction): Promise<User> => {
  try {
    const safeActionResult = await getUserSafeAction(params) as SafeActionResult<User>;
  
    const data: ActionResultData<User> | null = util.getActionResultData(safeActionResult);

    if(!data) {
      throw new Error('Erro ao obter os dados do usuário');
    }

    if(!data.success && data.response.status === 401) {
      useAuthStore.getState().signOut();
      
      throw new Error('Usuário não autenticado, por favor faça login novamente.');
    }
  
    if(!data.success) {
      throw new Error(data?.error?.message ?? 'Erro ao obter os dados do usuário');
    }

    const json = data.result;

    return {
      id: json?.id ?? '',
      name: json?.name ?? '',
      email: json?.email ?? '',
      createdAt: json?.createdAt ?? '',
      updatedAt: json?.updatedAt ?? '',
      enabled: json?.enabled ?? false,
    };
  } catch (error) {
    throw error;
  }
}

export const actionsBffUser = {
  getUserAction,
} 