'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useShallow } from "zustand/shallow";
import { useResourcesStore } from "@/zustand-store/resources";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload } from "@/components/Upload2.0";
import * as Icon from '@phosphor-icons/react';
import { PDFViewer } from "@/components/PDFViewer";
import { FileItem, UpdateFile, UploadRootHandles } from "@/components/Upload2.0/contexts";
import Countdown from "@/components/Countdown";
import { Skeleton } from "@/components/Skeleton2.0";
import { useAuthStore } from "@/zustand-store/auth.store";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "@/components/FieldMessage";
import { util } from "@/utils";
import { fileHelper } from "@/utils/File";
import { ArquivoDemanda } from "@/actions/bff/interface";
import { toast } from "@/utils/toast";
import { ClipboardCheck, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { getDadosCliente as getDadosClienteAction } from "@/actions/backend-for-front-end/cliente";

import {
  DemandaAtualizacao,
  OnUploadErrorProps,
  FormFile,
  OnDropAccepted,
  OnDropRejected,
  OnProcessUpdateProps,
  ProcessUploadErrorProps,
  OnUploadProgressProps,
  HandleClickDeleteFileProps,
  HandleClickRetryUploadProps,
  ObservacaoInfo,
  JustificativaInfo,
} from "../../interfaces";

import {
  adicionaObservacaoDemanda,
  desbloqueiaUsuarioDemanda,
  enviarDemandaEsteiraOito,
} from "@/actions/backend-for-front-end/demanda";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DetalhesCadastro } from "@/components/Forms/util/Components/DetalhesCadastro";

interface CadastroJuridicoParams {
  id: string;
  esteira: string;
  esteiraTipo: string;
  dadosIniciais: DemandaAtualizacao;
}

interface FormAtualizacaoBookingExcecaoOitoProps {
  params: CadastroJuridicoParams;
}

interface DadosClienteForm {
  timeOut: number;
}

interface HandleChangeTipoArquivoProps {
  file: FormFile;
  value: string;
  updateFile: UpdateFile<FormFile>;
}

const sortListFiles = (a: FormFile, b: FormFile) => {
  if (a.status.success === true && a.status.progress === 0 && b.status.success === false) {
    return -1;
  }

  if (a.status.success === true && a.status.progress === 100 && b.status.success === false) {
    return 1;
  }

  if (a.status.success === false && b.status.success === true && b.status.progress === 0) {
    return 1;
  }

  if (a.status.success === false && b.status.success === true && b.status.progress === 100) {
    return -1;
  }

  if (a.status.success === true && b.status.success === true) {
    return a.status.progress - b.status.progress;
  }

  if (a.status.success === false && b.status.success === false) {
    return 0;
  }

  return 0;
}

export function FormAtualizacaoBookingExcecaoOito({ params }: FormAtualizacaoBookingExcecaoOitoProps) {
  const pk = params.id;
  const esteira = params.esteira;
  const esteiraTipo = params.esteiraTipo;
  const dadosIniciais = params.dadosIniciais;

  const router = useRouter();
  const searchParams = useSearchParams();

  const { user } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
    }))
  );

  const { arquivo } = useResourcesStore(
    useShallow((state) => ({
      arquivo: state.arquivo,
    }))
  );

  const uploadRef = useRef<UploadRootHandles<FormFile>>(null);

  const formBag = useForm<DemandaAtualizacao>({
    defaultValues: {
      observacao: [],
      processo: '',
      liminar_habilitada: false,
      conteudo_liminar: '',
      contestacao_habilitada: false,
      conteudo_contestacao: '',
      audiencia_habilitada: false,
      data_audiencia: '',
      sentenca_habilitada: false,
      conteudo_sentenca: '',
      despacho_habilitado: false,
      despacho_conteudo: '',
      prazo_liminar: '',
      prazo_tipo: 'dias_corridos',
    }
  });

  const values = formBag.watch();

  const [initialUploadList, setInitialUploadList] = useState<FormFile[]>([]);

  const [fileViewer, setFileViewer] = useState({
    url: '',
    name: '',
    s3Key: '',
    s3Bucket: '',
  });

  const [dialogObservacaoInfo, setDialogObservacaoInfo] = useState<ObservacaoInfo>({
    observacao: {
      value: '',
      isValid: false,
    }
  });

  const [justificarEnvioDialogInfo, setJustificarEnvioDialogInfo] = useState<JustificativaInfo>({
    tipo: '',
    title: {
      text: 'Justificar envio',
    },
    justificativa: {
      value: '',
      isValid: true,
    }
  });

  const [dadosCliente, setDadosCliente] = useState<DadosClienteForm>({
    timeOut: 5,
  });

  const [isLoadingForm, setIsLoadingForm] = useState(true);
  const [isLoadingFileViewer, setIsLoadingFileViewer] = useState(true);
  const [isOpenInitialUploadList, setIsOpenInitialUploadList] = useState<boolean>(false);
  const [isPausedCountDown, setIsPausedCountDown] = useState<boolean>(false);
  const [isAddingObsForm, setIsAddingObsForm] = useState(false);
  const [isUploadLimitReached, setIsUploadLimitReached] = useState(false);
  const [isEnviandoDesdobramento, setIsEnviandoDesdobramento] = useState(false);
  const [isJustificandoEnvio, setIsJustificandoEnvio] = useState(false);
  const [isDesvinculandoUsuario, setIsDesvinculandoUsuario] = useState(false);

  const [dialogProcessoOpen, setDialogProcessoOpen] = useState(false);
  const [dialogObservacaoOpen, setDialogObservacaoOpen] = useState(false);
  const [dialogEnviarDesdobramentoOpen, setDialogEnviarDesdobramentoOpen] = useState(false);
  const [dialogJustificarEnvioOpen, setDialogJustificarEnvioOpen] = useState(false);
  const [dialogConfirmarDespachoOpen, setDialogConfirmarDespachoOpen] = useState(false);

  const dateNow = useMemo(() => new Date(), []);

  const formatFormValues = useCallback((values: Partial<DemandaAtualizacao>) => {
    const formattedValues = {
      ...values,
    } as DemandaAtualizacao;

    console.log('Valores NAO formatados:', values);
    console.log('Valores formatados:', formattedValues);

    return formattedValues;
  }, []);

  const updateDadosCliente = (newDados: Partial<DadosClienteForm>) => {
    if (!newDados) {
      return;
    }

    setDadosCliente((prevState) => {
      if (!prevState) {
        return {
          timeOut: 5,
          tiposDemanda: [],
          assuntos: [],
          descricaoOficio: [],
        }
      }

      return {
        ...prevState,
        ...newDados,
        timeOut: newDados.timeOut ?? 5,
      }
    });
  }

  const updateDialogJustificarEnvioInfo = (newState: Partial<JustificativaInfo>) => {
    if (!newState || Object.keys(newState).length === 0) {
      return; // Retorna se newState for null, undefined ou um objeto vazio
    }
  
    setJustificarEnvioDialogInfo((prevState) => {
      return {
        ...prevState,
        ...newState,
        title: {
          ...prevState.title,
          ...newState.title,
        },
        justificativa: {
          ...prevState.justificativa,
          ...newState.justificativa,
        },
      };
    });
  };

  const updateDialogObservacaoInfo = (newState: Partial<ObservacaoInfo>) => {
    if (!newState || Object.keys(newState).length === 0) {
      return; // Retorna se newState for null, undefined ou um objeto vazio
    }
  
    setDialogObservacaoInfo((prevState) => {
      if (!prevState) {
        return {
          observacao: {
            value: '',
            isValid: true,
          }
        }
      }
  
      return {
        ...prevState,
        ...newState,
      };
    });
  };

  const carregarArquivosDemanda = useCallback(async (files: ArquivoDemanda[] | undefined) => {
    try {
      const initialUploadList = await Promise.all(
        files?.map(async (file, index) => {
          try {
            const urlFile = await arquivo.getFileUrlFromS3({
              s3Key: file.s3key,
              s3Bucket: file.s3Bucket,
            });
  
            const newFile: FormFile = {
              id: file.sk,
              info: {
                name: file.file_name,
                size: file.file_size,
                sizeFormatted: fileHelper.convertToLiteralString({
                  size: file.file_size,
                  unit: file.file_unit,
                  newUnit: 'MB',
                }),
                unit: file.file_unit,
                url: urlFile,
                tipo: file?.tipo ?? '',
                s3Key: file.s3key,
                s3Bucket: file.s3Bucket,
              },
              status: {
                success: true,
                progress: 100,
                message: 'Arquivo carregado com sucesso',
              },
              allow: {
                download: true,
                link: true,
                retryUpload: false,
                delete: true,
              },
              dropzoneFile: undefined,
            };

            return newFile;
          } catch (error: any) {
            const errorFile: FormFile = {
              id: uuid(),
              info: {
                name: file.file_name,
                size: file.file_size,
                sizeFormatted: fileHelper.convertToLiteralString({
                  size: file.file_size,
                  unit: file.file_unit,
                  newUnit: 'MB',
                }),
                unit: file.file_unit,
                url: '',
                tipo: file?.tipo ?? '',
                s3Key: file.s3key,
                s3Bucket: file.s3Bucket,
              },
              status: {
                success: false,
                progress: 100,
                message: error?.message,
              },
              allow: {
                download: false,
                link: false,
                retryUpload: false,
                delete: false,
              },
              dropzoneFile: undefined,
            }

            return errorFile;
          }
        }) || []
      );

      console.log('Lista de arquivos carregados:', initialUploadList);

      const firstItemUploadConfigList = initialUploadList.find((item) => !!item.info.url);

      setInitialUploadList(initialUploadList);
      setFileViewer({
        url: firstItemUploadConfigList?.info.url ?? '',
        name: firstItemUploadConfigList?.info.name ?? '',
        s3Key: firstItemUploadConfigList?.info.s3Key ?? '',
        s3Bucket: firstItemUploadConfigList?.info.s3Bucket ?? '',
      });

      const totalFilesSizeInBytes = initialUploadList.reduce((acc, file) => acc + fileHelper.convertToBytes({
        size: file.info.size,
        unit: file.info.unit,
      }), 0);

      const isFileSizeExceeded = fileHelper.isFileSizeExceeded({ 
        unit: 'B', 
        size: totalFilesSizeInBytes, 
        limit: {
          unit: 'B',
          size: fileHelper.convertToBytes({ size: 20, unit: 'MB' }),
        } 
      })

      setIsUploadLimitReached(isFileSizeExceeded);

      if(isFileSizeExceeded) {
        toast.warning({
          title: 'Aviso!',
          description: 'Limite total de 20MB de arquivos atingido.',
        });
      }

    } catch (error: any) {
      toast.error({
        title: 'Falha ao carregar o arquivo',
        description: error?.message,
      });
    } finally {
      setIsLoadingFileViewer(false);
    }
  }, []);

  const updateFormValues = useCallback((newValues: Partial<DemandaAtualizacao>) => {
    try {
      const oldValues = formBag.getValues();

      const formattedValues = formatFormValues({
        ...oldValues,
        ...newValues,
      });

      formBag.reset(formattedValues);

    } catch (error: any) {
      toast.error({
        title: 'Falha ao atualizar os dados do formulário',
        description: error?.message,
      });
    } 
  }, [formatFormValues, formBag.getValues, formBag.reset]);

  const desbloqueiaDemanda = async () => {
    try {
      await desbloqueiaUsuarioDemanda({ pk })
    } catch(error: any) {
      throw new Error(error?.message);
    }
  }

  const pushBack = () => {
    const urlQuery = searchParams.toString() ?? '';

    router.push(`/${esteira}/${esteiraTipo}?${urlQuery}`);
  }

  const onSubmit = async (dados: DemandaAtualizacao) => {
    try {
    } catch (error: any) {
      toast.error({
        title: 'Falha ao aprovar o formulário',
        description: error?.message,
      });
    } finally { 

    }
  };

  const handleClickFile = (file: FormFile) => {
    setFileViewer({
      url: file.info.url,
      name: file.info.name,
      s3Key: file.info.s3Key,
      s3Bucket: file.info.s3Bucket,
    });
  }

  const onUploadError = ({ file, message }: OnUploadErrorProps) => {
    const updateFile = uploadRef.current?.updateFile as UpdateFile<FormFile>;

    const newFile: FileItem<FormFile> = {
      ...file,
      status: {
        ...file.status,
        success: false,
        progress: 0,
        message: message ? message : file.status.message,
      },
      allow: {
        ...file.allow,
        retryUpload: true,
        delete: true,
      }
    }

    updateFile(file.id, {
      newFile
    })

    return newFile;
  }

  const onUploadProgress = ({ file, event, updateFile }: OnUploadProgressProps) => {
    const progress = parseInt(
      Math.round((event.loaded * 100) / event.total
      ).toString())

    const newFile: FileItem<FormFile> = {
      ...file,
      status: {
        ...file.status,
        success: undefined,
        progress,
      }
    }

    updateFile(file.id, {
      newFile
    })
  }

  const processUploadError = ({ file, updateFile, message }: ProcessUploadErrorProps) => {
    const newFile: FileItem<FormFile> = {
      ...file,
      status: {
        ...file.status,
        success: false,
        progress: 100,
        message,
      },
      allow: {
        ...file.allow,
        retryUpload: true,
        delete: true,
      }
    }

    updateFile(file.id, {
      newFile
    })
  }

  const handleOnDropAccepted = ({ files, uploadFiles }: OnDropAccepted) => {
    const newFiles: FormFile[] = files.map((file) => {
      return {
        id: uuid(),
        info: {
          name: file.name,
          size: file.size,
          sizeFormatted: fileHelper.convertToLiteralString({
            size: file.size,
            unit: 'B',
            newUnit: 'MB',
          }),
          unit: 'B',
          url: '',
          tipo: '',
          s3Key: '',
          s3Bucket: '',
        },
        status: {
          success: undefined,
          progress: 0,
          message: undefined,
        },
        allow: {
          delete: false,
          download: false,
          retryUpload: false,
          link: false,
        },
        dropzoneFile: file,
      }
    })

    uploadFiles({
      files: newFiles,
    });
  }

  const handleOnDropRejected = ({ files, uploadFiles }: OnDropRejected) => {
    const newFiles: FormFile[] = files.map((item) => {
      const messageError = item.errors.map((error) => error.message).join('; ');

      return {
        id: uuid(),
        info: {
          name: item.file.name,
          size: item.file.size,
          sizeFormatted: fileHelper.convertToLiteralString({
            size: item.file.size,
            unit: 'B',
            newUnit: 'KB',
          }),
          unit: 'KB',
          url: '',
          tipo: '',
          s3Key: '',
          s3Bucket: '',
        },
        status: {
          success: false,
          progress: 100,
          message: messageError,
        },
        allow: {
          delete: true,
          download: false,
          retryUpload: true,
          link: false,
        },
        dropzoneFile: item.file,
      }
    })

    uploadFiles({
      files: newFiles,
    });
  }

  const handleProcessUpload = async ({ file, updateFile }: OnProcessUpdateProps) => {
    try {
      setIsPausedCountDown(true);

      if (file.status.success === false) {
        return onUploadError({ file })
      }

      const currentList = uploadRef.current?.list ?? [];

      const totalFilesSizeInBytes = currentList.reduce((acc, file) => acc + fileHelper.convertToBytes({
        size: file.info.size,
        unit: file.info.unit,
      }), 0);

      const isFileSizeExceeded = fileHelper.isFileSizeExceeded({ 
        unit: 'B', 
        size: totalFilesSizeInBytes, 
        limit: {
          unit: 'B',
          size: fileHelper.convertToBytes({ size: 20, unit: 'MB' }),
        } 
      })

      setIsUploadLimitReached(isFileSizeExceeded);

      if(isFileSizeExceeded) {
        toast.warning({
          title: 'Aviso',
          description: 'Limite total de 20MB de arquivos atingido.',
        });
      }

      const submittedFile = await arquivo.submitFile({
        demandaPk: pk,
        file: {
          name: file.info.name,
          dropzoneFile: file.dropzoneFile as File,
        },
        onUploadProgress: (event) => onUploadProgress({
          file,
          event,
          updateFile,
        }),
      });

      const urlFile = file?.dropzoneFile ? URL.createObjectURL(file?.dropzoneFile as File) : '';

      const newFile: FormFile = {
        ...file,
        id: submittedFile?.id,
        info: {
          ...file.info,
          url: urlFile,
        },
        status: {
          ...file.status,
          success: true,
          progress: 100,
          message: 'Arquivo enviado com sucesso',
        },
        allow: {
          delete: true,
          download: true,
          retryUpload: false,
          link: true,
        },
      }

      updateFile(file.id, {
        newFile
      })

      const arquivosForm = formBag.getValues('arquivos') ?? [];

      updateFormValues({
        arquivos: [
          ...arquivosForm,
          {
            s3key: submittedFile?.s3Key,
            s3Bucket: submittedFile?.s3Bucket,
            file_name: submittedFile?.fileName,
            file_size: submittedFile?.fileSize,
            sk: submittedFile?.sk,
            tipo: submittedFile?.tipo,
            file_unit: 'MB',
          }
        ]
      })
    } catch (error: any) {
      processUploadError({
        file,
        updateFile,
        message: error?.message
      })

      toast.error({
        title: 'Falha ao enviar o arquivo',
        description: error?.message,
      });
    } finally {
      setIsPausedCountDown(false);
    }
  }

  const handleClickDeleteFile = async ({ file, removeFile, updateFile }: HandleClickDeleteFileProps) => {
    try {
      if (file.status.success === undefined && file.status.progress < 100) {
        removeFile(file.id);
        //abort upload
        return;
      }

      if (file.status.success === false) {
        removeFile(file.id);
        return;
      }

      updateFile(file.id, {
        newFile: { ...file, status: { ...file.status, isDeleting: true } }
      });

      await arquivo.deleteFile({
        demandaPk: pk,
        demandaSk: file.id
      });

      removeFile(file.id);

      setFileViewer({
        url: '',
        name: '',
        s3Key: '',
        s3Bucket: '',
      });

      const arquivosForm = formBag.getValues('arquivos') ?? [];

      const newArquivos = arquivosForm.filter((arquivo) => arquivo.sk !== file.id);
  
      formBag.setValue('arquivos', newArquivos);
    } catch (error: any) {
      toast.error({
        title: 'Falha ao excluir o arquivo',
        description: error?.message,
      });
    } finally {
      updateFile(file.id, {
        newFile: { ...file, status: { ...file.status, isDeleting: false } }
      });
    }
  }

  const handleClickRetryUpload = async ({ file, retryUpload }: HandleClickRetryUploadProps) => {
    retryUpload(file.id, {
      newFile: {
        ...file,
        status: {
          ...file.status,
          success: undefined,
          progress: 0,
          message: undefined,
        },
      }
    });
  }

  const handleFinalCountDown = async () => {
    try {
      await desbloqueiaDemanda();

      toast.info({
        title: 'Tempo esgotado',
        description: 'Tempo limite atingido, demanda desbloqueada',
      });

      router.push(`/${esteira}/${esteiraTipo}`);
    } catch(error: any) {
      toast.error({
        title: 'Falha ao desbloquear a demanda',
        description: error?.message,
      });
    }
  }

  const adicionaObservacao = async () => {
    try {
      setIsAddingObsForm(true);

      if (!user?.email) {
        throw new Error('E-mail do usuário não carregado na autenticação corretamente'); 
      }

      const response = await adicionaObservacaoDemanda({
        pk,
        observacao: dialogObservacaoInfo.observacao.value,
        userEmail: user?.email,
      });

      util.actions.checkHaveError(response?.data);

      const oldObservacoes = formBag.getValues('observacao') ?? [];

      updateFormValues({
        observacao: [
          ...oldObservacoes,
          {
            mensagem: dialogObservacaoInfo.observacao.value,
            criada_por: user?.email,
            criada_em: dateNow.toISOString(),
          }
        ]
      });

      toast.success({
        title: 'Observação',
        description: 'Observação adicionada com sucesso.',
      });
    } catch (error: any) { 
      toast.error({
        title: 'Falha ao adicionar observação',
        description: error?.message,
      });
    } finally {
      setIsAddingObsForm(false);
    }
  }

  const getDadosCliente = async () => {
    try {
      const cliente = dadosIniciais?.cliente;

      if(!cliente) {
        throw new Error('Cliente não informado corretamente.');
      }

      const response = await getDadosClienteAction({
        cliente: cliente,
      });

      const dadosCliente = util.actions.convertResponseActionData(response?.data) ?? undefined;

      return dadosCliente;
    } catch (error: any) {
      toast.error({
        title: 'Falha ao consultar os dados do cliente',
        description: error?.message,
      });
    }
  }

  const handleClickCloseJustificarEnvioDialog = () => {
    updateDialogJustificarEnvioInfo({
      justificativa: {
        value: '',
        isValid: true,
      }
    });

    setDialogJustificarEnvioOpen(false);
  }

  const enviarEsteiraOito = async () => {
    try {
      const response = await enviarDemandaEsteiraOito({
        pk,
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
      });

      util.actions.checkHaveError(response?.data);

      toast.success({
        title: 'Enviado',
        description: 'Demanda enviada para esteira oito com sucesso',
      });

    } catch (error: any) { 
      toast.error({
        title: '',
        description: error?.message,
      });
    }
  }
  
  const handleClickConfirmaJustificarEnvio = async (info: JustificativaInfo) => {
    try {
      setIsJustificandoEnvio(true);

      const justificativa = justificarEnvioDialogInfo.justificativa.value ?? '';

      if(justificativa.length < 10) {
        updateDialogJustificarEnvioInfo({
          justificativa: {
            isValid: false,
          }
        });

        return;
      }

      switch (info.tipo) {
        case 'enviar-esteira-oito':
          await enviarEsteiraOito();
          break;
          
        default:
          break;
      }

      router.push(`/${esteira}/${esteiraTipo}`);
    } catch (error: any) {
      toast.error({
        title: 'Falha ao justificar envio',
        description: error?.message,
      });
    } finally {
      setIsJustificandoEnvio(false);
    }
  }
  

  const handleConfirmaEnviarDesdobramento = async () => {
    // try {
    //   setIsEnviandoDesdobramento(true);

    //   if (!user?.email) {
    //     throw new Error('E-mail do usuário não carregado na autenticação corretamente'); 
    //   }

    //   console.log('Valores do formulário para desdobramento:', formBag.getValues());

    //   const response = await enviarDesdobramentoProcesso({
    //     dados: formBag.getValues(),
    //   });

    //   util.actions.checkHaveError(response?.data);

    //   toast.success({
    //     title: 'Sucesso!',
    //     description: 'Desdobramento alterado com sucesso.',
    //   });

    //   router.push(`/${esteira}/${esteiraTipo}/demanda/${pk}`);
    // } catch (error: any) {
    //   toast.error({
    //     title: 'Falha ao enviar o desdobramento',
    //     description: error?.message,
    //   });
    // } finally {
    //   setIsEnviandoDesdobramento(false);
    //   setDialogEnviarDesdobramentoOpen(false);
    // }
  }
  
  const handleClickAdicionaObservacao = () => {
    setDialogObservacaoOpen(true);
  }

  const handleClickConfirmaAdicionaObservacao = async () => {
    try {
      setIsAddingObsForm(true);

      if (!user?.email) {
        throw new Error('E-mail do usuário não carregado na autenticação corretamente'); 
      }

      await adicionaObservacao()
    } catch (error: any) { 
      toast.error({
        title: 'Falha ao adicionar observação',
        description: error?.message,
      });
    } finally {
      setIsAddingObsForm(false);
      setDialogObservacaoOpen(false);
    }
  }

  const handleClickSair = async () => {
    try {
      setIsDesvinculandoUsuario(true);

      await desbloqueiaDemanda();

      router.push(`/${esteira}/${esteiraTipo}`);
    } catch (error: any) {
      toast.error({
        title: 'Falha ao desbloquear a demanda',
        description: error?.message,
      });
    }
  }

  const handleChangeTipoArquivo = ({ file, updateFile, value }: HandleChangeTipoArquivoProps) => {
    console.log('Processo: Tipo do arquivo:', file);

    const newFile: FormFile = {
      ...file,
      info: {
        ...file.info,
        tipo: value,
      }
    }

    updateFile(file.id, {
      newFile
    });

    const arquivosForm = formBag.getValues('arquivos') ?? [];

    const newArquivos = arquivosForm.map((arquivo) => {
      if (arquivo.sk === file.id) {
        return {
          ...arquivo,
          tipo: value,
        };
      }

      return arquivo;
    });

    formBag.setValue('arquivos', newArquivos);
  }

  const handleClickEnviarDemandaEsteiraOito = () => {
    setDialogJustificarEnvioOpen(true);

    updateDialogJustificarEnvioInfo({
      tipo: 'enviar-esteira-oito',
      title: {
        text: 'Justificar envio para esteira oito',
      },
    });
  }

  const handleHabilitarDespacho = (checked: boolean) => {
    if (checked) {
      setDialogConfirmarDespachoOpen(true);
    } else {
      formBag.setValue('despacho_habilitado', false);
      formBag.setValue('despacho_conteudo', '');
    }
  };

  const handleHabilitarLiminar = (checked: boolean) => {
    formBag.setValue('liminar_habilitada', !!checked);
    if (!checked) {
      formBag.setValue('conteudo_liminar', '');
    }
  };

  const handleHabilitarContestacao = (checked: boolean) => {
    formBag.setValue('contestacao_habilitada', !!checked);
    if (!checked) {
      formBag.setValue('conteudo_contestacao', '');
    }
  };

  const handleHabilitarAudiencia = (checked: boolean) => {
    formBag.setValue('audiencia_habilitada', !!checked);
    if (!checked) {
      formBag.setValue('data_audiencia', '');
    }
  };

  const handleConfirmacaoDespacho = () => {
    // Limpar todos os outros campos
    formBag.setValue('liminar_habilitada', false);
    formBag.setValue('conteudo_liminar', '');
    formBag.setValue('contestacao_habilitada', false);
    formBag.setValue('conteudo_contestacao', '');
    formBag.setValue('audiencia_habilitada', false);
    formBag.setValue('data_audiencia', '');
    formBag.setValue('sentenca_habilitada', false);
    formBag.setValue('conteudo_sentenca', '');
    
    // Habilitar o despacho
    formBag.setValue('despacho_habilitado', true);
    
    // Fechar o modal
    setDialogConfirmarDespachoOpen(false);
  };

  const handlePrazoLiminarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove qualquer caractere não numérico
    if (value === '' || parseInt(value) > 0) {
      formBag.setValue('prazo_liminar', value);
    }
  };
  
  const handlePrazoTipoChange = () => {
    const prazoTipo = formBag.getValues('prazo_tipo');

    if(prazoTipo === 'dias_corridos') {
      formBag.setValue('prazo_tipo', 'horas_corridas');
    }

    if(prazoTipo === 'horas_corridas') {
      formBag.setValue('prazo_tipo', 'dias_corridos');
    }
  };

  const handleDataAudienciaChange = (selectedDate: Date | null) => {
    formBag.clearErrors('data_audiencia');

    if (!selectedDate) {
      formBag.setValue('data_audiencia', '');
      return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diaSemana = selectedDate.getDay();
    const ehFinalDeSemana = diaSemana === 0 || diaSemana === 6; // 0 = domingo, 6 = sábado
    const ehRetroativa = selectedDate < hoje;

    if (ehRetroativa || ehFinalDeSemana) {
      toast.warning({
        title: 'Data inválida',
        description: 'A data da audiência não pode ser em um final de semana ou retroativa.'
      });

      formBag.setError('data_audiencia', {
        message: 'A data da audiência não pode ser em um final de semana ou retroativa.'
      });

    }

    if (ehFinalDeSemana) {
      toast.warning({
        title: 'Data inválida',
        description: 'A data da audiência não pode ser em um final de semana.'
      });

      formBag.setError('data_audiencia', {
        message: 'A data da audiência não pode ser em um final de semana.'
      });
    }

    if (ehRetroativa) {
      toast.warning({
        title: 'Data inválida',
        description: 'A data da audiência não pode ser retroativa.'
      });

      formBag.setError('data_audiencia', {
        message: 'A data da audiência não pode ser retroativa.'
      });
    }

    formBag.setValue('data_audiencia', selectedDate.toISOString());
  };

  const atualizaFormDadosIniciais = useCallback(async () => {
    try {
      setIsLoadingForm(true);

      console.log('Dados recebidos:', dadosIniciais);

      if (!dadosIniciais) {
        return
      }

      const dadosCliente = await getDadosCliente();

      updateDadosCliente({
        timeOut: dadosCliente?.time_out?.['Atualizacao'],
      });

      updateFormValues(dadosIniciais);

      carregarArquivosDemanda(dadosIniciais?.arquivos);
    } catch (error: any) {
      toast.error({
        title: 'Falha ao carregar os dados iniciais',
        description: error?.message,
      });
    } finally {
      setIsLoadingForm(false);
    }
  }, [updateFormValues, carregarArquivosDemanda]);

  useEffect(() => {
    atualizaFormDadosIniciais();
  }, []);

  return (
    <div className="flex w-full h-full gap-4">
      <Card
        style={{ maxHeight: 'calc(100vh - 136px)' }}
        className="sticky top-[72px] w-1/2 gap-4 p-2 rounded bg-zinc-100 dark:bg-zinc-800"
      >
        {
          isLoadingFileViewer ? (
            <Skeleton.Root className='w-full h-full'>
              <Skeleton.Custom className='w-full h-full' />
            </Skeleton.Root>
          ) : (
            <div className="flex flex-col w-full h-full gap-2">
              {
                isUploadLimitReached ? (
                  <span className='text-xs text-orange-500 dark:text-yellow-600 bg-zinc-200 dark:bg-zinc-900 rounded p-2'>
                    Aviso: Limite total de 20MB de arquivos atingido.
                  </span>
                ) : null
              }

              <Upload.Bag
                ref={uploadRef}
                visible
                initialList={initialUploadList}
                onProcessUpload={async (file, updateFile) => {
                  handleProcessUpload({ file, updateFile })
                }}
              >
                {
                  ({ list, uploadFiles, removeFile, retryUpload, updateFile }) => {
                    return (
                      <Upload.Root
                        data-open={isOpenInitialUploadList}
                        className="data-[open=true]:h-1/2"
                      >
                        <Upload.Drop.Root>
                          <Upload.Drop.Dropzone
                            maxSizeFile='20MB'
                            maxFiles={undefined}
                            onDropAccepted={(event, files) => {
                              handleOnDropAccepted({ files, uploadFiles })
                            }}
                            onDropRejected={(event, files) => {
                              handleOnDropRejected({ files, uploadFiles })
                            }}
                            filesAccept={{
                              'application/pdf': ['.pdf'],
                              'text/plain': ['.txt'],
                            }}
                          >
                            {(dropzoneBag) => {
                              return (
                                <Upload.Drop.Drag.Root>
                                  <Upload.Drop.Drag.View
                                    dropzoneBag={dropzoneBag}
                                  />
                                  {/* {
                                    isUploadLimitReached ? (
                                      <Upload.Drop.Drag.Custom className="text-red-500 border-red-500">
                                        Limite de 20MB de arquivos atingido
                                      </Upload.Drop.Drag.Custom>
                                    ) : (
                                      <Upload.Drop.Drag.View
                                        dropzoneBag={dropzoneBag}
                                      />
                                    )
                                  } */}
                                </Upload.Drop.Drag.Root>
                              )
                            }}
                          </Upload.Drop.Dropzone>

                          <Upload.Drop.Info.TooltipIcon />
                        </Upload.Drop.Root>

                        <Upload.List.ToggleOpen
                          show={isOpenInitialUploadList}
                          onClick={(open) => setIsOpenInitialUploadList(open)}
                        >
                          <Upload.List.Root className="min-h-[130px]">
                            {
                              list.sort((a, b) => sortListFiles(a, b)).map((file) => {
                                return (
                                  <Upload.List.Row.Root
                                    key={file.id}
                                    className='cursor-pointer'
                                    onClick={() => handleClickFile(file)}
                                  >
                                    <Upload.List.Row.Name
                                      tooltip={file.info.name}
                                      selected={fileViewer.url === file.info.url}
                                      onClick={() => handleClickFile(file)}
                                    >
                                      {
                                        fileViewer.url === file.info.url ?
                                          <div className="flex items-center gap-1">
                                            <Icon.CaretCircleRight
                                              className='flex-shrink-0 text-blue-500'
                                              weight='fill'
                                            />

                                            {file.info.name}
                                          </div>
                                          :
                                          file.info.name
                                      }
                                    </Upload.List.Row.Name>

                                    <Upload.List.Row.Action.Root>
                                      {
                                        file.allow.download &&
                                        <Upload.List.Row.Action.Download
                                          fileName={file.info.name}
                                          url={file.info.url}
                                        />
                                      }

                                      {
                                        file.allow.link &&
                                        <Upload.List.Row.Action.Link
                                          url={file.info.url}
                                        />
                                      }

                                      {
                                        file.status.success === undefined ?
                                          <Upload.List.Row.Action.Status.Pending
                                            progress={file.status.progress}
                                          />
                                          :
                                          (
                                            file.status.success ?
                                              <Upload.List.Row.Action.Status.Success
                                                tooltip={file.status.message}
                                              />
                                              :
                                              <>
                                                {
                                                  file.allow.retryUpload &&
                                                  <Upload.List.Row.Action.Retry
                                                    onClick={() => {
                                                      handleClickRetryUpload({
                                                        file,
                                                        retryUpload,
                                                      })
                                                    }}
                                                  />
                                                }

                                                <Upload.List.Row.Action.Status.Failure
                                                  tooltip={file.status.message}
                                                />
                                              </>
                                          )
                                      }
                                    </Upload.List.Row.Action.Root>
                                    
                                    {/* <Upload.List.Row.Preview.Root>
                                      <Icon.FileText
                                        className='self-center text-3xl text-black dark:text-white'
                                        weight='thin'
                                      />
                                    </Upload.List.Row.Preview.Root> */}

                                    <Upload.List.Row.Description>
                                      <Select 
                                        disabled={!file.status.success}
                                        value={file.info.tipo}
                                        onValueChange={(value) => handleChangeTipoArquivo({
                                          updateFile,
                                          file,
                                          value,
                                        })}
                                      >
                                        <SelectTrigger className="h-6">
                                          <SelectValue placeholder="Selecione o tipo do arquivo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Processo Jurídico">Processo Jurídico</SelectItem>
                                          <SelectItem value="Procon">Procon</SelectItem>
                                          <SelectItem value="Outro">Outro</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </Upload.List.Row.Description>

                                    <Upload.List.Row.Size className='flex items-center justify-center'>
                                      { file.info.sizeFormatted }
                                    </Upload.List.Row.Size>

                                    {
                                      <Upload.List.Row.Remove
                                        className=""
                                        disabled={!file.allow.delete || file.status.isDeleting}
                                        onClick={() => {
                                          handleClickDeleteFile({
                                            file,
                                            removeFile,
                                            updateFile,
                                          })
                                        }}
                                      >
                                        {
                                          file.status.isDeleting ?
                                            <Icon.CircleNotch
                                              className="animate-spin text-red-500 text-sm"
                                              weight='bold'
                                            />
                                            :
                                            <span>
                                              Remover
                                            </span>

                                        }
                                      </Upload.List.Row.Remove>
                                    }
                                  </Upload.List.Row.Root>
                                )
                              })
                            }
                          </Upload.List.Root>
                        </Upload.List.ToggleOpen>
                      </Upload.Root>
                    )
                  }
                }
              </Upload.Bag>

              <PDFViewer
                data-open={isOpenInitialUploadList}
                className="data-[open=true]:h-1/2"
                source={fileViewer.url}
              />
            </div>
          )
        }
      </Card>

      <Card className="flex flex-col w-1/2 gap-4 py-4 h-full overflow-y-auto">
        <CardContent className="flex flex-col gap-4 h-full">
          <Countdown 
            label='Tempo restante para preenchimento:'
            paused={isPausedCountDown}
            time={{
              now: dateNow.toISOString(),
              start: dateNow.toISOString(),
              deadline: moment(dateNow).add(dadosCliente.timeOut, 'minutes').toISOString(),
            }}
            onFinalCountdown={handleFinalCountDown}
          />

          {
            isLoadingForm ? (
              <Skeleton.Root className='flex flex-col gap-4'>
                <Skeleton.Input />
                <Skeleton.Input />
                <Skeleton.Input />
                <Skeleton.Input />
                <Skeleton.Input />
                <Skeleton.Input />
                <Skeleton.Input />
                <Skeleton.Input />
                <Skeleton.Input />
                <Skeleton.Input />
                <Skeleton.Input />
              </Skeleton.Root>
            ) : (
              <form 
                onSubmit={(event) => {
                  formBag.handleSubmit(onSubmit)(event); // Garante que o `handleSubmit` seja chamado corretamente
                }}
                className="space-y-6 flex flex-col gap-4"
              >
                <DetalhesCadastro
                  pk={dadosIniciais?.pk || ''}
                  values={{
                    pk: dadosIniciais?.pk || '',
                    createdBy: dadosIniciais?.created_by || '',
                    usuarioAtuando: dadosIniciais?.usuario_atuando || '',
                    dataCarimbo: dadosIniciais?.data_carimbo || '',
                    dueDate: dadosIniciais?.due_date || '',
                    tipoDemanda: dadosIniciais?.tipo_demanda || '',
                    perfilDemanda: dadosIniciais?.perfil_demanda || '',
                    status: dadosIniciais?.status_demanda || dadosIniciais?.status || '',
                    observacao: dadosIniciais?.observacao?.map((item) => ({
                      criadaEm: item.criada_em || '',
                      mensagem: item.mensagem || '',
                      criadaPor: item.criada_por || '',
                    })) || [],
                  }}
                />

                {/* Tarefas de Atualização */}
                <div>
                  <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <ClipboardCheck className="w-5 h-5 mr-2 text-green-500" />
                    <span>Tarefas de Atualização</span>
                  </h3>

                  <div className="space-y-4">
                    {/* Liminar (Deferimento da antecipação da tutela) */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Liminar (Deferimento da antecipação da tutela)
                        </h5>
                        <div className="flex items-center gap-2 ml-auto">
                          <Checkbox 
                            id="liminar_habilitada" 
                            checked={values.liminar_habilitada}
                            onCheckedChange={handleHabilitarLiminar}
                            disabled
                            //disabled={values.despacho_habilitado}
                          />
                          <Label htmlFor="liminar_habilitada" className="text-sm">
                            Andamento de liminar?
                          </Label>
                        </div>
                      </div>
                      
                      {values.liminar_habilitada && (
                        <div className="space-y-3 mt-2">
                          <div>
                            <Label className="block text-sm mb-1">Prazo para cumprimento da liminar</Label>
                            <div className="flex items-center gap-3">
                              <Input
                                type="text"
                                placeholder="Prazo"
                                className="w-24 p-2 border rounded-md text-sm"
                                {...formBag.register('prazo_liminar')} 
                                onChange={handlePrazoLiminarChange}
                              />
                              <div className="flex items-center gap-2">
                                <span className={`text-xs ${values.prazo_tipo === 'dias_corridos' ? 'text-gray-500' : 'text-blue-600 font-medium'}`}>
                                  horas corridas
                                </span>
                                <div
                                  className={`relative inline-block w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${
                                    values.prazo_tipo === 'dias_corridos' ? 'bg-blue-500' : 'bg-gray-300'
                                  }`}
                                  onClick={handlePrazoTipoChange}>
                                  <span
                                    className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                                      values.prazo_tipo === 'dias_corridos' ? 'transform translate-x-5' : ''
                                    }`}
                                  />
                                  <Input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={values.prazo_tipo === 'dias_corridos'}
                                    onChange={handlePrazoTipoChange}
                                  />
                                </div>
                                <span className={`text-xs ${values.prazo_tipo === 'dias_corridos' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                                  dias corridos
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="block text-sm mb-1">Conteúdo da liminar</Label>
                            <Textarea 
                              id="conteudo_liminar" 
                              {...formBag.register('conteudo_liminar')} 
                              rows={3} 
                              placeholder="Transcrição da liminar deferida"
                              className="bg-white dark:bg-black" 
                              disabled
                              //disabled={values.despacho_habilitado}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Contestação */}
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Contestação
                        </h5>
                        <div className="flex items-center gap-2 ml-auto">
                          <Checkbox 
                            id="contestacao_habilitada" 
                            checked={values.contestacao_habilitada}
                            onCheckedChange={handleHabilitarContestacao}
                            disabled
                            //disabled={values.despacho_habilitado}
                          />
                          <Label htmlFor="contestacao_habilitada" className="text-sm">
                            Andamento de contestação?
                          </Label>
                        </div>
                      </div>                      
                    </div>
                    
                    {/* Audiência */}
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Audiência
                        </h5>
                        <div className="flex items-center gap-2 ml-auto">
                          <Checkbox 
                            id="audiencia_habilitada" 
                            checked={values.audiencia_habilitada}
                            onCheckedChange={handleHabilitarAudiencia}
                            disabled
                            //disabled={values.despacho_habilitado}
                          />
                          <Label htmlFor="audiencia_habilitada" className="text-sm">
                            Andamento de audiência?
                          </Label>
                        </div>
                      </div>
                      
                      {values.audiencia_habilitada && (
                        <div className="space-y-3 mt-2">
                          <FieldMessage.Error.Root>
                            <div className="space-y-2">
                              <Label htmlFor="data_audiencia">Data e hora</Label>
                              <div className="group flex gap-2 items-center">
                                <DateTimePicker
                                  date={values.data_audiencia ? new Date(values.data_audiencia) : undefined}
                                  onSelect={handleDataAudienciaChange}
                                  //disabled={values.despacho_habilitado}
                                  disabled
                                />
                                <X 
                                  className={`w-4 h-4 cursor-pointer text-gray-400 hover:text-red-500 ${values.despacho_habilitado ? 'opacity-50 pointer-events-none' : ''}`} 
                                />
                              </div>
                            </div>
                            <FieldMessage.Error.Text>
                              {formBag.formState.errors.data_audiencia?.message}
                            </FieldMessage.Error.Text>
                          </FieldMessage.Error.Root>
                        </div>
                      )}
                    </div>
                    
                    {/* Sentença */}
                    <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Sentença
                        </h5>
                        <div className="flex items-center gap-2 ml-auto">
                          <Checkbox 
                            id="sentenca_habilitada" 
                            checked={values.sentenca_habilitada}
                            onCheckedChange={(checked) => {
                              formBag.setValue('sentenca_habilitada', !!checked)
                              if (!checked) {
                                formBag.setValue('conteudo_sentenca', '')
                              }
                            }}
                            disabled
                            //disabled={values.despacho_habilitado}
                          />
                          <Label htmlFor="sentenca_habilitada" className="text-sm">
                            Andamento de sentença?
                          </Label>
                        </div>
                      </div>
                      
                      {values.sentenca_habilitada && (
                        <div className="space-y-3 mt-2">
                          <div>
                            <Label className="block text-sm mb-1">Conteúdo da sentença</Label>
                            <Textarea 
                              id="conteudo_sentenca" 
                              {...formBag.register('conteudo_sentenca')} 
                              rows={3} 
                              placeholder="Transcrição da sentença"
                              className="bg-white dark:bg-black" 
                              disabled
                              //disabled={values.despacho_habilitado}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Despacho */}
                    <div className="bg-gray-50 dark:bg-gray-800/30 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Despacho
                        </h5>
                        <div className="flex items-center gap-2 ml-auto">
                          <Checkbox 
                            id="despacho_habilitado" 
                            checked={values.despacho_habilitado}
                            onCheckedChange={handleHabilitarDespacho}
                            disabled
                          />
                          <Label htmlFor="despacho_habilitado" className="text-sm">
                            Andamento de despacho?
                          </Label>
                        </div>
                      </div>
                      
                      {values.despacho_habilitado && (
                        <div className="space-y-3 mt-2">
                          <div>
                            <Label className="block text-sm mb-1">Conteúdo do despacho</Label>
                            <Textarea 
                              id="despacho_conteudo" 
                              {...formBag.register('despacho_conteudo')} 
                              rows={3} 
                              placeholder="Transcrição do despacho"
                              className="bg-white dark:bg-black" 
                              disabled
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {
                  isUploadLimitReached ? (
                    <span className='text-sm text-orange-500 dark:text-yellow-600 bg-zinc-100 dark:bg-zinc-900 rounded p-2'>
                      Aviso: Limite total de 20MB de arquivos atingido.
                    </span>
                  ) : null
                }

                <div className="flex justify-center space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isLoadingForm} 
                    onClick={handleClickSair}
                  >
                    { isDesvinculandoUsuario ? 'Saindo...' : 'Sair' }
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isJustificandoEnvio} 
                    onClick={() => handleClickEnviarDemandaEsteiraOito()}
                  >
                    { isJustificandoEnvio ? 'Enviando...' : 'Enviar para esteira oito' }
                  </Button>
                </div>
              </form>
            )
          }
        </CardContent>
      </Card>

      <Dialog
        open={dialogEnviarDesdobramentoOpen}
        onOpenChange={setDialogEnviarDesdobramentoOpen}
      >
        <DialogContent 
          aria-describedby='dialog-enviar-desdobramento'
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Desdobramento</DialogTitle>
          </DialogHeader>

          <span>
            Tem certeza que deseja alterar o número do processo? Os dados preenchidos serão salvos e enviados.
          </span>

          <DialogFooter>
            <Button 
              type="button" 
              variant='outline'
              onClick={() => setDialogEnviarDesdobramentoOpen(false)}
            >
              Cancelar
            </Button>

            <Button 
              type="button" 
              disabled={isEnviandoDesdobramento}
              onClick={handleConfirmaEnviarDesdobramento}
            >
              { isEnviandoDesdobramento ? 'Alterando...' : 'Alterar' }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogObservacaoOpen}
        onOpenChange={setDialogObservacaoOpen}
      >
        <DialogContent 
          aria-describedby='dialog-observacao'
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Adicionar observação</DialogTitle>
          </DialogHeader>

          <FieldMessage.Error.Root>  
            <Textarea 
              id="observacao" 
              rows={6} 
              className="bg-white dark:bg-black"
              onChange={(event) => updateDialogObservacaoInfo({ 
                observacao: {
                  value: event.target.value,
                  isValid: event.target.value.length >= 10,
                }
              })}
              value={dialogObservacaoInfo.observacao.value} 
            />
            <FieldMessage.Error.Text   
              visible={!dialogObservacaoInfo.observacao.isValid}
            >
              A observacao deve conter no mínimo 10 caracteres
            </FieldMessage.Error.Text>
          </FieldMessage.Error.Root >

          <DialogFooter>
            <Button 
                type="button" 
              onClick={() => setDialogObservacaoOpen(false)}
            >
              Cancelar
            </Button>

            <Button 
              type="button" 
              disabled={!dialogObservacaoInfo.observacao.isValid}
              onClick={handleClickConfirmaAdicionaObservacao}
            >
              { isAddingObsForm ? 'Adicionando...' : 'Adicionar' }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogJustificarEnvioOpen}
        onOpenChange={setDialogJustificarEnvioOpen}
      >
        <DialogContent 
          aria-describedby='dialog-justificar-envio'
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>{ justificarEnvioDialogInfo.title.text }</DialogTitle>
          </DialogHeader>

          <FieldMessage.Error.Root>  
            <Textarea 
              id="justificar-envio" 
              rows={6} 
              className="bg-white dark:bg-black"
              onChange={(event) => updateDialogJustificarEnvioInfo({ 
                justificativa: {
                  value: event.target.value,
                  isValid: true,
                }
              })}
              value={justificarEnvioDialogInfo.justificativa.value} 
            />
            <FieldMessage.Error.Text   
              visible={!justificarEnvioDialogInfo.justificativa.isValid}
            >
              A justificativa deve conter no mínimo 10 caracteres
            </FieldMessage.Error.Text>
          </FieldMessage.Error.Root >

          <DialogFooter>
            <Button 
              type="button"
              variant='outline'
              onClick={handleClickCloseJustificarEnvioDialog}
            >
              Fechar
            </Button>

            <Button 
              type="button"
              variant='default'
              disabled={!justificarEnvioDialogInfo.justificativa.isValid}
              onClick={() => handleClickConfirmaJustificarEnvio(justificarEnvioDialogInfo)}
            >
              { isJustificandoEnvio ? 'Submetendo...' : 'Submeter' }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogConfirmarDespachoOpen}
        onOpenChange={setDialogConfirmarDespachoOpen}
      >
        <DialogContent 
          aria-describedby='dialog-confirmar-despacho'
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Confirmar uso exclusivo do despacho</DialogTitle>
          </DialogHeader>

          <div className="text-sm">
            <p>Atenção! Ao habilitar o andamento de despacho, todos os outros campos serão <strong>limpos e desabilitados</strong>.</p>
            <p className="mt-2 font-medium">O andamento de despacho só pode ser utilizado quando nenhum outro campo estiver preenchido.</p>
            <p className="mt-2">Tem certeza que deseja prosseguir?</p>
          </div>

          <DialogFooter>
            <Button 
              type="button"
              variant='outline'
              onClick={() => setDialogConfirmarDespachoOpen(false)}
            >
              Cancelar
            </Button>

            <Button 
              type="button"
              variant='default'
              onClick={handleConfirmacaoDespacho}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}