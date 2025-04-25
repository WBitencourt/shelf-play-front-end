import { actionsBackend } from "./bff";
import { actionsLocal } from "./local";

export const actions = {
  backend: {
    indicador: {
      getVolumetria: actionsBackend.indicador.getVolumetriaAction,
    },
    ia: {
      getTextoReclamacao: actionsBackend.ia.getTextoReclamacaoAction,
      getCausaRaizReclamacao: actionsBackend.ia.getCausaRaizReclamacaoAction,
    },
    cliente: {
      booking: {
        getResumoReclamacao: actionsBackend.cliente.booking.getResumoReclamacaoAction,
      },
      getDadosCliente: actionsBackend.cliente.getDadosClienteAction,
    },
    demanda: {
      submeterDemanda: actionsBackend.demanda.submeterDemandaAction,
      submeterDesdobramentoDemanda: actionsBackend.demanda.submeterDesdobramentoDemandaAction,
      enviarDemandaExcecaoOito: actionsBackend.demanda.enviarDemandaExcecaoOitoAction,
      enviarDemandaExcecaoCliente: actionsBackend.demanda.enviarDemandaExcecaoClienteAction,
      enviarDemandaEsteiraOito: actionsBackend.demanda.enviarDemandaEsteiraOitoAction,
      enviarDemandaEsteiraCliente: actionsBackend.demanda.enviarDemandaEsteiraClienteAction,
      desbloqueiaUsuarioDemanda: actionsBackend.demanda.desbloqueiaUsuarioDemandaAction,
      salvarDemanda: actionsBackend.demanda.salvarDemandaAction,
      adicionaObservacaoDemanda: actionsBackend.demanda.adicionaObservacaoDemandaAction,
      getDadosDemandaEsteiraOito: actionsBackend.demanda.getDadosDemandaEsteiraOitoAction,
      getDadosDemandaEsteiraCliente: actionsBackend.demanda.getDadosDemandaEsteiraClienteAction,
      getDadosDemandaExcecao: actionsBackend.demanda.getDadosDemandaExcecaoAction,
      getDadosDemandaConsulta: actionsBackend.demanda.getDadosDemandaConsultaAction,
      consultarDadosProcesso: actionsBackend.demanda.consultarDadosProcessoAction,
      salvarDesdobramentoDemanda: actionsBackend.demanda.salvarDesdobramentoDemandaAction,
    },
    auditoria: {
      getDadosDemandaAuditoriaOito: actionsBackend.auditoria.getDadosDemandaAuditoriaOitoAction,
      reprovarDemanda: actionsBackend.auditoria.reprovarDemandaAction,
      aprovarDemanda: actionsBackend.auditoria.aprovarDemandaAction,
    },
    excecao: {
      substituirEmailDemanda: actionsBackend.excecao.substituirEmailDemandaAction,
    },
    local: {
      getCidadesPorUf: actionsLocal.getCidadesPorUfAction,
    },
  },
}