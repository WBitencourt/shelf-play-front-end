import { EverestIbgeServices } from "./everest.ibge.services";

export interface GetCidadesPorUfParams {
  uf: string;
}

export async function getCidadesPorUf({ uf }: GetCidadesPorUfParams ) {
  try {
    if (!uf) {
      throw new Error('UF não pode ser vazia');
    }

    const cidades = await EverestIbgeServices.getCidadesByUf(uf);

    if (!cidades) {
      return [];
    }

    return cidades;
  } catch (error) {
    console.error('Erro ao buscar cidades:', error);
    return [];
  }
}

export const services = {
  getCidadesPorUf,
}