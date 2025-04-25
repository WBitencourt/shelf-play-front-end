import { isValidJSON } from '@/utils/Json';
import { useAuthStore } from '@/zustand-store/auth.store';

interface UploadProgressHandler {
  (event: ProgressEvent<EventTarget>): void;
}

const apiFetch = async (url: string, options: RequestInit | undefined = {}): Promise<Response> => {
  try {  
    const baseUrl = process.env.NEXT_PUBLIC_EVEREST_RESOURCES_SERVER;
    const accessToken = useAuthStore.getState().accessToken ?? '';
  
    options.headers = {
      ...options.headers,
      'Authorization': accessToken ?? '',
      //'id-token': tokenId ?? '',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const finalUrl = url.includes('://') ? url : baseUrl + url;

    const response = await fetch(finalUrl, options);

    if(response.status === 401) {
      useAuthStore.getState().signOut();
      
      throw new Error('Usuário não autenticado, por favor faça login novamente.');
    }

    return response;
  } catch (error) {
    throw error;
  }
}

const apiPostFile = async (
  url: string,
  data: FormData,
  onUploadProgress?: UploadProgressHandler
): Promise<any> => {
  try {
    return await new Promise((resolve, reject) => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_EVEREST_RESOURCES_SERVER;
        const accessToken = useAuthStore.getState().accessToken ?? '' ;
    
        const xhr = new XMLHttpRequest();
    
        const finalUrl = url.includes('://') ? url : baseUrl + url;
    
        xhr.open('POST', finalUrl, true);
    
        xhr.setRequestHeader('Authorization', accessToken);
    
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onUploadProgress) {
            onUploadProgress(event);
          }
        };
    
        xhr.onload = () => {

          const isValidJson = isValidJSON(xhr.response);

          if(!isValidJson) {
            reject({ message: xhr.response.toString() });
          }
          
          const data = xhr.response ? JSON.parse(xhr.response) : {};
    
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ data });
          } else {
            reject(data);
          }
        };
    
        xhr.onerror = () => {
          const isValidJson = isValidJSON(xhr.response);

          if(!isValidJson) {
            reject({ message: xhr.response.toString() });
          }
          
          const data = xhr.response ? JSON.parse(xhr.response) : {};
    
          reject(data);
        };
    
        xhr.send(data);
      } catch(error: any) {
        reject({ message: error?.message ?? 'Erro ao realizar upload de arquivo.' });
      }
    });
  } catch(error: any) {
    throw error
  }
};

export const api = {
  fetch: apiFetch,
  file: apiPostFile,
}
