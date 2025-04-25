'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from 'uuid';
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useShallow } from "zustand/shallow";
import { useResourcesStore } from "@/zustand-store/resources";
import { Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Backdrop from "@/components/Backdrop";
import { Upload } from "@/components/Upload2.0";
import * as Icon from '@phosphor-icons/react';
import { PDFViewer } from "@/components/PDFViewer";
import { FileItem, UpdateFile, UploadRootHandles } from "@/components/Upload2.0/contexts";
import { ProcessInfoForm } from "./ProcessInfoForm";
import { toast } from "@/utils/toast";
import { Skeleton } from "@/components/Skeleton2.0";
import { useAuthStore } from "@/zustand-store/auth.store";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "@/components/FieldMessage";
import { util } from "@/utils";
import { maskCpfCnpj, maskNumeroProcesso } from "@/utils/Masks";
import { fileHelper } from "@/utils/File";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { checkIsValidEmail } from "@/utils/Email";
import { Tooltip } from "@/components/Tooltip2.0";
import { checkIsValidCpfCnpj } from "@/utils/CpfCnpj";
import { getDadosCliente as getDadosClienteAction } from "@/actions/backend-for-front-end/cliente";

import {
  DadosDemandaOficioJudicial,
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
  EmailInfo,
  ParteInfo,
  JustificativaInfo,
  TipoJustificativaInfo,
  ExequenteInfo,
} from "../../interfaces";

import { 
  enviarDemandaExcecaoCliente,
  enviarDemandaEsteiraOito,
  enviarDemandaEsteiraCliente,
  enviarDemandaAuditoriaOito,
  adicionaObservacaoDemanda,
  desbloqueiaUsuarioDemanda,
  getDadosDemandaExcecao, 
  inativarDemanda,
} from "@/actions/backend-for-front-end/demanda";

import {
  enviarEmailDemanda,
  substituirEmailDemanda,
} from "@/actions/backend-for-front-end/excecao";
import { Checkbox } from "@/components/ui/checkbox";
import { ArquivoDemanda } from "@/actions/bff/interface";
import { DetalhesCadastro } from "@/components/Forms/util/Components/DetalhesCadastro";

export interface FormOficioJudicialPicPayGroupExcecaoOitoParams {
  id: string;
  esteira: string;
  esteiraTipo: string;
  dadosIniciais: DadosDemandaOficioJudicial;
}

interface FormOficioJudicialPicPayGroupExcecaoOitoProps {
  params: FormOficioJudicialPicPayGroupExcecaoOitoParams;
}

interface OnClickJustificarEnvio {
  tipo: TipoJustificativaInfo;
  title: string;
}

interface DadosClienteForm {
  assuntos: string[];
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

export function FormOficioJudicialPicPayGroupExcecaoOito({ params }: FormOficioJudicialPicPayGroupExcecaoOitoProps) {
  const pk = params.id;
  const esteira = params.esteira;
  const esteiraTipo = params.esteiraTipo;
  const dadosIniciais = params.dadosIniciais;

  const router = useRouter();

  

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

  const formBag = useForm<DadosDemandaOficioJudicial>();

  const values = formBag.getValues();

  const [urlPdfViewer, setUrlPdfViewer] = useState<string>('');
  const [uploadList, setInitialUploadList] = useState<FormFile[]>([]);

  const [dadosCliente, setDadosCliente] = useState<DadosClienteForm>({
    assuntos: [],
  });

  const [dialogObservacaoInfo, setDialogObservacaoInfo] = useState<ObservacaoInfo>({
    observacao: {
      value: '',
      isValid: false,
    }
  })

  const [dialogEmailInfo, setDialogEmailInfo] = useState<EmailInfo>({
    email: {
      value: '',
      isValid: true,
    }
  })

  const [dialogPartesInfo, setDialogPartesInfo] = useState<ParteInfo>({
    nome: {
      value: '',
      isValid: true,
    },
    documento: {
      value: '',
      isValid: true,
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

  const [dialogExequenteInfo, setDialogExequenteInfo] = useState<ExequenteInfo>({
    exequente: {
      value: '',
      isValid: true,
      error: {
        message: '',
      },
    }
  })

  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isLoadingFileViewer, setIsLoadingFileViewer] = useState(false);
  const [isOpenUploadList, setIsOpenUploadList] = useState<boolean>(false);
  const [isAddingObsForm, setIsAddingObsForm] = useState(false);
  const [isUploadLimitReached, setIsUploadLimitReached] = useState(false);
  const [isAddingEmailForm, setIsAddingEmailForm] = useState(false);
  const [isAddingPartesForm, setIsAddingPartesForm] = useState(false);
  const [isJustificandoEnvio, setIsJustificandoEnvio] = useState(false);
  const [isDesvinculandoUsuario, setIsDesvinculandoUsuario] = useState(false);
  const [isAddingExequenteForm, setIsAddingExequenteForm] = useState(false);

  const [dialogObservacaoOpen, setDialogObservacaoOpen] = useState(false);
  const [dialogEmailOpen, setDialogEmailOpen] = useState(false);
  const [dialogPartesOpen, setDialogPartesOpen] = useState(false);
  const [dialogJustificarEnvioOpen, setDialogJustificarEnvioOpen] = useState(false);
  const [dialogExequenteOpen, setDialogExequenteOpen] = useState(false);

  const dateNow = useMemo(() => new Date(), []);

  const formatFormValues = useCallback((values: Partial<DadosDemandaOficioJudicial>) => {
    const tipoDocumento = values?.tipo_documento?.trim() ?? '';
    
    const formattedValues = {
      ...values,
      tipo_documento: tipoDocumento.length === 0 ? 'Judicial' : tipoDocumento,
    } as DadosDemandaOficioJudicial;

    formattedValues.processo = maskNumeroProcesso(values?.processo);

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
          assuntos: [],
        }
      }

      return {
        ...prevState,
        ...newDados,
        assuntos: newDados.assuntos ?? [],
      }
    });
  }

  const updateDialogExequenteInfo = (newState: Partial<ExequenteInfo>) => {
    if (!newState || Object.keys(newState).length === 0) {
      return 
    }
  
    setDialogExequenteInfo((prevState) => {
      return {
        ...prevState,
        ...newState,
        exequente: {
          ...prevState.exequente,
          ...newState.exequente,
        },
      };
    });
  };

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
      const uploadList = await Promise.all(
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
            }

            return errorFile;
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

  const updateFormValues = useCallback((newValues: Partial<DadosDemandaOficioJudicial>) => {
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

  const loadPage = () => {
    router.push(`/${esteira}/${esteiraTipo}/demanda/${pk}`);
  };

  const desbloqueiaDemanda = async () => {
    try {
      await desbloqueiaUsuarioDemanda({ pk })
    } catch(error: any) {
      throw new Error(error?.message);
    }
  }

  const updateDialogEmailInfo = (newState: Partial<EmailInfo>) => {
    if (!newState || Object.keys(newState).length === 0) {
      return 
    }
  
    setDialogEmailInfo((prevState) => {
      return {
        ...prevState,
        ...newState,
        email: {
          ...prevState.email,
          ...newState.email,
        },
      };
    });
  };

  const updateDialogPartesInfo = (newState: Partial<ParteInfo>) => {
    if (!newState || Object.keys(newState).length === 0) {
      return 
    }
  
    setDialogPartesInfo((prevState: ParteInfo) => {
      return {
        ...prevState,
        ...newState,
        nome: {
          ...prevState.nome,
          ...newState.nome,
        },
        documento: {
          ...prevState.documento,
          ...newState.documento,
        }
      };
    });
  }

  const onSubmit = async (data: DadosDemandaOficioJudicial) => {
    try {

    } catch (error: any) {
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    } finally { 
    }
  };

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

  const handleClickConfirmaAdicionaEmail = async () => {
    try {
      if (!dialogEmailInfo.email.value) {
        return
      }

      setIsAddingEmailForm(true);

      const isValidEmail = checkIsValidEmail(dialogEmailInfo.email.value);

      if (!isValidEmail) {
        updateDialogEmailInfo({
          email: {
            isValid: false,
          }
        });

        return;
      }

      const oldEmails = formBag.getValues('emails') ?? [];

      formBag.setValue('emails', [
        ...oldEmails,
        dialogEmailInfo.email.value,
      ]);

      updateDialogEmailInfo({
        email: {
          value: '',
        }
      });

      setDialogEmailOpen(false);
    } catch (error: any) { 
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    } finally {
      setIsAddingEmailForm(false);
    }
  }

  const handleClickDeleteEmail = (email: string) => {
    const oldEmails = formBag.getValues('emails') ?? [];

    formBag.setValue('emails', oldEmails.filter((item) => item !== email));
  }

  const handleClickConfirmaAdicionaParte = async () => {
    try {
      setIsAddingPartesForm(true);

      const isValidNome = dialogPartesInfo?.nome?.value && dialogPartesInfo.nome.value.trim().length > 0 ? true : false;
      const isValidDocumento = dialogPartesInfo.documento.value === '000.000.000-00' ? true : checkIsValidCpfCnpj(dialogPartesInfo.documento.value);

      if (!isValidNome || !isValidDocumento) {
        updateDialogPartesInfo({
          nome: {
            isValid: isValidNome,
          }, 
          documento: {
            isValid: isValidDocumento,
          }
        });

        return;
      }

      updateDialogPartesInfo({
        nome: {
          isValid: false,
        }
      });

      const oldPartes = formBag.getValues('partes') ?? [];

      formBag.setValue('partes', [
        ...oldPartes,
        {
          nome: dialogPartesInfo.nome.value ?? '',
          documento: dialogPartesInfo.documento.value ?? '',
          relacionamento: false,
          saldo: false,
        }
      ]);

      updateDialogPartesInfo({
        nome: {
          value: '',
          isValid: true,
        },
        documento: {
          value: '',
          isValid: true,
        }
      });

      setDialogPartesOpen(false);
    } catch (error: any) { 
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    } finally {
      setIsAddingPartesForm(false);
    }
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

      router.push(`/${esteira}/${esteiraTipo}`);
    } catch {
      toast.error({
  title: 'Erro',
  description: 'Falha ao desbloquear a demanda. Por favor, tente novamente.',
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

  const handleClickJustificarEnvio = ({ title, tipo }: OnClickJustificarEnvio) => {
    updateDialogJustificarEnvioInfo({
      tipo,
      title: {
        text: title,
      }
    })

    setDialogJustificarEnvioOpen(true);
  }

  const inativar = async () => {
    try {
      setIsJustificandoEnvio(true);

      await inativarDemanda({
        pk,
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
      });

      toast.success({
  title: 'Sucesso',
  description: 'Demanda inativada com sucesso.',
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

  const enviarExcecaoCliente = async () => {
    try {
      setIsJustificandoEnvio(true);

      const justificativa = justificarEnvioDialogInfo.justificativa.value ?? '';

      if(justificativa.length < 10) {
        throw new Error('Justificativa deve ter no mínimo 10 caracteres.');
      }

      const response = await enviarDemandaExcecaoCliente({
        pk,
        justificativa,
      });

      util.actions.checkHaveError(response?.data);

      toast.success({
  title: 'Sucesso',
  description: 'Demanda enviada para exceção cliente com sucesso.',
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

  const enviarEsteiraCliente = async () => {
    try {
      setIsJustificandoEnvio(true);

      const response = await enviarDemandaEsteiraCliente({
        pk,
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
      });

      util.actions.checkHaveError(response?.data);

      toast.success({
  title: 'Sucesso',
  description: 'Demanda enviada para esteira cliente com sucesso.',
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

  const enviarEsteiraOito = async () => {
    try {
      setIsJustificandoEnvio(true);

      const response = await enviarDemandaEsteiraOito({
        pk,
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
      });

      util.actions.checkHaveError(response?.data);

      toast.success({
  title: 'Sucesso',
  description: 'Demanda enviada para esteira oito com sucesso.',
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

  const enviarAuditoriaOito = async () => {
    try {
      setIsJustificandoEnvio(true);

      const response = await enviarDemandaAuditoriaOito({
        pk,
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
      });

      util.actions.checkHaveError(response?.data);

      toast.success({
  title: 'Sucesso',
  description: 'Demanda enviada para auditoria oito com sucesso.',
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

  const substituirEnderecoEmail = async () => {
    try {
      setIsJustificandoEnvio(true);

      const response = await substituirEmailDemanda({
        pk,
        justificativa: justificarEnvioDialogInfo.justificativa.value ?? '',
        dados: formBag.getValues(),
      });

      util.actions.checkHaveError(response?.data);

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
        case 'enviar-excecao-cliente':
          await enviarExcecaoCliente();
          break;

        case 'enviar-esteira-cliente':
          await enviarEsteiraCliente();
          break;

        case 'enviar-esteira-oito':
          await enviarEsteiraOito();
          break;

        case 'enviar-auditoria-oito':
          await enviarAuditoriaOito();
          break;

        case 'substituir-endereco-email':
          await substituirEnderecoEmail();
          break;

        case 'inativar-demanda':
          await inativar();
          break;
          
        default:
          break;
      }

      router.push(`/${esteira}/${esteiraTipo}`);
    } catch (error: any) {
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    } finally {
      setIsJustificandoEnvio(false);
    }
  }

  const handleClickConfirmaAdicionaExequente = async () => {
    try {
      const newExequente = dialogExequenteInfo.exequente.value

      if (!newExequente) {
        return
      }

      setIsAddingExequenteForm(true);

      const isEmpty = newExequente.trim().length > 0;

      if (!isEmpty) {
        updateDialogExequenteInfo({
          exequente: {
            isValid: false,
            error: {
              message: 'Nome do exequente não informado corretamente.',
            }
          }
        });

        return;
      }

      const alreadyExists = formBag.getValues('exequentes')?.find((exequente) => exequente === newExequente);

      if (alreadyExists) {
        updateDialogExequenteInfo({
          exequente: {
            isValid: false,
            error: {
              message: 'Exequente já adicionado.',
            }
          }
        });

        return;
      }

      const oldExequentes = formBag.getValues('exequentes') ?? [];

      formBag.setValue('exequentes', [
        ...oldExequentes,
        newExequente,
      ]);

      updateDialogExequenteInfo({
        exequente: {
          value: '',
        }
      });

      setDialogExequenteOpen(false);
    } catch (error: any) { 
      toast.error({
  title: 'Erro',
  description: error?.message,
});
    } finally {
      setIsAddingExequenteForm(false);
    }
  }

  const handleClickDeleteExequente = (exequente: string) => {
    const oldExequentes = formBag.getValues('exequentes') ?? [];

    formBag.setValue('exequentes', oldExequentes.filter((item) => item !== exequente));
  }
  
  const atualizaFormDadosIniciais = useCallback(async () => {
    try {
      setIsLoadingForm(true);

      if (!dadosIniciais) {
        return
      }

      const dadosCliente = await getDadosCliente();
      
      updateDadosCliente({
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
          {/* <Countdown 
            label='Tempo restante para preenchimento:'
            paused={isPausedCountDown}
            time={{
              now: dateNow.toISOString(),
              start: dateNow.toISOString(),
              deadline: moment(dateNow).add(5, 'minutes').toISOString(),
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

                <div className="space-y-2">
                  <Label htmlFor="tipo_documento">Tipo documento</Label>
                  <Input 
                    id="tipo_documento" 
                    {...formBag.register('tipo_documento')} 
                    readOnly 
                    disabled 
                    className="bg-gray-100" 
                  />
                </div>

                <ProcessInfoForm 
                  formBag={formBag}
                />

                <div className="space-y-2">
                  <Label htmlFor="assunto">Assunto</Label>
                  <Select 
                    {...formBag.register('assunto')} 
                    disabled
                    value={values.assunto}
                    onValueChange={(value) => formBag.setValue('assunto', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um assunto" />
                    </SelectTrigger>
                    <SelectContent>
                      {dadosCliente.assuntos.map((assunto) => (
                        <SelectItem key={assunto} value={assunto}>
                          {assunto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {
                  dadosIniciais.cliente === 'GuiaBolso' ? null: (
                    <Table className='w-full'>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Exequentes</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {
                          values?.exequentes && values.exequentes.length > 0 ? (
                            values?.exequentes?.sort((a, b) => a.localeCompare(b)).map((exequente, index) => (
                              <TableRow key={exequente}>
                                <TableCell className='w-full'>
                                  { exequente }
                                </TableCell>
                                <TableCell className='w-full'>
                                  <Tooltip.Root>
                                    <Tooltip.Trigger>
                                      <button 
                                        disabled
                                        className="disabled:cursor-not-allowed cursor-pointer"
                                        onClick={() => handleClickDeleteExequente(exequente)}
                                      >
                                        <Trash2 
                                          className="text-red-500 h-5 w-5" 
                                        />
                                      </button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content side='left'>
                                      Excluir
                                    </Tooltip.Content>
                                  </Tooltip.Root>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell 
                                colSpan={1}
                                className='text-center'
                              >
                                Nenhuma exequente cadastrado
                              </TableCell>
                            </TableRow>
                          )
                        }
    
                        <TableRow>
                          <TableCell 
                            colSpan={3} 
                            className='text-center text-green-500 cursor-not-allowed' 
                            onClick={() => setDialogExequenteOpen(true)}
                          >
                            <button 
                              disabled
                              className="disabled:cursor-not-allowed"
                              onClick={() => setDialogEmailOpen(true)} 
                            >
                              Adicionar exequente
                            </button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )
                }

                <Table className='w-full'>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-mail</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {
                      values?.emails && values.emails.length > 0 ? (
                        values?.emails?.sort((a, b) => a.localeCompare(b)).map((email, index) => (
                          <TableRow key={index}>
                            <TableCell className='w-full'>
                              {email}
                            </TableCell>
                            <TableCell className='w-full'>
                              <Tooltip.Root>
                                <Tooltip.Trigger>
                                  <button 
                                    className="disabled:cursor-not-allowed cursor-pointer"
                                    onClick={() => handleClickDeleteEmail(email)}
                                  >
                                  <Trash2 
                                    className="text-red-500 h-5 w-5" 
                                  />
                                  </button>
                                </Tooltip.Trigger>
                                <Tooltip.Content side='left'>
                                  Excluir
                                </Tooltip.Content>
                              </Tooltip.Root>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell 
                            colSpan={1}
                            className='text-center'
                          >
                            Nenhuma e-mail cadastrado
                          </TableCell>
                        </TableRow>
                      )
                    }

                    <TableRow>
                      <TableCell 
                        colSpan={3} 
                        className='text-center text-green-500 cursor-pointer' 
                      >
                        <button 
                          className="disabled:cursor-not-allowed"
                          onClick={() => setDialogEmailOpen(true)} 
                        >
                          Adicionar e-mail
                        </button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Table className='w-full'>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Documento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {
                      values?.partes && values.partes.length > 0 ? (
                        values?.partes?.sort((a, b) => a.nome.localeCompare(b.nome)).map((parte, index) => (
                          <TableRow key={index}>
                            <TableCell className='w-full'>
                              { parte.nome }
                            </TableCell>
                            <TableCell className="text-nowrap">
                              { parte.documento }
                            </TableCell>
                            <TableCell className='w-full'>
                              <Tooltip.Root>
                                <Tooltip.Trigger>
                                  <button 
                                    disabled
                                    className="disabled:cursor-not-allowed cursor-pointer"
                                    onClick={() => handleClickDeleteParte(parte.nome, parte.documento)}
                                  >
                                    <Trash2 
                                      className="text-red-500 h-5 w-5" 
                                    />
                                  </button>
                                </Tooltip.Trigger>
                                <Tooltip.Content side='left'>
                                  Excluir
                                </Tooltip.Content>
                              </Tooltip.Root>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell 
                            colSpan={3}
                            className='text-center'
                          >
                            Nenhuma parte cadastrada
                          </TableCell>
                        </TableRow>
                      )
                    }

                    <TableRow>
                      <TableCell 
                        colSpan={2} 
                        className='text-center text-green-500 cursor-pointer' 
                      >
                        <button 
                          disabled
                          className="disabled:cursor-not-allowed"
                          onClick={() => setDialogPartesOpen(true)}
                        >
                          Adicionar parte
                        </button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

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
                    className="bg-blue-600 text-white"
                    disabled={isJustificandoEnvio}
                    onClick={() => handleClickJustificarEnvio({
                      title: 'Justificar a substituição do endereço de e-mail',
                      tipo: 'substituir-endereco-email',
                    })}
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
                    onClick={() => handleClickJustificarEnvio({
                      title: 'Justificar envio para esteira oito',
                      tipo: 'enviar-esteira-oito',
                    })}
                  >
                    { isJustificandoEnvio ? 'Enviando...' : 'Enviar para esteira oito' }
                  </Button>
                </div>

                {/* <div className="flex justify-center space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isJustificandoEnvio} 
                    onClick={() => handleClickJustificarEnvio({
                      title: 'Justificar envio para exceção cliente',
                      tipo: 'enviar-excecao-cliente',
                    })}
                  >
                    { isJustificandoEnvio ? 'Enviando...' : 'Enviar para exceção cliente' }
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isJustificandoEnvio} 
                    onClick={() => handleClickJustificarEnvio({
                      title: 'Justificar envio para esteira cliente',
                      tipo: 'enviar-esteira-cliente',
                    })}
                  >
                    { isJustificandoEnvio ? 'Enviando...' : 'Enviar para esteira cliente' }
                  </Button>
                </div>

                <div className="flex justify-center space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isJustificandoEnvio} 
                    onClick={() => handleClickJustificarEnvio({
                      title: 'Justificar envio para esteira oito',
                      tipo: 'enviar-esteira-oito',
                    })}
                  >
                    { isJustificandoEnvio ? 'Enviando...' : 'Enviar para esteira oito' }
                  </Button>

                  <Button 
                    type="button"   
                    variant="outline" 
                    disabled={isJustificandoEnvio} 
                    onClick={() => handleClickJustificarEnvio({
                      title: 'Justificar envio para auditoria oito',
                      tipo: 'enviar-auditoria-oito',
                    })}
                  >
                    { isJustificandoEnvio ? 'Enviando...' : 'Enviar para auditoria oito' }
                  </Button>
                </div>

                <div className="flex justify-center space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isJustificandoEnvio}
                    onClick={() => handleClickJustificarEnvio({
                      title: 'Justificar a substituição do endereço de e-mail',
                      tipo: 'substituir-endereco-email',
                    })}
                  >
                    { isJustificandoEnvio ? 'Enviando...' : 'Substituir e re-enviar e-mail' }
                  </Button>
                </div>

                <div className="flex justify-center space-x-2">
                  <Button 
                    type="button" 
                    variant="destructive"
                    disabled={isJustificandoEnvio} 
                    onClick={() => handleClickJustificarEnvio({
                      title: 'Justificar envio para inativação',
                      tipo: 'inativar-demanda',
                    })}
                  >
                    Inativar demanda
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
                </div> */}
              </form>
            )
          }
        </CardContent>
      </Card>

      <Dialog
        open={dialogExequenteOpen}
        onOpenChange={setDialogExequenteOpen}
      >
        <DialogContent 
          aria-describedby='dialog-exequente'
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Adicionar exequente</DialogTitle>
          </DialogHeader>

          <FieldMessage.Error.Root>  
            <div className="space-y-2">
              <Label htmlFor="new-exequente">Exequente</Label>
              <Input 
                id="new-exequente" 
                placeholder="" 
                onChange={(event) => updateDialogExequenteInfo({ 
                  exequente: {
                    value: event.target.value,
                    isValid: true,
                  }
                })}
                value={dialogExequenteInfo.exequente.value} 
              />
            </div>
            <FieldMessage.Error.Text   
              visible={!dialogExequenteInfo.exequente.isValid}
            >
              { dialogExequenteInfo.exequente.error?.message }
            </FieldMessage.Error.Text>
          </FieldMessage.Error.Root >

          <DialogFooter>
            <Button 
              onClick={() => setDialogExequenteOpen(false)}
            >
              Cancelar
            </Button>

            <Button 
              disabled={!dialogExequenteInfo.exequente.isValid}
              onClick={handleClickConfirmaAdicionaExequente}
            >
              { isAddingExequenteForm ? 'Adicionando...' : 'Adicionar' }
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

      <Dialog
        open={dialogEmailOpen}
        onOpenChange={setDialogEmailOpen}
      >
        <DialogContent 
          aria-describedby='dialog-email'
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Adicionar e-mail</DialogTitle>
          </DialogHeader>

          <FieldMessage.Error.Root>  
            <div className="space-y-2">
              <Label htmlFor="new-email">E-mail</Label>
              <Input 
                id="new-email" 
                placeholder="Digite um e-mail válido..." 
                onChange={(event) => updateDialogEmailInfo({ 
                  email: {
                    value: event.target.value,
                    isValid: true,
                  }
                })}
                value={dialogEmailInfo.email.value} 
              />
            </div>
            <FieldMessage.Error.Text   
              visible={!dialogEmailInfo.email.isValid}
            >
              E-mail inválido
            </FieldMessage.Error.Text>
          </FieldMessage.Error.Root >

          <DialogFooter>
            <Button 
              onClick={() => setDialogEmailOpen(false)}
            >
              Cancelar
            </Button>

            <Button 
              disabled={!dialogEmailInfo.email.isValid}
              onClick={handleClickConfirmaAdicionaEmail}
            >
              { isAddingEmailForm ? 'Adicionando...' : 'Adicionar' }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogPartesOpen}
        onOpenChange={setDialogPartesOpen}
      >
        <DialogContent 
          aria-describedby='dialog-partes'
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Adicionar partes</DialogTitle>
          </DialogHeader>

          <FieldMessage.Error.Root>  
            <div className="space-y-2">
              <Label htmlFor="new-parte-nome">Nome</Label>
              <Input 
                id="new-parte-nome" 
                placeholder="Digite o nome da parte..." 
                onChange={(event) => updateDialogPartesInfo({ 
                  nome: {
                    value: event.target.value,
                    isValid: true,
                  },
                })}
                value={dialogPartesInfo.nome.value} 
              />
            </div>
            <FieldMessage.Error.Text   
              visible={!dialogPartesInfo.nome.isValid}
            >
              Nome inválido
            </FieldMessage.Error.Text>
          </FieldMessage.Error.Root >

          <FieldMessage.Error.Root>  
            <div className="space-y-2">
              <Label htmlFor="new-parte-documento">Documento</Label>
              <Input 
                id="new-parte-documento" 
                placeholder="Digite o documento da parte..." 
                onChange={(event) => updateDialogPartesInfo({ 
                  documento: {
                    value: maskCpfCnpj(event.target.value),
                    isValid: true,
                  },
                })}
                value={dialogPartesInfo.documento.value} 
              />
            </div>
            <div className="flex gap-2 items-center py-2">
              <Checkbox
                id="new-parte-sem-documento" 
                checked={dialogPartesInfo.documento.value === '000.000.000-00'}
                onCheckedChange={(checked) => updateDialogPartesInfo({ 
                  documento: {
                    value: checked ? '000.000.000-00' : '',
                    isValid: true,
                  },
                })}
              />
              <Label htmlFor="new-parte-sem-documento">Parte sem documento?</Label>
            </div>
            <FieldMessage.Error.Text   
              visible={!dialogPartesInfo.documento.isValid}
            >
              Documento inválido
            </FieldMessage.Error.Text>
          </FieldMessage.Error.Root >

          <DialogFooter>
            <Button 
              onClick={() => setDialogPartesOpen(false)}
            >
              Cancelar
            </Button>

            <Button 
              disabled={!dialogPartesInfo.nome.isValid || !dialogPartesInfo.documento.isValid}
              onClick={handleClickConfirmaAdicionaParte}
            >
              { isAddingPartesForm ? 'Adicionando...' : 'Adicionar' }
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
    </div>
  );
}