import { ActionResultData, util } from "@/actionsV2/util";
import { getCidadesPorUf as getCidadesPorUfSafeAction } from "./action";
import { GetCidadesPorUfParams } from "./services";
import { useAuthStore } from "@/zustand-store/auth.store";

const getCidadesPorUfAction = async (params: GetCidadesPorUfParams): Promise<string[]> => {
  try {
    const safeActionResult = await getCidadesPorUfSafeAction(params);
  
    const data: ActionResultData<any> | null = util.getActionResultData(safeActionResult);

    if(!data) {
      throw new Error('Erro ao obter a lista de cidades');
    }

    if(!data.success && data.response.status === 401) {
      useAuthStore.getState().signOut();
      
      throw new Error('Usuário não autenticado, por favor faça login novamente.');
    }
  
    if(!data.success) {
      throw new Error(data?.error?.message ?? 'Erro ao obter a lista de cidades');
    }

    const json = data.result;

    return json ?? [];
  } catch (error: any) {
    throw error;
  }
}

export const actionsLocal = {
  getCidadesPorUfAction,
}
