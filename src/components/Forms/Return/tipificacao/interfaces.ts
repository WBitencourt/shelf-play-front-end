import { ArquivoDemanda } from "@/actions/bff/interface";
import { FileItem, RemoveFile, RetryUpload, UpdateFile, UploadFile } from "@/components/Upload2.0/contexts";
import { Unit } from "bytes";
import { FileRejection } from "react-dropzone/.";

export interface DadosTipificacao {
  pk?: string;
  usuario_atuando?: string;
  created_by?: string;
  data_carimbo?: string;
  due_date?: string;
  arquivos?: ArquivoDemanda[];
  tipo_demanda?: string;
  perfil_demanda?: string;
  status?: string;
  status_demanda?: string;
  processo?: string;
  identificacao?: string;
  observacao?: {
    mensagem: string;
    criada_em: string;
    criada_por: string;
  }[];
  [ key: string ]: any;
}

export interface FormFile {
  id: string;
  info: {
    name: string;
    size: number;
    sizeFormatted: string;
    url: string; 
    unit: Unit;
    s3Key: string;
    s3Bucket: string;
  };
  status: {
    success: boolean | undefined;
    progress: number;
    message: string | undefined;
    isDeleting?: boolean;
  };
  allow: {
    delete: boolean;
    download: boolean;
    retryUpload: boolean;
    link: boolean;
  };
  dropzoneFile: File | FileRejection | undefined;
}

export interface OnUploadErrorProps {
  file: FileItem<FormFile>;
  message?: string;
}

export interface OnDropAccepted {
  files: File[];
  uploadFiles: UploadFile<FormFile>
}

export interface OnDropRejected {
  files: FileRejection[];
  uploadFiles: UploadFile<FormFile>
}

export interface OnProcessUpdateProps {
  file: FileItem<FormFile>;
  updateFile: UpdateFile<FormFile>
}

export interface ProcessUploadErrorProps {
  file: FileItem<FormFile>;
  message: string;
  updateFile: UpdateFile<FormFile>;
}

export interface OnUploadProgressProps {
  file: FileItem<FormFile>;
  event: any;
  updateFile: UpdateFile<FormFile>;
}

export interface HandleClickDeleteFileProps {
  file: FileItem<FormFile>;
  removeFile: RemoveFile<FormFile>;
  updateFile: UpdateFile<FormFile>;
}

export interface HandleClickRetryUploadProps {
  file: FileItem<FormFile>;
  retryUpload: RetryUpload<FormFile>;
}

export interface ObservacaoInfo {
  observacao: {
    isValid: boolean;
    value: string;
  }
}

export interface ExcecaoInfo {
  justificativa: {
    isValid: boolean;
    value: string;
  }
}

export type TipoJustificativaInfo = 'enviar-excecao-oito' | 'reprovar-demanda' | 'enviar-esteira-oito' | '';

export interface JustificativaInfo {
  tipo: TipoJustificativaInfo;
  title: Partial<{
    text: string;
  }>,
  justificativa: Partial<{
    isValid: boolean;
    value: string;
  }>
}
