import { FileRejection } from "react-dropzone";
import { api } from "./api";

interface ResponseSubmitFile {
  fileSk: string;
  idDemanda: string;
  fileName: string;
  mimeType: string;
  s3Region: string;
  tipo: string;
  s3Bucket: string;
  s3Key: string;
  cliente: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  size: number;
  sizeFormatted: string;
  allowDelete: boolean;
}

interface SubmitInterviewFileProps {
  cliente: string | undefined;
  numeroProcesso?: string | undefined;
  identificacao?: string | undefined;
  tipoDocumento?: string | undefined;
  dataCarimbo?: string | undefined;
  prioridade?: boolean | undefined;
  observacao?: string | undefined; 
  file: {
    name: string | undefined;
    dropzoneFile: File;
  } | undefined;
  onUploadProgress?: (progressEvent: any) => void;
}

interface SubmitBatchFileProps {
  cliente: string | undefined;
  file: {
    name: string;
    dropzoneFile: File;
  } | undefined;
  onUploadProgress: (progressEvent: any) => void;
}

interface PortalUploadServices {
  submitBatchFile: (props: SubmitBatchFileProps) => Promise<ResponseSubmitFile>;
  submitInterviewFile: (props: SubmitInterviewFileProps) => Promise<ResponseSubmitFile>;
}

const submitInterviewFile = async ({ 
  file, 
  cliente,
  numeroProcesso,
  identificacao,
  tipoDocumento,
  dataCarimbo,
  prioridade,
  observacao, 
  onUploadProgress 
}: SubmitInterviewFileProps) => {
  try {
    if(!file) {
      throw new Error(`Falha ao enviar o arquivo. Arquivo obrigatório`, { cause: 'validation' })
    }

    if(!cliente) {
      throw new Error(`Falha ao enviar o arquivo. Cliente obrigatório`, { cause: 'validation' })
    }

    const data = new FormData();
    data.append('file', file.dropzoneFile, file.name);
    data.append('cliente', cliente);
    data.append('processo', numeroProcesso ?? '');
    data.append('identificacao', identificacao ?? '');
    data.append('tipo', tipoDocumento ?? '');
    data.append('data_carimbo', dataCarimbo ?? '');
    data.append('prioridade', prioridade?.toString() ?? 'false');
    data.append('observacao', observacao ?? '');

    const response = await api.file(`/portaluploads`, data, onUploadProgress);

    const item = response?.data;

    const arquivo: ResponseSubmitFile = {
      fileSk: item?.sk ?? item?.id ?? '',
      idDemanda: item?.pk ?? '', 
      fileName: item?.file_name ?? '',
      tipo: item?.tipo ?? '',
      s3Region: item?.s3Region ?? '',
      s3Bucket: item?.s3Bucket ?? '',
      s3Key: item?.s3Key ?? '',
      mimeType: item?.mime_type ?? '',
      cliente: item?.cliente ?? '',
      createdAt: item?.created_at ?? '',
      createdBy: item?.created_by ?? '',
      updatedAt: item?.updated_at ?? '',
      updatedBy: item?.updated_by ?? '',
      size: item?.size ?? 0,
      sizeFormatted: item?.size ? `${(item?.size / 1024).toFixed(2)} KB` : '',
      allowDelete: item?.allow_delete ?? false,
    }
  
    return arquivo;
  } catch (error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error);
    }

    throw new Error(error?.message ?? 'Falha ao enviar o arquivo');
  } 
}

const submitBatchFile = async ({ file, cliente, onUploadProgress }: SubmitBatchFileProps) => {
  try {

    if(!file) {
      throw new Error(`Falha ao enviar o arquivo. Arquivo obrigatório`, { cause: 'validation' })
    }

    if(!cliente) {
      throw new Error(`Falha ao enviar o arquivo. Cliente obrigatório`, { cause: 'validation' })
    }

    const formData = new FormData();
    formData.append('cliente', cliente);
    formData.append('file', file.dropzoneFile, file.name);
    formData.append('processo', '');
    formData.append('identificacao', '');
    formData.append('tipo', '');
    formData.append('data_carimbo', '');
    formData.append('prioridade', 'false');
    formData.append('observacao', '');

    const response = await api.file(`/portaluploads`, formData, onUploadProgress);

    const dados = response?.data;
  
    return dados;
  } catch (error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error);
    }

    throw new Error(error?.message ?? 'Falha ao enviar o arquivo');
  } 
}

export const portalUpload: PortalUploadServices = {
  submitBatchFile,
  submitInterviewFile,
}