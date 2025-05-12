import { cookies } from 'next/headers'

const baseUrl = process.env.NEXT_PUBLIC_EVEREST_RESOURCES_SERVER;

const apiAuthenticated = async (input: string, options: RequestInit | undefined = {}): Promise<Response> => {
  const finalUrl = input.includes('://') ? input : baseUrl + input;
  
  try {    
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('shelf-play-server.access_token')

    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken?.value ?? ''}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    return await fetch(finalUrl, options);
  } catch (error) {
    if(error instanceof Error) {
      throw new Error(`HTTP ${options?.method} ${finalUrl} - ${error?.message}`);
    }
  
    throw error;
  }
}

const apiSendFile = async (url: string, options: RequestInit | undefined = {}): Promise<Response> => {
  const finalUrl = url.includes('://') ? url : baseUrl + url;

  try {    
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('shelf-play-server.access_token')

    options.headers = {
      ...options.headers,
      'Authorization': accessToken?.value ?? '',
      'Accept': 'application/json',
    };

    return await fetch(finalUrl, options);
  } catch (error) {
    if(error instanceof Error) {
      throw new Error(`HTTP ${options?.method} ${finalUrl} - ${error?.message}`);
    }
  
    throw error;
  }
}

const apiNoAuthentication = async (url: string, options: RequestInit | undefined = {}): Promise<Response> => {
  const finalUrl = url.includes('://') ? url : baseUrl + url;

  try {    
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    return await fetch(finalUrl, options);
  } catch (error) {
    if(error instanceof Error) {
      throw new Error(`HTTP ${options?.method} ${finalUrl} - ${error?.message}`);
    }
  
    throw error;
  }
}


const apiLogout = async (input: string, options: RequestInit | undefined = {}): Promise<Response> => {
  const finalUrl = input.includes('://') ? input : baseUrl + input;

  try {    
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('shelf-play_server.access_token')

    options.headers = {
      ...options.headers,
      'Authorization': accessToken?.value ?? '',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

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
    if(error instanceof Error) {
      throw new Error(`HTTP ${options?.method} ${finalUrl} - ${error?.message}`);
    }
  
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
  } catch (error) {
    if(error instanceof Error) {
      return {
        message: `${httpMessage} - ${error?.message}`,
      }
    }

    return {
      message: 'Falha ao processar a resposta da API.',
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
