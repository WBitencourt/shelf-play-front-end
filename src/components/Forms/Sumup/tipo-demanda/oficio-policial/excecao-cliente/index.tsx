'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from 'uuid';
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useShallow } from "zustand/shallow";
import { useResourcesStore } from "@/zustand-store/resources";
import * as Icon from '@phosphor-icons/react';
import { FileSignature, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload } from "@/components/Upload2.0";
import { PDFViewer } from "@/components/PDFViewer";
import { FileItem, UpdateFile, UploadRootHandles } from "@/components/Upload2.0/contexts";
import { ProcessInfoForm } from "./ProcessInfoForm";
import { toast } from "@/utils/toast";
import { Skeleton } from "@/components/Skeleton2.0";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "@/components/FieldMessage";
import { maskCpfCnpj, maskNumeroProcesso } from "@/utils/Masks";
import { fileHelper } from "@/utils/File";
import { Input } from "@/components/ui/input";
import { checkIsValidEmail } from "@/utils/Email";
import { checkIsValidCpfCnpj } from "@/utils/CpfCnpj";
import { Checkbox } from "@/components/ui/checkbox";
import { ArquivoDemanda } from "@/actionsV2/backend/interface";
import { actions } from "@/actionsV2";
import { CheckedState } from "@radix-ui/react-checkbox";
import { DetalhesCadastro } from "@/components/Forms/util/Components/DetalhesCadastro";
import EditorText from "@/components/EditorText3.1";
import { Label } from '@/components/ui/label';

import {
  DadosDemandaOficioPolicial,
  OnUploadErrorProps,
  FormFile,
  OnDropAccepted,
  OnDropRejected,
  OnProcessUpdateProps,
  ProcessUploadErrorProps,
  OnUploadProgressProps,
  HandleClickDeleteFileProps,
  HandleClickRetryUploadProps,
  EmailInput,
  ExequenteInput,
  ParteInput,
  JustificativaInfo,
} from "../../interfaces";

export interface FormOficioPolicialSumUpExcecaoClienteParams {
  id: string;
  esteira: string;
  esteiraTipo: string;
  dadosIniciais: DadosDemandaOficioPolicial;
}

interface FormOficioPolicialSumUpExcecaoClienteProps {
  params: FormOficioPolicialSumUpExcecaoClienteParams;
}

interface DadosClienteForm {
  timeOut: number;
  assuntos: string[];
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
}

export function FormOficioPolicialSumUpExcecaoCliente({ params }: FormOficioPolicialSumUpExcecaoClienteProps) {
  const pk = params.id;
  const esteira = params.esteira;
  const esteiraTipo = params.esteiraTipo;
  const dadosIniciais = params.dadosIniciais;

  const router = useRouter();
  const searchParams = useSearchParams();

  const { arquivo } = useResourcesStore(
    useShallow((state) => ({
      arquivo: state.arquivo,
    }))
  );

  const uploadRef = useRef<UploadRootHandles<FormFile>>(null);

  const formBag = useForm<DadosDemandaOficioPolicial>();

  const values = formBag.getValues();

  const [urlPdfViewer, setUrlPdfViewer] = useState<string>('');
  const [uploadList, setInitialUploadList] = useState<FormFile[]>([]);

  const [dadosCliente, setDadosCliente] = useState<DadosClienteForm>({
    timeOut: 5,
    assuntos: [],
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

  const [email, setEmail] = useState<Partial<EmailInput>>({
    value: '',
  });

  const [exequente, setExequente] = useState<Partial<ExequenteInput>>({
    value: '',
  });

  const [parte, setParte] = useState<ParteInput>({
    nome: {
      value: '',
    },
    documento: {
      value: '',
    }
  });

  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isLoadingFileViewer, setIsLoadingFileViewer] = useState(false);

  const [isOpenUploadList, setIsOpenUploadList] = useState<boolean>(false);
  const [isPausedCountDown, setIsPausedCountDown] = useState<boolean>(false);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [isEnviandoProximaEtapa, setIsEnviandoProximaEtapa] = useState(false);
  const [isUploadLimitReached, setIsUploadLimitReached] = useState(false);
  const [isDesvinculandoUsuario, setIsDesvinculandoUsuario] = useState(false);
  const [isJustificandoEnvio, setIsJustificandoEnvio] = useState(false);
  const [isLoadingFileUrl, setIsLoadingFileUrl] = useState(false);

  const [dialogJustificarEnvioOpen, setDialogJustificarEnvioOpen] = useState(false);

  const dateNow = useMemo(() => new Date(), []);

  const formatFormValues = useCallback((values: Partial<DadosDemandaOficioPolicial>) => {
    const tipoDocumento = values?.tipo_documento?.trim() ?? '';

    const formattedValues = {
      ...values,
      tipo_documento: tipoDocumento.length === 0 ? 'Policial' : tipoDocumento,
    } as DadosDemandaOficioPolicial;

    formattedValues.processo = maskNumeroProcesso(values?.processo);

    return formattedValues;
  }, []);

  const updateFormValues = useCallback((newValues: Partial<DadosDemandaOficioPolicial>) => {
    try {
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
  }, [formatFormValues, formBag.getValues, formBag.reset]);

  const updateEmail = useCallback((newState: Partial<EmailInput>) => {
    setEmail((state) => ({
      ...state,
      ...newState,
    }));
  }, []);

  const updateExequente = useCallback((newState: Partial<ExequenteInput>) => {
    setExequente((state) => ({
      ...state,
      ...newState,
    }));
  }, []); 

  const updateParte = useCallback((newState: Partial<ParteInput>) => {
    setParte((state) => ({
      ...state,
      ...newState,
    }));
  }, []);

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

        setUrlPdfViewer('');

        return;
      }

      setInitialUploadList(initialUploadList);

      const firstItemUploadConfigList = initialUploadList.find((item) => item.info.url.length > 0);

      setUrlPdfViewer(firstItemUploadConfigList?.info.url ?? '');

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

  const desbloqueiaDemanda = async () => {
    try {
      await actions.backend.demanda.desbloqueiaUsuarioDemanda({ pk })
    } catch(error: any) {
      throw new Error(error?.message);
    }
  }

  const updateDadosCliente = (newDados: Partial<DadosClienteForm>) => {
    if (!newDados) {
      return;
    }

    setDadosCliente((prevState) => {
      if (!prevState) {
        return {
          timeOut: 5,
          assuntos: [],
        }
      }

      return {
        ...prevState,
        ...newDados,
        timeOut: newDados.timeOut ?? 5,
        assuntos: newDados.assuntos ?? [],
      }
    });
  }

  const getDadosCliente = async () => {
    try {
      const cliente = dadosIniciais?.cliente;

      if(!cliente) {
        throw new Error('Cliente não informado corretamente.');
      }

      const dadosCliente = await actions.backend.cliente.getDadosCliente({
        cliente: cliente,
      });

      return dadosCliente;
    } catch (error: any) {
      toast.error({
        title: 'Erro',
        description: error?.message,
      });
    }
  }

  const onSubmit = async (dados: DadosDemandaOficioPolicial) => {
    try {
      setIsEnviandoProximaEtapa(true);

      await saveForm();

      const dadosSubmeter = await actions.backend.demanda.submeterDemanda({ pk, dados });

      const proximaDemanda = dadosSubmeter?.pk;

      if (proximaDemanda) {
        toast.success({
          title: 'Sucesso',
          description: 'Formulário enviado com sucesso.',
        });
        
        router.push(`/${esteira}/${esteiraTipo}/demanda/${proximaDemanda}`);

        return
      }

      toast.warning({
        title: 'Aviso',
        description: `Não há nova demanda para preenchimento, retornando a "${esteira} ${esteiraTipo}"`,
      });

      pushBack();
    } catch (error: any) {
      toast.error({
        title: 'Erro',
        description: error?.message,
      });
    } finally { 
      setIsEnviandoProximaEtapa(false);
    }
  };

  const handleClickFile = async (params: HandleClickFileParams) => {
    if (params.file.info.url.length > 0) {
      setUrlPdfViewer(params.file.info.url);

      return;
    }

    setIsLoadingFileUrl(true);

    try {
      const urlFile = await arquivo.getFileUrlFromS3({
        s3Key: params.file.info.s3Key,
        s3Bucket: params.file.info.s3Bucket,
      });
  
      setUrlPdfViewer(urlFile);

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
          description: 'Aviso: Limite total de 20MB de arquivos atingido.',
        });
      }

      // if (isFileSizeExceeded) {
      //   return onUploadError({ 
      //     file: {
      //       ...file,
      //       status: {
      //         ...file.status,
      //         success: false,
      //         progress: 100,
      //         message: 'A soma dos arquivos excede o limite de 20MB',
      //       },
      //       allow: {
      //         ...file.allow,
      //         retryUpload: true,
      //         delete: true,
      //       }
      //     }
      //    })
      // }

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

  const handleFinalCountDown = async () => {
    try {
      await saveForm();
      await desbloqueiaDemanda();

      toast.success({
        title: 'Sucesso',
        description: 'Tempo limite atingido, demanda desbloqueada',
      });

      pushBack()
    } catch(error: any) {
      toast.error({
        title: 'Erro',
        description: 'Falha ao desbloquear a demanda. Por favor, tente novamente.',
      });
    }
  }

  const handleClickSalvar = async () => {
    try {
      await saveForm();
    } catch (error: any) { 
      toast.error({
        title: 'Erro',
        description: error?.message,
      });
    } finally {
      setIsSavingForm(false);
    }
  }

  const saveForm = async () => {
    try {
      setIsSavingForm(true);

      console.log('Valores do formulário para salvar:', formBag.getValues());

      await actions.backend.demanda.salvarDemanda({
        pk,
        dados: formBag.getValues(),
      });

      toast.success({
        title: 'Sucesso',
        description: 'Formulário salvo com sucesso.',
      });
    } catch (error: any) { 
      toast.error({
        title: 'Erro',
        description: error?.message,
      });
    } finally {
      setIsSavingForm(false);
    }
  }

  const handleClickAdicionarEmail = () => {
    if (!email.value?.trim()) {
      formBag.setError('emails', {
        message: 'E-mail é obrigatório e não pode ser vazio',
      });
      return;
    }

    const isValidEmail = checkIsValidEmail(email.value);

    if (!isValidEmail) {
      formBag.setError('emails', {
        message: 'E-mail inválido',
      });
      return;
    }

    const oldEmails = formBag.getValues('emails') ?? [];

    if (oldEmails.includes(email.value)) {
      formBag.setError('emails', {
        message: 'E-mail já adicionado',
      });
      return;
    }

    formBag.setValue('emails', [
      ...oldEmails,
      email.value ,
    ]);

    updateEmail({
      value: '',
    });
  }

  const handleClickDeleteEmail = (email: string) => {
    const oldEmails = formBag.getValues('emails') ?? [];

    formBag.setValue('emails', oldEmails.filter((item) => item !== email));
  }

  const handleClickAdicionarExequente = () => {
    if (!exequente.value?.trim()) {
      formBag.setError('exequentes', {
        message: 'Exequente é obrigatório e não pode ser vazio',
      });
      return;
    }

    const oldExequentes = formBag.getValues('exequentes') ?? [];

    if (oldExequentes.includes(exequente.value.trim())) {
      formBag.setError('exequentes', {
        message: 'Exequente já adicionado',
      });
      return;
    }

    formBag.setValue('exequentes', [
      ...oldExequentes,
      exequente.value,
    ]);

    updateExequente({
      value: '',
    });
  }

  const handleClickDeleteExequente = (exequente: string) => {
    const oldExequentes = formBag.getValues('exequentes') ?? [];

    formBag.setValue('exequentes', oldExequentes.filter((item) => item !== exequente));
  }

  const handleClickAdicionarParte = () => {
    const parteNome = parte.nome.value?.trim();
    const parteDocumento = maskCpfCnpj(parte.documento.value);

    if (!parteNome || !parteDocumento) {
      formBag.setError('partes', {
        message: 'Nome e documento são obrigatórios',
      });
      return;
    }

    const isValidDocumento = parteDocumento === '000.000.000-00' || checkIsValidCpfCnpj(parteDocumento);

    if (!isValidDocumento) {
      formBag.setError('partes', {
        message: 'Documento inválido',
      });
      
      return;
    }

    const oldPartes = formBag.getValues('partes') ?? [];

    if (oldPartes.some((item) => item.documento === parteDocumento)) {
      formBag.setError('partes', {
        message: 'Parte já adicionada',
      });
      return;
    }

    formBag.setValue('partes', [
      ...oldPartes,
      {
        nome: parteNome,
        documento: parteDocumento,
        relacionamento: false,
        saldo: false,
      }
    ]);

    updateParte({
      nome: {
        value: '',
      },
      documento: {
        value: '',
      }
    });
  }

  const handleClickDeleteParte = (nome: string, documento: string) => {
    const oldPartes = formBag.getValues('partes') ?? [];

    console.log('Partes:', oldPartes);
    console.log('Nome:', nome);
    console.log('Documento:', documento);

    formBag.setValue('partes', oldPartes.filter((item) => !(item.nome === nome && item.documento === documento)));
  }

  const handleClickSair = async () => {
    try {
      setIsDesvinculandoUsuario(true);

      await desbloqueiaDemanda();

      pushBack()
    } catch (error: any) {
      toast.error({
        title: 'Erro',
        description: error?.message,
      });
    }
  }

  const handleChangeEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ?? '';

    updateEmail({
      value,
    });

    formBag.clearErrors('emails');
  }

  const handleChangeExequente = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ?? '';

    updateExequente({
      value,
    });

    formBag.clearErrors('exequentes');
  }

  const handleChangeParteNome = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ?? '';

    updateParte({
      nome: {
        value,
      },
      documento: {
        value: '',
      }
    });

    formBag.clearErrors('partes');
  }

  const handleChangeParteDocumento = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ?? '';

    updateParte({
      documento: {
        value: maskCpfCnpj(value),
      }
    });

    formBag.clearErrors('partes');
  }

  const handleToggleParteDocumento = (checked: CheckedState) => {
    const value = checked === true ? '000.000.000-00' : '';

    updateParte({
      documento: {
        value,
      }
    });

    formBag.clearErrors('partes');
  }

  const handleClickEnviarExcecao = () => {
    setDialogJustificarEnvioOpen(true);

    updateDialogJustificarEnvioInfo({
      tipo: 'enviar-excecao-oito',
      title: {
        text: 'Justificar envio para exceção',
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

  const enviarExcecaoOito = async () => {
    try {
      await actions.backend.demanda.enviarDemandaExcecaoOito({
        pk, 
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
      });

      toast.success({
        title: 'Enviado!',
        description: 'Formulário enviado com sucesso.',
      });

      pushBack();
    } catch (error: any) {
      toast.error({
        title: 'Falha ao enviar o formulário',
        description: error?.message,
      });
    }
  }

  const pushBack = () => {
    const urlQuery = searchParams.toString() ?? '';

    router.push(`/${esteira}/${esteiraTipo}?${urlQuery}`);
  }

  const substituirEnderecoEmail = async () => {
    try {
      setIsJustificandoEnvio(true);

      await actions.backend.excecao.substituirEmailDemanda({
        pk,
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
        dados: formBag.getValues(),
      });

      toast.success({
        title: 'Sucesso',
        description: 'E-mail substituído e re-enviado com sucesso.',
      });
    } catch (error: any) { 
      toast.error({
        title: 'Erro',
        description: error?.message,
      });
    } finally {
      setIsJustificandoEnvio(false);
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
        case 'enviar-excecao-oito':
          await enviarExcecaoOito();
          break;

        case 'substituir-endereco-email':
          await substituirEnderecoEmail();
          break;
          
        default:
          break;
      }

      pushBack();
    } catch (error: any) {
      toast.error({
        title: 'Falha ao justificar envio',
        description: error?.message,
      });
    } finally {
      setIsJustificandoEnvio(false);
    }
  }

  const handleClickEnviarExcecaoOito = () => {
    setDialogJustificarEnvioOpen(true);

    updateDialogJustificarEnvioInfo({
      tipo: 'enviar-excecao-oito',
      title: {
        text: 'Justificar envio para exceção oito',
      },
    });
  }

  const handleClickSubstituirEnviarEmail = () => {
    setDialogJustificarEnvioOpen(true);

    updateDialogJustificarEnvioInfo({
      tipo: 'substituir-endereco-email',
      title: {
        text: 'Justificar a substituição do endereço de e-mail',
      },
    });
  }

  const atualizaFormDadosIniciais = useCallback(async () => {
    try {
      setIsLoadingForm(true);

      if (!dadosIniciais) {
        return
      }

      const dadosCliente = await getDadosCliente();

      updateDadosCliente({
        timeOut: dadosCliente?.time_out?.['Ofício Policial'],
        assuntos: dadosCliente?.assunto_oficio,
      });

      updateFormValues({
        ...dadosIniciais,
        partes: dadosIniciais?.partes?.map((parte: any) => {
          return {
            nome: parte?.nome,
            documento: maskCpfCnpj(parte?.documento),
            relacionamento: parte?.relacionamento,
            saldo: parte?.saldo,
          }
        }),
      });

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
                                    onClick={() => handleClickFile({
                                      file,
                                      updateFile,
                                    })}
                                  >
                                    <Upload.List.Row.Name
                                      tooltip={file.info.name}
                                      selected={urlPdfViewer.length > 0 && urlPdfViewer === file.info.url}
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
                                    
                                    {/* <Upload.List.Row.Preview.Root>
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

                                    <Upload.List.Row.Size className='row-span-2'>
                                      { file.info.sizeFormatted }
                                    </Upload.List.Row.Size>

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

              {
                isLoadingFileUrl ? (
                  <Skeleton.Root className="w-full h-full">
                    <Skeleton.Custom className="w-full h-full" />
                  </Skeleton.Root>
                ) : (
                  <PDFViewer 
                    data-open={isOpenUploadList} 
                    className="data-[open=true]:h-1/2" 
                    source={urlPdfViewer} 
                  />
                )
              }
            </div>
          )
        }
      </Card>

      <Card className="flex flex-col w-1/2 gap-4 py-4 h-full overflow-y-auto">
        <CardContent className="flex flex-col gap-4 h-full">
          {/* <Countdown 
            label='Tempo restante para preenchimento:'
            paused={isPausedCountDown}
            time={{
              now: dateNow.toISOString(),
              start: dateNow.toISOString(),
              deadline: moment(dateNow).add(dadosCliente.timeOut, 'minutes').toISOString(),
            }}
            onFinalCountdown={handleFinalCountDown}
          /> */}

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

                {/* Divisão NUP */}
                <div>
                  <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <FileSignature className="w-5 h-5 mr-2 text-blue-500" />
                    <span>Informações do processo</span>
                  </h3>

                  <div className="space-y-4 bg-blue-50 dark:bg-blue-950/50 p-3 rounded-md mb-4">
                    <ProcessInfoForm 
                      formBag={formBag}
                      dadosCliente={dadosCliente}
                    />
                  </div>
                </div>

                <div>
                  <FieldMessage.Error.Root>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon.UsersThree className="w-5 h-5 text-green-500" />
                      <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">Exequentes</h3>
                    </div>
                    <div className="space-y-4 bg-green-50 dark:bg-green-950/50 p-3 rounded-md">
                      <div>
                        <Label className="block text-sm mb-1">Nome do exequente</Label>
                        <Input
                          type="text"
                          disabled
                          placeholder="... nome do exequente..."
                          className="w-full p-2 border rounded-md text-sm"
                          onChange={handleChangeExequente}
                          value={exequente.value}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleClickAdicionarExequente}
                        disabled
                        className="w-full bg-green-500 text-white px-4 py-2 rounded-md text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <Icon.Plus className="w-4 h-4" />
                        Adicionar exequente
                      </button>

                      {values?.exequentes && values.exequentes.length > 0 && (
                        <div className="mt-4">
                          <div className="bg-gray-50 dark:bg-gray-950/30 rounded-md border">
                            <div className="p-3 border-b bg-gray-100 dark:bg-gray-950/30">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Exequentes adicionados</h4>
                            </div>
                            <div className="divide-y">
                              {values.exequentes.sort((a, b) => a.localeCompare(b)).map((exequente) => (
                                <div
                                  key={exequente}
                                  className="p-3 flex items-center justify-between dark:bg-black hover:bg-gray-100 hover:dark:bg-gray-950">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{exequente}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleClickDeleteExequente(exequente)}
                                    disabled
                                    className="p-1 hover:bg-red-100 rounded-full transition-colors group disabled:cursor-not-allowed">
                                    <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <FieldMessage.Error.Text>
                        {formBag?.formState?.errors?.exequentes?.message}
                      </FieldMessage.Error.Text>
                    </div>
                  </FieldMessage.Error.Root>
                </div>

                <div>
                  <FieldMessage.Error.Root>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon.EnvelopeSimple className="w-5 h-5 text-purple-500" />
                      <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">E-mails</h3>
                    </div>
                    <div className="space-y-4 bg-purple-50 dark:bg-purple-950/50 p-3 rounded-md">
                      <div>
                        <Label className="block text-sm mb-1">E-mail</Label>
                        <Input
                          type="text"
                          placeholder="... digite um e-mail válido..."
                          className="w-full p-2 border rounded-md text-sm"
                          onChange={handleChangeEmail}
                          value={email.value}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleClickAdicionarEmail}
                        disabled={!!formBag?.formState?.errors?.emails}
                        className="w-full bg-purple-500 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <Icon.Plus className="w-4 h-4" />
                        Adicionar e-mail
                      </button>

                      {values?.emails && values.emails.length > 0 && (
                        <div className="mt-4">
                          <div className="bg-gray-50 dark:bg-gray-950/30 rounded-md border">
                            <div className="p-3 border-b bg-gray-100 dark:bg-gray-950/30">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">E-mails adicionados</h4>
                            </div>
                            <div className="divide-y">
                              {values.emails.sort((a, b) => a.localeCompare(b)).map((email, index) => (
                                <div
                                  key={index}
                                  className="p-3 flex items-center justify-between dark:bg-black hover:bg-gray-100 hover:dark:bg-gray-950">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{email}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleClickDeleteEmail(email)}
                                    className="p-1 hover:bg-red-100 rounded-full transition-colors group">
                                    <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <FieldMessage.Error.Text>
                        {formBag?.formState?.errors?.emails?.message}
                      </FieldMessage.Error.Text>
                    </div>
                  </FieldMessage.Error.Root>
                </div>

                <div>
                  <FieldMessage.Error.Root>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon.Users className="w-5 h-5 text-orange-500" />
                      <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">Partes</h3>
                    </div>
                    <div className="space-y-4 bg-orange-50 dark:bg-orange-950/30 p-3 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="block text-sm mb-1">Nome</Label>
                          <Input
                            type="text"
                            disabled
                            placeholder="... nome da parte..."
                            className="w-full p-2 border rounded-md text-sm"
                            onChange={handleChangeParteNome}
                            value={parte.nome.value}
                          />
                        </div>
                        
                        <div>
                          <Label className="block text-sm mb-1">Documento</Label>
                          <Input
                            type="text"
                            disabled
                            placeholder="... documento da parte..."
                            className="w-full p-2 border rounded-md text-sm"
                            onChange={handleChangeParteDocumento}
                            value={parte.documento.value}
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 items-center py-2">
                        <Checkbox
                          id="parte-sem-documento" 
                          disabled
                          checked={parte.documento.value === '000.000.000-00'}
                          onCheckedChange={handleToggleParteDocumento}
                        />
                        <Label htmlFor="parte-sem-documento" className="text-sm">
                          Parte sem documento?
                        </Label>
                      </div>

                      <button
                        type="button"
                        onClick={handleClickAdicionarParte}
                        disabled
                        className="w-full bg-orange-500 text-white px-4 py-2 rounded-md text-sm hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <Icon.Plus className="w-4 h-4" />
                        Adicionar parte
                      </button>

                      {values?.partes && values.partes.length > 0 && (
                        <div className="mt-4">
                          <div className="bg-gray-50 dark:bg-gray-950/30 rounded-md border">
                            <div className="p-3 border-b bg-gray-100 dark:bg-gray-950/30">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Partes adicionadas</h4>
                            </div>
                            <div className="divide-y">
                              {values.partes.sort((a, b) => a.nome.localeCompare(b.nome)).map((parte, index) => (
                                <div
                                  key={index}
                                  className="p-3 flex items-center justify-between dark:bg-black hover:bg-gray-100 hover:dark:bg-gray-950">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{parte.nome}</p>
                                      <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 rounded text-xs text-nowrap">
                                        {parte.documento}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    disabled
                                    onClick={() => handleClickDeleteParte(parte.nome, parte.documento)}
                                    className="p-1 hover:bg-red-100 rounded-full transition-colors group disabled:cursor-not-allowed">
                                    <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <FieldMessage.Error.Text>
                          {formBag?.formState?.errors?.partes?.message}
                        </FieldMessage.Error.Text>
                      </div>
                    </div>
                  </FieldMessage.Error.Root>
                </div>

                <EditorText
                  label='Template de resposta (E-mail)'
                  initialContent={values.template_resposta_email}
                  readOnly
                  onChange={(value) => { formBag.setValue('template_resposta_email', value) }}
                />

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
                    className="bg-blue-600 hover:bg-blue-700 hover:text-white text-white"
                    disabled={isJustificandoEnvio}
                    onClick={handleClickSubstituirEnviarEmail}
                  >
                    { isJustificandoEnvio ? 'Enviando...' : 'Substituir e re-enviar e-mail' }
                  </Button>
                </div>

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
                    onClick={handleClickEnviarExcecaoOito}
                  >
                    { isJustificandoEnvio ? 'Enviando...' : 'Enviar para exceção oito' }
                  </Button>
                </div>
              </form>
            )
          }
        </CardContent>
      </Card>

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
    </div>
  );
}