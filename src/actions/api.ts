import { cookies } from 'next/headers'

const baseUrl = process.env.NEXT_PUBLIC_EVEREST_RESOURCES_SERVER;

const apiAuthenticated = async (input: string, options: RequestInit | undefined = {}): Promise<Response> => {
  const finalUrl = input.includes('://') ? input : baseUrl + input;
  
  try {    
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('everest_server.access_token')

    options.headers = {
      ...options.headers,
      'Authorization': accessToken?.value ?? '',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    return await fetch(finalUrl, options);
  } catch (error: any) {
    const genericMessageError = `HTTP Error ${options?.method}: ${finalUrl}`;
  
    throw new Error(error?.message ?? genericMessageError);
  }
}

const apiSendFile = async (url: string, options: RequestInit | undefined = {}): Promise<Response> => {
  try {    
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('everest_server.access_token')

    options.headers = {
      ...options.headers,
      'Authorization': accessToken?.value ?? '',
      'Accept': 'application/json',
    };

    const finalUrl = url.includes('://') ? url : baseUrl + url;

    return await fetch(finalUrl, options);
  } catch (error) {
    throw error;
  }
}

const apiNoAuthentication = async (url: string, options: RequestInit | undefined = {}): Promise<Response> => {
  try {    
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const finalUrl = url.includes('://') ? url : baseUrl + url;

    return await fetch(finalUrl, options);
  } catch (error) {
    throw error;
  }
}

const apiLogout = async (input: string, options: RequestInit | undefined = {}): Promise<Response> => {
  try {    
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('everest_server.access_token')

    options.headers = {
      ...options.headers,
      'Authorization': accessToken?.value ?? '',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const finalUrl = input.includes('://') ? input : baseUrl + input;

    const response = await fetch(finalUrl, options);

    if(response.status === 401) {
      console.log('apiLogout', 'Usuário com credenciais inválidas ou revogadas.');

      return {
        ...response,
        ok: true,
        status: 200,
        statusText: 'OK',
        body: null,
      }
    }

    return response;
  } catch (error) {
    throw error;
  }
}

const json = async (response: Response) => {
  const httpMessage = `HTTP ${response?.status} ${response?.statusText} ${response?.url}`

  try {
    if(response.headers.get('content-type')?.includes('application/json')) {
      return await response.json();
    }
  
    const text = await response.text();

    return {
      message: `${httpMessage} - ${text}`,
    }
  } catch (error: any) {
    return {
      message: `${httpMessage} - ${error?.message}`,
    }
  }
}

export const api = {
  authenticated: apiAuthenticated,
  sendFile: apiSendFile,  
  noAuthenticated: apiNoAuthentication,
  logout: apiLogout,
  json,
}
