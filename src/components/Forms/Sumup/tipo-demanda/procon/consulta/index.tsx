'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useShallow } from 'zustand/shallow';
import { useResourcesStore } from '@/zustand-store/resources';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload } from '@/components/Upload2.0';
import * as Icon from '@phosphor-icons/react';
import { PDFViewer } from '@/components/PDFViewer';
import { FileItem, UpdateFile, UploadRootHandles } from '@/components/Upload2.0/contexts';
import Countdown from '@/components/Countdown';
import { Skeleton } from '@/components/Skeleton2.0';
import { Textarea } from '@/components/ui/textarea';
import { FieldMessage } from '@/components/FieldMessage';
import { fileHelper } from '@/utils/File';
import { toast } from '@/utils/toast';

import { ArquivoDemanda } from '@/actionsV2/backend/interface';
import { DetalhesCadastro } from '@/components/Forms/util/Components/DetalhesCadastro';
import { actions } from '@/actionsV2'

import {
  DadosDemandaProcon,
  OnUploadErrorProps,
  FormFile,
  OnDropAccepted,
  OnDropRejected,
  OnProcessUpdateProps,
  ProcessUploadErrorProps,
  OnUploadProgressProps,
  HandleClickDeleteFileProps,
  HandleClickRetryUploadProps,
  JustificativaInfo,
} from '../../interfaces';

import { DetalhesProcon } from './Procon';
import { Regiao } from './Regiao';
import { DetalhesAutor } from './DetalhesAutor';
import { DetalhesReu } from './DetalhesReu';
import { CausaRaiz } from './CausaRaiz';
import { Pedidos } from './Pedidos';

interface CadastroJuridicoReturnParams {
  id: string;
  esteira: string;
  esteiraTipo: string;
  dadosIniciais: DadosDemandaProcon;
}

interface FormProconSumUpConsultaDemandasProps {
  params: CadastroJuridicoReturnParams;
}

interface DadosClienteForm {
  timeOut: number;
}

interface HandleClickFileParams {
  file: FormFile;
  updateFile: UpdateFile<FormFile>
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
};

export function FormProconSumUpConsultaDemandas({ params }: FormProconSumUpConsultaDemandasProps) {
  const pk = params.id;
  const esteira = params.esteira;
  const esteiraTipo = params.esteiraTipo;
  const dadosIniciais = params.dadosIniciais;

  const router = useRouter();

  const { arquivo } = useResourcesStore(
    useShallow((state) => ({
      arquivo: state.arquivo,
    }))
  );

  const uploadRef = useRef<UploadRootHandles<FormFile>>(null);

  const formBag = useForm<DadosDemandaProcon>({
    defaultValues: {
      observacao: [],
      tipificacao: '',
      uf: '',
      cidade: '',
      identificacao: '',
      objeto: '',
      resumo_processo: '',
      causa_raiz: '',
      sub_causa_raiz: '',
      lista_autores: [],
      lista_reus: [],
      data_audiencia: '',
      data_defesa: '',
      data_reclamacao: '',
    },
  });

  const [fileViewer, setFileViewer] = useState({
    url: '',
  });

  const [initialUploadList, setInitialUploadList] = useState<FormFile[]>([]);

  const [justificarEnvioDialogInfo, setJustificarEnvioDialogInfo] = useState<JustificativaInfo>({
    tipo: '',
    title: {
      text: 'Justificar envio',
    },
    justificativa: {
      value: '',
      isValid: true,
    },
  });

  const [dadosCliente, setDadosCliente] = useState<DadosClienteForm>({
    timeOut: 5,
  });

  const [isLoadingForm, setIsLoadingForm] = useState(true);
  const [isLoadingFileViewer, setIsLoadingFileViewer] = useState(true);
  const [isOpenInitialUploadList, setIsOpenInitialUploadList] = useState<boolean>(false);
  const [isPausedCountDown, setIsPausedCountDown] = useState<boolean>(false);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [isUploadLimitReached, setIsUploadLimitReached] = useState(false);
  const [isDesvinculandoUsuario, setIsDesvinculandoUsuario] = useState(false);
  const [isJustificandoEnvio, setIsJustificandoEnvio] = useState(false);
  const [isLoadingFileUrl, setIsLoadingFileUrl] = useState(false);

  const [dialogJustificarEnvioOpen, setDialogJustificarEnvioOpen] = useState(false);

  const dateNow = useMemo(() => new Date(), []);

  const formatFormValues = useCallback((values: Partial<DadosDemandaProcon>) => {
    const formattedValues = {
      ...values,
    } as DadosDemandaProcon;

    formattedValues.lista_autores = values?.lista_autores
      ? values?.lista_autores.map((item) => {
          return {
            id: item.id ?? uuid(),
            nome: item.nome,
            documento: item.documento,
            email: item.email,
            telefone: item.telefone,
          };
        })
      : [];

    formattedValues.lista_reus = values?.lista_reus
      ? values?.lista_reus.map((item) => {
          return {
            id: item.id ?? uuid(),
            nome: item.nome,
            documento: item.documento,
          };
        })
      : [];

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
        };
      }

      return {
        ...prevState,
        ...newDados,
        timeOut: newDados.timeOut ?? 5,
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

  const updateFormValues = useCallback(
    (newValues: Partial<DadosDemandaProcon>) => {
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
    },
    [formatFormValues, formBag.getValues, formBag.reset]
  );

  const desbloqueiaDemanda = async () => {
    try {
      await actions.backend.demanda.desbloqueiaUsuarioDemanda({ pk });
    } catch (error: any) {
      throw new Error(error?.message);
    }
  };

  const onSubmit = async (dados: DadosDemandaProcon) => {
    try {

    } catch (error: any) {
      toast.error({
        title: 'Falha ao enviar o formulário',
        description: error?.message,
      });
    }
  };

  const getDadosCliente = async () => {
    try {
      const cliente = dadosIniciais?.cliente;

      if (!cliente) {
        throw new Error('Cliente não informado corretamente.');
      }

      const dadosCliente = await actions.backend.cliente.getDadosCliente({
        cliente: cliente,
      });

      return dadosCliente;
    } catch (error: any) {
      toast.error({
        title: 'Falha ao consultar os dados do cliente',
        description: error?.message,
      });
    }
  };

  const handleClickFile = async (params: HandleClickFileParams) => {
    if (params.file.info.url.length > 0) {
      setFileViewer({
        url: params.file.info.url,
      });

      return;
    }

    setIsLoadingFileUrl(true);

    try {
      const urlFile = await arquivo.getFileUrlFromS3({
        s3Key: params.file.info.s3Key,
        s3Bucket: params.file.info.s3Bucket,
      });
  
      setFileViewer({
        url: urlFile,
      });

      params.updateFile(params.file.id, {
        newFile: {
          ...params.file,
          info: {
            ...params.file.info,
            url: urlFile,
          }
        },
      });
    } catch (error: any) {
      toast.error({
        title: 'Falha ao consultar o arquivo',
        description: error?.message,
      });
    } finally {
      setIsLoadingFileUrl(false);
    }
  };

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
      },
    };

    updateFile(file.id, {
      newFile,
    });

    return newFile;
  };

  const onUploadProgress = ({ file, event, updateFile }: OnUploadProgressProps) => {
    const progress = parseInt(Math.round((event.loaded * 100) / event.total).toString());

    const newFile: FileItem<FormFile> = {
      ...file,
      status: {
        ...file.status,
        success: undefined,
        progress,
      },
    };

    updateFile(file.id, {
      newFile,
    });
  };

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
      },
    };

    updateFile(file.id, {
      newFile,
    });
  };

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
      };
    });

    uploadFiles({
      files: newFiles,
    });
  };

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
      };
    });

    uploadFiles({
      files: newFiles,
    });
  };

  const handleProcessUpload = async ({ file, updateFile }: OnProcessUpdateProps) => {
    try {
      setIsPausedCountDown(true);

      if (file.status.success === false) {
        return onUploadError({ file });
      }

      const currentList = uploadRef.current?.list ?? [];

      const totalFilesSizeInBytes = currentList.reduce(
        (acc, file) =>
          acc +
          fileHelper.convertToBytes({
            size: file.info.size,
            unit: file.info.unit,
          }),
        0
      );

      const isFileSizeExceeded = fileHelper.isFileSizeExceeded({
        unit: 'B',
        size: totalFilesSizeInBytes,
        limit: {
          unit: 'B',
          size: fileHelper.convertToBytes({ size: 20, unit: 'MB' }),
        },
      });

      setIsUploadLimitReached(isFileSizeExceeded);

      if (isFileSizeExceeded) {
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
        onUploadProgress: (event) =>
          onUploadProgress({
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
          s3Key: submittedFile?.s3Key,
          s3Bucket: submittedFile?.s3Bucket,
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
      };

      updateFile(file.id, {
        newFile,
      });

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
          },
        ],
      });
    } catch (error: any) {
      processUploadError({
        file,
        updateFile,
        message: error?.message,
      });

      toast.error({
        title: 'Falha ao enviar o arquivo',
        description: error?.message,
      });
    } finally {
      setIsPausedCountDown(false);
    }
  };

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
        newFile: { ...file, status: { ...file.status, isDeleting: true } },
      });

      await arquivo.deleteFile({
        demandaPk: pk,
        demandaSk: file.id,
      });

      removeFile(file.id);

      setFileViewer({
        url: '',
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
        newFile: { ...file, status: { ...file.status, isDeleting: false } },
      });
    }
  };

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
      },
    });
  };

  const handleFinalCountDown = async () => {
    try {
      await saveForm();
      await desbloqueiaDemanda();

      toast.info({
        title: 'Tempo!',
        description: 'Tempo limite atingido, demanda desbloqueada',
      });

      router.push(`/${esteira}/${esteiraTipo}`);
    } catch (error: any) {
      toast.error({
        title: 'Falha ao desbloquear a demanda',
        description: error?.message,
      });
    }
  };

  const saveForm = async () => {
    try {
      setIsSavingForm(true);

      const dados = {
        ...formBag.getValues(),
      };

      console.log('Valores do formulário para salvar:', dados);

      await actions.backend.demanda.salvarDemanda({
        pk,
        dados,
      });

      toast.success({
        title: 'Salvo!',
        description: 'Formulário salvo com sucesso.',
      });
    } catch (error: any) {
      toast.error({
        title: 'Falha ao salvar o formulário',
        description: error?.message,
      });
    } finally {
      setIsSavingForm(false);
    }
  };

  const enviarExcecaoOito = async () => {
    try {
      await actions.backend.demanda.enviarDemandaExcecaoOito({
        pk,
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
      });

      toast.success({
        title: 'Enviado',
        description: 'Formulário enviado com sucesso.',
      });
    } catch (error: any) {
      toast.error({
        title: 'Falha ao enviar o formulário',
        description: error?.message,
      });
    }
  };

  const handleClickCloseJustificarEnvioDialog = () => {
    updateDialogJustificarEnvioInfo({
      justificativa: {
        value: '',
        isValid: true,
      },
    });

    setDialogJustificarEnvioOpen(false);
  };

  const handleClickConfirmaJustificarEnvio = async (info: JustificativaInfo) => {
    try {
      setIsJustificandoEnvio(true);

      const justificativa = justificarEnvioDialogInfo.justificativa.value ?? '';

      if (justificativa.length < 10) {
        updateDialogJustificarEnvioInfo({
          justificativa: {
            isValid: false,
          },
        });

        return;
      }

      switch (info.tipo) {
        case 'enviar-excecao-oito':
          await enviarExcecaoOito();
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
  };

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
  };

  const handleClickEnviarExcecao = () => {
    setDialogJustificarEnvioOpen(true);

    updateDialogJustificarEnvioInfo({
      tipo: 'enviar-excecao-oito',
      title: {
        text: 'Justificar envio para exceção oito',
      },
    });
  }

  const carregarArquivosDemanda = useCallback(async (files: ArquivoDemanda[] | undefined) => {
    try {
      setIsLoadingFileViewer(true);

      const initialUploadList = await Promise.all(
        files?.map(async (file, index) => {
          try {
            const urlFile = index === 0 ? await arquivo.getFileUrlFromS3({
              s3Key: file.s3key,
              s3Bucket: file.s3Bucket,
            }) : '';

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
            };

            return errorFile;
          }
        }) || []
      );

      if (initialUploadList.length === 0) {
        setInitialUploadList([]);

        setFileViewer({
          url: '',
        });

        return;
      }

      setInitialUploadList(initialUploadList);

      const firstItemUploadConfigList = initialUploadList.find((item) => item.info.url.length > 0);

      setFileViewer({
        url: firstItemUploadConfigList?.info.url ?? '',
      });

      const totalFilesSizeInBytes = initialUploadList.reduce(
        (acc, file) =>
          acc +
          fileHelper.convertToBytes({
            size: file.info.size,
            unit: file.info.unit,
          }),
        0
      );

      const isFileSizeExceeded = fileHelper.isFileSizeExceeded({
        unit: 'B',
        size: totalFilesSizeInBytes,
        limit: {
          unit: 'B',
          size: fileHelper.convertToBytes({ size: 20, unit: 'MB' }),
        },
      });

      setIsUploadLimitReached(isFileSizeExceeded);

      if (isFileSizeExceeded) {
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

  const atualizaFormDadosIniciais = useCallback(async () => {
    try {
      setIsLoadingForm(true);

      console.log('Dados recebidos:', dadosIniciais);

      if (!dadosIniciais) {
        return;
      }

      const dadosCliente = await getDadosCliente();

      updateDadosCliente({
        timeOut: dadosCliente?.time_out?.['Procon'],
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

  console.log('RENDER FORM PRINCIPAL');

  return (
    <div className="flex w-full h-full gap-4">
      <Card
        style={{ maxHeight: 'calc(100vh - 136px)' }}
        className="sticky top-[72px] w-1/2 gap-4 p-2 rounded bg-zinc-100 dark:bg-zinc-800">
        {isLoadingFileViewer ? (
          <Skeleton.Root className="w-full h-full">
            <Skeleton.Custom className="w-full h-full" />
          </Skeleton.Root>
        ) : (
          <div className="flex flex-col w-full h-full gap-2">
            {isUploadLimitReached ? (
              <span className="text-xs text-orange-500 dark:text-yellow-600 bg-zinc-200 dark:bg-zinc-900 rounded p-2">
                Aviso: Limite total de 20MB de arquivos atingido.
              </span>
            ) : null}

            <Upload.Bag
              ref={uploadRef}
              visible
              initialList={initialUploadList}
              onProcessUpload={async (file, updateFile) => {
                handleProcessUpload({ file, updateFile });
              }}>
              {({ list, uploadFiles, removeFile, retryUpload, updateFile }) => {
                return (
                  <Upload.Root data-open={isOpenInitialUploadList} className="data-[open=true]:h-1/2">
                    <Upload.Drop.Root>
                      <Upload.Drop.Dropzone
                        maxSizeFile="20MB"
                        maxFiles={undefined}
                        onDropAccepted={(event, files) => {
                          handleOnDropAccepted({ files, uploadFiles });
                        }}
                        onDropRejected={(event, files) => {
                          handleOnDropRejected({ files, uploadFiles });
                        }}
                        filesAccept={{
                          'application/pdf': ['.pdf'],
                          'text/plain': ['.txt'],
                        }}>
                        {(dropzoneBag) => {
                          return (
                            <Upload.Drop.Drag.Root>
                              <Upload.Drop.Drag.View dropzoneBag={dropzoneBag} />
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
                          );
                        }}
                      </Upload.Drop.Dropzone>

                      <Upload.Drop.Info.TooltipIcon />
                    </Upload.Drop.Root>

                    <Upload.List.ToggleOpen
                      show={isOpenInitialUploadList}
                      onClick={(open) => setIsOpenInitialUploadList(open)}>
                      <Upload.List.Root className="min-h-[130px]">
                        {list
                          .sort((a, b) => sortListFiles(a, b))
                          .map((file) => {
                            return (
                              <Upload.List.Row.Root
                                key={file.id}
                                className="cursor-pointer"
                                onClick={() => handleClickFile({ file, updateFile })}>
                                <Upload.List.Row.Name
                                  tooltip={file.info.name}
                                  selected={fileViewer.url.length > 0 && fileViewer.url === file.info.url}
                                >
                                  {fileViewer.url.length > 0 && fileViewer.url === file.info.url ? (
                                    <div className="flex items-center gap-1">
                                      <Icon.CaretCircleRight className="flex-shrink-0 text-blue-500" weight="fill" />

                                      {file.info.name}
                                    </div>
                                  ) : (
                                    file.info.name
                                  )}
                                </Upload.List.Row.Name>

                                <Upload.List.Row.Action.Root>
                                  {file.allow.download && (
                                    <Upload.List.Row.Action.Download fileName={file.info.name} url={file.info.url} />
                                  )}

                                  {file.allow.link && <Upload.List.Row.Action.Link url={file.info.url} />}

                                  {file.status.success === undefined ? (
                                    <Upload.List.Row.Action.Status.Pending progress={file.status.progress} />
                                  ) : file.status.success ? (
                                    <Upload.List.Row.Action.Status.Success tooltip={file.status.message} />
                                  ) : (
                                    <>
                                      {file.allow.retryUpload && (
                                        <Upload.List.Row.Action.Retry
                                          onClick={() => {
                                            handleClickRetryUpload({
                                              file,
                                              retryUpload,
                                            });
                                          }}
                                        />
                                      )}

                                      <Upload.List.Row.Action.Status.Failure tooltip={file.status.message} />
                                    </>
                                  )}
                                </Upload.List.Row.Action.Root>

                                <Upload.List.Row.Size className="flex items-center justify-center">
                                  {file.info.sizeFormatted}
                                </Upload.List.Row.Size>

                                {
                                  <Upload.List.Row.Remove
                                    disabled={!file.allow.delete || file.status.isDeleting}
                                    onClick={() => {
                                      handleClickDeleteFile({
                                        file,
                                        removeFile,
                                        updateFile,
                                      });
                                    }}>
                                    {file.status.isDeleting ? (
                                      <Icon.CircleNotch className="animate-spin text-red-500 text-sm" weight="bold" />
                                    ) : (
                                      <span>Remover</span>
                                    )}
                                  </Upload.List.Row.Remove>
                                }
                              </Upload.List.Row.Root>
                            );
                          })}
                      </Upload.List.Root>
                    </Upload.List.ToggleOpen>
                  </Upload.Root>
                );
              }}
            </Upload.Bag>

            {
              isLoadingFileUrl ? (
                <Skeleton.Root className="w-full h-full">
                  <Skeleton.Custom className="w-full h-full" />
                </Skeleton.Root>
              ) : (
                <PDFViewer 
                  data-open={isOpenInitialUploadList} 
                  className="data-[open=true]:h-1/2" 
                  source={fileViewer.url} 
                />
              )
            }
          </div>
        )}
      </Card>

      <Card className="flex flex-col w-1/2 gap-4 py-4 h-full overflow-y-auto">
        <CardContent className="flex flex-col gap-4 h-full">
          <Countdown
            label="Tempo restante para preenchimento:"
            paused={isPausedCountDown}
            time={{
              now: dateNow.toISOString(),
              start: dateNow.toISOString(),
              deadline: moment(dateNow).add(dadosCliente.timeOut, 'minutes').toISOString(),
            }}
            onFinalCountdown={handleFinalCountDown}
          />

          {isLoadingForm ? (
            <Skeleton.Root className="flex flex-col gap-4">
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
            <div className="flex flex-col gap-4">
              <form
                onSubmit={(event) => {
                  formBag.handleSubmit(onSubmit)(event);
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

                <Regiao formBag={formBag} />

                <DetalhesProcon formBag={formBag} />

                <DetalhesAutor formBag={formBag} />
                
                <DetalhesReu formBag={formBag} />
                
                <Pedidos formBag={formBag} />
                
                <CausaRaiz formBag={formBag} />

                {isUploadLimitReached ? (
                  <span className="text-sm text-orange-500 dark:text-yellow-600 bg-zinc-200 dark:bg-zinc-900 rounded p-2">
                    Aviso: Limite total de 20MB de arquivos atingido.
                  </span>
                ) : null}

                <div className="flex justify-center space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isDesvinculandoUsuario} 
                    onClick={handleClickSair}
                  >
                    { isDesvinculandoUsuario ? 'Desvinculando...' : 'Desvincular usuário' }
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isJustificandoEnvio}
                    onClick={handleClickEnviarExcecao}>
                    {isJustificandoEnvio ? 'Enviando...' : 'Enviar para exceção oito'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogJustificarEnvioOpen} onOpenChange={setDialogJustificarEnvioOpen}>
        <DialogContent aria-describedby="dialog-justificar-envio" className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{justificarEnvioDialogInfo.title.text}</DialogTitle>
          </DialogHeader>

          <FieldMessage.Error.Root>
            <Textarea
              id="justificar-envio"
              rows={6}
              className="bg-white dark:bg-black"
              onChange={(event) =>
                updateDialogJustificarEnvioInfo({
                  justificativa: {
                    value: event.target.value,
                    isValid: true,
                  },
                })
              }
              value={justificarEnvioDialogInfo.justificativa.value}
            />
            <FieldMessage.Error.Text visible={!justificarEnvioDialogInfo.justificativa.isValid}>
              A justificativa deve conter no mínimo 10 caracteres
            </FieldMessage.Error.Text>
          </FieldMessage.Error.Root>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClickCloseJustificarEnvioDialog}>
              Fechar
            </Button>

            <Button
              type="button"
              variant="default"
              disabled={!justificarEnvioDialogInfo.justificativa.isValid}
              onClick={() => handleClickConfirmaJustificarEnvio(justificarEnvioDialogInfo)}>
              {isJustificandoEnvio ? 'Submetendo...' : 'Submeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
