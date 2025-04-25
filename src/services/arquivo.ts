import { readBlobAsText } from "@/utils/Blob";
import { api } from "./api";

interface GetFileUrlFromS3 {
  s3Key: string;
  s3Bucket: string;
}

const baseUrl = process.env.NEXT_PUBLIC_EVEREST_RESOURCES_SERVER;

export interface ArquivoState {
  submitFile: (props: SubmitFileProps) => Promise<SubmitFileResponse>;
  deleteFile: (props: DeleteFileProps) => Promise<void>;
  getFileUrlFromS3: (props: GetFileUrlFromS3) => Promise<string>;
}

interface ArquivoServices {
  submitFile: (props: SubmitFileProps) => Promise<any>;
  deleteFile: (props: DeleteFileProps) => Promise<void>;
  getFileUrlFromS3: (props: GetFileUrlFromS3) => Promise<string>;
}

export interface SubmitFileProps {
  demandaPk: string;
  file: {
    name: string;
    dropzoneFile: File;
  };
  onUploadProgress: (progressEvent: any) => void;
}

interface SubmitFileResponse {
  id: string;
  sk: string;
  s3Key: string;
  s3Bucket: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  tipo: string;
}

interface DeleteFileProps {
  demandaPk: string | undefined;
  demandaSk: string | undefined;
}

const submitFile = async ({ demandaPk, file, onUploadProgress }: SubmitFileProps): Promise<SubmitFileResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file.dropzoneFile, file.name);

    const response = await api.file(`/arquivo/${demandaPk}/novo_arquivo`, formData, onUploadProgress);
    const data = response?.data;

    console.log('submitFile',data);

    return {
      id: data?.sk,
      sk: data?.sk,
      s3Key: data?.value?.s3Key,
      s3Bucket: data?.value?.s3Bucket,
      mimeType: data?.value?.mime_type,
      fileName: data?.value?.file_name,
      fileSize: data?.value?.file_size,
      tipo: data?.value?.tipo ?? '',
    };
  } catch (error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error);
    }

    throw new Error(error?.message ?? 'Falha ao enviar o arquivo');
  } 
}

const deleteFile = async ({ demandaPk, demandaSk }: DeleteFileProps) => {
  try {
    if (!demandaPk) {
      throw new Error(`Falha ao deletar o arquivo. Pk da demanda obrigatória`, { cause: 'validation' })
    }

    if (!demandaSk) {
      throw new Error(`Falha ao deletar o arquivo. Sk do arquivo obrigatório`, { cause: 'validation' })
    }

    const demandaSkBase64 = btoa(demandaSk);

    const response = await api.fetch(`${baseUrl}/arquivo/${demandaPk}/remover_sk_base_64/${demandaSkBase64}`, {
      method: 'DELETE',
    });

    if(!response?.ok) {
      const json = await response?.json();

      throw new Error(json?.message ?? 'Falha ao deletar o arquivo');
    }

    return;
  } catch (error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error);
    }

    throw new Error(error?.message ?? 'Falha ao deletar o arquivo');
  } 
}

const getFileUrlFromS3 = async ({ s3Key, s3Bucket }: GetFileUrlFromS3) => {
  try {
    if(!s3Key || !s3Bucket) {
      throw new Error(`Falha ao obter a URL do arquivo. s3Key e s3Bucket obrigatórios`, { cause: 'validation' })
    }

    const response = await api.fetch(`/arquivo/file_viewer`, {
      method: 'POST',
      body: JSON.stringify({
        s3Key,
        s3Bucket,
      })
    });

    if(!response?.ok) {
      const json = await response?.json();

      throw new Error(json?.message ?? 'Falha ao obter a URL do arquivo');
    }

    const data = await response?.blob();

    const extensionFile = s3Key.split('.').pop();

    let type = 'application/pdf';

    if(extensionFile === 'txt') {
      type = 'text/plain';
    }

    if(extensionFile === 'pdf') {
      type = 'application/pdf';
    }

    // if(data.type === 'application/pdf') {
    //   type = 'application/pdf';
    // }

    // if(data.type === 'text/plain') {
    //   type = 'text/plain';
    // }

    const fileBlob = new Blob([data], { type });
    const url = URL.createObjectURL(fileBlob);

    return url;
  } catch (error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error);
    }

    if(error?.message) {
      throw new Error(error.message);
    }

    if (error.response && error.response.data instanceof Blob) {
      const errorResponseText = await readBlobAsText(error.response.data);
      
      const errorMessage = errorResponseText ?? 
        `Falha ao obter a URL do arquivo`;
      
      throw new Error(errorMessage);
    } 

    const errorResponseMessage = error.response?.data?.message;
    
    throw new Error(errorResponseMessage ?? 
      `Falha ao obter a URL do arquivo`
    );
  } 
}

export const arquivo: ArquivoServices = {
  submitFile,
  deleteFile,
  getFileUrlFromS3,
}
