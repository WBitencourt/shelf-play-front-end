import fs from 'fs';
const routeName = 'EverestIbgeServices';

export class EverestIbgeServices {
  constructor() {}

  static async getCidadesByUf(uf: string) {
    const methodName = `${routeName}.getCidadesByUf`;
    console.log({ message: `Iniciado ...`, method: methodName });
    try {
      const dadosBrutosStr = fs.readFileSync('./src/actionsV2/local/cidades_ibge.json', 'utf8');
      const dadosBrutos = JSON.parse(dadosBrutosStr);
      const cidades: string[] = [];

      dadosBrutos.forEach((cidade: any) => {
        // debugger;
        const novauf = cidade['regiao-imediata']['regiao-intermediaria']['UF']['sigla'];
        if (uf === novauf) {
          cidades.push(cidade['nome']);
        }
      });
      debugger;
      console.log({ message: `Finalizado ...`, method: methodName });
      return cidades;
    } catch (error: any) {
      debugger;
      console.error({ message: error.message, method: methodName });
      throw new Error(`${methodName} :: ${error.message}`);
    }
  }
}
