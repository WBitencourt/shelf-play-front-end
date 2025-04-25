'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from 'uuid';
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useShallow } from "zustand/shallow";
import { useResourcesStore } from "@/zustand-store/resources";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Backdrop from "@/components/Backdrop";
import { Upload } from "@/components/Upload2.0";
import * as Icon from '@phosphor-icons/react';
import { PDFViewer } from "@/components/PDFViewer";
import { FileItem, UpdateFile, UploadRootHandles } from "@/components/Upload2.0/contexts";
import { toast } from "@/utils/toast";
import { Skeleton } from "@/components/Skeleton2.0";
import { useAuthStore } from "@/zustand-store/auth.store";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "@/components/FieldMessage";
import { util } from "@/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { maskNumeroProcesso } from "@/utils/Masks";
import { fileHelper } from "@/utils/File";
import { aprovarDemanda, reprovarDemanda } from "@/actions/backend-for-front-end/auditoria";
import { ArquivoDemanda } from "@/actions/bff/interface";
import { getDadosCliente as getDadosClienteAction } from "@/actions/backend-for-front-end/cliente";
import { picklist } from "../picklists";

import {
  DadosTipificacao,
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
  TipoJustificativaInfo,
} from "../interfaces";

import {
  adicionaObservacaoDemanda,
  desbloqueiaUsuarioDemanda,
  enviarDemandaExcecaoOito,
} from "@/actions/backend-for-front-end/demanda";
import { DetalhesCadastro } from "@/components/Forms/util/Components/DetalhesCadastro";

export interface FormTipificacaoSumUpConsultaDemandasParams {
  id: string;
  esteira: string;
  esteiraTipo: string;
  dadosIniciais: DadosTipificacao;
}

interface FormTipificacaoSumUpConsultaDemandasProps {
  params: FormTipificacaoSumUpConsultaDemandasParams;
}

interface OnClickJustificarEnvio {
  tipo: TipoJustificativaInfo;
  title: string;
}

interface DadosClienteForm {
  tiposDemanda: string[];
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

export function FormTipificacaoSumUpConsultaDemandas({ params }: FormTipificacaoSumUpConsultaDemandasProps) {
  const pk = params.id;
  const esteira = params.esteira;
  const esteiraTipo = params.esteiraTipo;
  const dadosIniciais = params.dadosIniciais;

  const router = useRouter();
  const searchParams = useSearchParams()

  

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

  const formBag = useForm<DadosTipificacao>();

  const values = formBag.watch();

  const [urlPdfViewer, setUrlPdfViewer] = useState<string>('');
  const [uploadList, setInitialUploadList] = useState<FormFile[]>([]);

  const [dadosCliente, setDadosCliente] = useState<DadosClienteForm>({
    tiposDemanda: [],
  });

  const [dialogObservacaoInfo, setDialogObservacaoInfo] = useState<ObservacaoInfo>({
    observacao: {
      value: '',
      isValid: false,
    }
  })

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

  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isLoadingFileViewer, setIsLoadingFileViewer] = useState(false);
  const [isOpenUploadList, setIsOpenUploadList] = useState<boolean>(false);
  const [isAddingObsForm, setIsAddingObsForm] = useState(false);
  const [isEnviandoExcecao, setIsEnviandoExcecao] = useState(false);
  const [isDesvinculandoUsuario, setIsDesvinculandoUsuario] = useState(false);
  const [isUploadLimitReached, setIsUploadLimitReached] = useState(false);
  const [isAprovandoForm, setIsAprovandoForm] = useState(false);
  const [isReprovandoForm, setIsReprovandoForm] = useState(false);
  const [isJustificandoEnvio, setIsJustificandoEnvio] = useState(false);

  const [dialogObservacaoOpen, setDialogObservacaoOpen] = useState(false);
  const [dialogJustificarEnvioOpen, setDialogJustificarEnvioOpen] = useState(false);

  const dateNow = useMemo(() => new Date(), []);

  const formatFormValues = useCallback((values: Partial<DadosTipificacao>) => {
    const formattedValues = {
      ...values,
    } as DadosTipificacao;

    formattedValues.tipo_demanda = values.tipo_demanda ?? '';
    formattedValues.processo = values.processo ?? '';
    formattedValues.identificacao = values.identificacao ?? '';

    return formattedValues;
  }, []);

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

  const updateDadosCliente = (newDados: Partial<DadosClienteForm>) => {
    if (!newDados) {
      return;
    }

    setDadosCliente((prevState) => {
      if (!prevState) {
        return {
          timeOut: 5,
          tiposDemanda: [],
        }
      }

      return {
        ...prevState,
        ...newDados,
        tiposDemanda: newDados.tiposDemanda?.sort((a: string, b: string) => a.localeCompare(b)) ?? [],
      }
    });
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
  title: 'Erro',
  description: error?.message,
});
    }
  }

  const carregarArquivosDemanda = useCallback(async (files: ArquivoDemanda[] | undefined) => {
    try {
      const uploadList: FormFile[] = await Promise.all(
        files?.map(async (file, index) => {
          try {
            const urlFile = await arquivo.getFileUrlFromS3({
              s3Key: file.s3key,
              s3Bucket: file.s3Bucket,
            });
  
            return {
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
          } catch (error: any) {
            return {
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
          }
        }) || []
      );

      //console.log('Lista de arquivos carregados:', uploadList);

      const firstItemUploadConfigList = uploadList.find((item) => !!item.info.url);

      setInitialUploadList(uploadList);
      setUrlPdfViewer(firstItemUploadConfigList?.info.url ?? '');

      const totalFilesSizeInBytes = uploadList.reduce((acc, file) => acc + fileHelper.convertToBytes({
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
  description: 'Aviso: Limite total de 20MB de arquivos atingido.',
});
      }
    } catch (error) {
      toast.error({
  title: 'Erro',
  description: 'Falha ao carregar o arquivo. Por favor, tente novamente.',
});
    } finally {
      setIsLoadingFileViewer(false);
    }
  }, []);

  const updateFormValues = useCallback((newValues: Partial<DadosTipificacao>) => {
    try {
      //console.log('Dados recebidos para atualizar o formulário:', newValues);

      const oldValues = formBag.getValues();

      const formattedValues = formatFormValues({
        ...oldValues,
        ...newValues,
      });

      formBag.reset(formattedValues);

    } catch (error: any) {
      toast.error({
  title: 'Erro',
  description: 'Falha ao atualizar os dados do formulário',
});
    } 
  }, [formatFormValues]);

  const loadPage = () => {
    router.push(`/${esteira}/${esteiraTipo}/demanda/${pk}`);
  };

  const desbloqueiaDemanda = async () => {
    try {
      await desbloqueiaUsuarioDemanda({
        pk,
      })
    } catch(error: any) {
      throw new Error(error?.message);
    }
  }

  const pushBack = () => {
    const urlQuery = searchParams.toString() ?? '';

    router.push(`/${esteira}/${esteiraTipo}?${urlQuery}`);
  }

  const onSubmit = async (dados: DadosTipificacao) => {
    try {
      setIsAprovandoForm(true);

      if (!user?.email) {
        throw new Error('E-mail do usuário não carregado na autenticação corretamente'); 
      }

      const response = await aprovarDemanda({ pk, dados });

      util.actions.checkHaveError(response?.data);

      toast.success({
  title: 'Sucesso',
  description: 'Formulário aprovado com sucesso.',
});

      pushBack();
    } catch (error: any) {
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    } finally { 
      setIsAprovandoForm(false);
    }
  };

  const reprovar = async () => {
    try {
      setIsReprovandoForm(true);

      const response = await reprovarDemanda({ 
        pk, 
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
      });

      util.actions.checkHaveError(response?.data);

      toast.success({
  title: 'Sucesso',
  description: 'Formulário reprovado com sucesso.',
});
    } catch (error: any) {
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    } finally { 
      setIsReprovandoForm(false);
    }
  };

  const enviarExcecaoOito = async () => {
    try {
      setIsEnviandoExcecao(true);

      if (!user?.email) {
        throw new Error('E-mail do usuário não carregado na autenticação corretamente'); 
      }

      const response = await enviarDemandaExcecaoOito({
        pk, 
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
      });

      util.actions.checkHaveError(response?.data);

      toast.success({
  title: 'Sucesso',
  description: 'Formulário enviado com sucesso.',
});
    } catch (error: any) {
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    } finally {
      setIsEnviandoExcecao(false);
    }
  }

  const handleClickFile = (file: FormFile) => {
    setUrlPdfViewer(file.info.url);
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
  description: 'Aviso: Limite total de 20MB de arquivos atingido.',
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
    } catch (error: any) {
      processUploadError({
        file,
        updateFile,
        message: error?.message
      })
      toast.error({
  title: 'Erro',
  description: 'Falha ao enviar o arquivo. Por favor, tente novamente.',
});
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

      setUrlPdfViewer('');
    } catch (error: any) {
      toast.error({
  title: 'Erro',
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
  title: 'Sucesso',
  description: 'Observação adicionada com sucesso.',
});
    } catch (error: any) { 
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    } finally {
      setIsAddingObsForm(false);
    }
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
  title: 'Erro',
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

      pushBack();
    } catch (error: any) {
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    }
  }

  const handleClickReprovar = async () => {
    setDialogJustificarEnvioOpen(true);

    updateDialogJustificarEnvioInfo({
      tipo: 'reprovar-demanda',
      title: {
        text: 'Justificar reprovação',
      },
    });
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
        case 'enviar-excecao-oito':
          await enviarExcecaoOito();
          break;

        case 'reprovar-demanda':
          await reprovar();
          break;
          
        default:
          break;
      }

      pushBack();
    } catch (error: any) {
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    } finally {
      setIsJustificandoEnvio(false);
    }
  }

  const handleClickJustificarEnvio = ({ title, tipo }: OnClickJustificarEnvio) => {
    updateDialogJustificarEnvioInfo({
      tipo,
      title: {
        text: title,
      }
    })

    setDialogJustificarEnvioOpen(true);
  }

  const atualizaFormDadosIniciais = useCallback(async () => {
    try {
      setIsLoadingForm(true);

      if (!dadosIniciais) {
        return
      }

      const dadosCliente = await getDadosCliente();

      updateDadosCliente({
        tiposDemanda: dadosCliente?.tipo_demanda,
      });

      updateFormValues(dadosIniciais);

      carregarArquivosDemanda(dadosIniciais?.arquivos);
    } catch (error: any) {
      toast.error({
        title: 'Erro',
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
              <Upload.Bag
                ref={uploadRef}
                visible
                initialList={uploadList}
                onProcessUpload={async (file, updateFile) => {
                  handleProcessUpload({ file, updateFile })
                }}
              >
                {
                  ({ list, uploadFiles, removeFile, retryUpload, updateFile }) => {
                    return (
                      <Upload.Root
                        data-open={isOpenUploadList}
                        className="data-[open=true]:h-1/2"
                      >
                        <Upload.Drop.Root>
                          <Upload.Drop.Dropzone
                            maxSizeFile='30MB'
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
                                </Upload.Drop.Drag.Root>
                              )
                            }}
                          </Upload.Drop.Dropzone>

                          <Upload.Drop.Info.TooltipIcon />
                        </Upload.Drop.Root>

                        <Upload.List.ToggleOpen
                          show={isOpenUploadList}
                          onClick={(open) => setIsOpenUploadList(open)}
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
                                      selected={urlPdfViewer.length > 0 && urlPdfViewer === file.info.url}
                                      onClick={() => handleClickFile(file)}
                                    >
                                      {
                                        urlPdfViewer.length > 0 && urlPdfViewer === file.info.url ?
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
{/* 
                                    <Upload.List.Row.Preview.Root>
                                      <Icon.FileText
                                        className='self-center text-3xl text-black dark:text-white'
                                        weight='thin'
                                      />
                                    </Upload.List.Row.Preview.Root> */}

                                    {/* <Upload.List.Row.Description>
                                      Upload por: { file.info.uploadedBy }
                                      <br />
                                      Em: { moment(file.info.uploadedAt).locale('pt-br').format('DD/MM/YYYY HH:mm')}
                                    </Upload.List.Row.Description> */}

                                    {/* <Upload.List.Row.Size>
                                      { file.info.sizeFormatted }
                                    </Upload.List.Row.Size> */}

                                    {
                                      <Upload.List.Row.Remove
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
                data-open={isOpenUploadList}
                className="data-[open=true]:h-1/2"
                source={urlPdfViewer}
              />
            </div>
          )
        }
      </Card>

      <Card className="flex flex-col w-1/2 gap-4 py-4 h-full overflow-y-auto">
        <CardContent className="flex flex-col gap-4 h-full">

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
                className="space-y-6 flex flex-col gap-2"
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

                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select 
                    {...formBag.register('cliente')} 
                    disabled
                    value={values.cliente}
                    onValueChange={(value) => formBag.setValue('cliente', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {picklist.clientes.map((nome) => (
                        <SelectItem key={nome} value={nome}>
                          {nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_demanda">Tipo da demanda</Label>
                  <Select 
                    {...formBag.register('tipo_demanda')} 
                    value={values.tipo_demanda}
                    onValueChange={(value) => formBag.setValue('tipo_demanda', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo da demanda" />
                    </SelectTrigger>
                    <SelectContent>
                      {dadosCliente.tiposDemanda.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="processo">Número do processo</Label>
                  <Input 
                    id="processo" 
                    disabled
                    {...formBag.register('processo')} 
                    placeholder="...número do processo..." 
                    onChange={(e) => formBag.setValue('processo', maskNumeroProcesso(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identificacao">Identificação</Label>
                  <Input 
                    id="identificacao" 
                    disabled
                    {...formBag.register('identificacao')} 
                    placeholder="...identificação..." 
                  />
                </div>

                {
                  isUploadLimitReached ? (
                    <span className='text-sm text-orange-500 dark:text-yellow-600 bg-zinc-200 dark:bg-zinc-900 rounded p-2'>
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
                    { isDesvinculandoUsuario ? 'Desvinculando...' : 'Desvincular usuário' }
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isEnviandoExcecao} 
                    onClick={() => handleClickJustificarEnvio({
                      title: 'Justificar envio para exceção oito',
                      tipo: 'enviar-excecao-oito',
                    })}
                  >
                    { isEnviandoExcecao ? 'Enviando...' : 'Enviar para exceção oito' }
                  </Button>
                </div>

      
              </form>
            )
          }
        </CardContent>
      </Card>

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
              onClick={() => setDialogObservacaoOpen(false)}
            >
              Cancelar
            </Button>

            <Button 
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
              variant='outline'
              onClick={handleClickCloseJustificarEnvioDialog}
            >
              Fechar
            </Button>

            <Button 
              variant='default'
              disabled={!justificarEnvioDialogInfo.justificativa.isValid}
              onClick={() => handleClickConfirmaJustificarEnvio(justificarEnvioDialogInfo)}
            >
              { isJustificandoEnvio ? 'Submetendo...' : 'Submeter' }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}