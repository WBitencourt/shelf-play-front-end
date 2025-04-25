import { api } from "@/actions/api";
import { cookies } from 'next/headers'
import { getClientesPortalUploadIndividual, getClientesPortalUploadLote } from "../bff/user/service";

interface UserRules {
  adminCliente: string[];
  adminOito: string[];
  consultas: string[];
  excecoes: {
    excecaoCliente: string[];
    excecaoOito: string[];
    excecaoSistemica: string[];
  };
  operadorOito: string[];
  operadorCliente: string[];
  portalUploadLote: string[];
  portalUploadIndividual: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean | undefined;
  rules: UserRules;
}

interface CredentialsAuthentication {
  accessToken: string;
  ACCESS_TOKEN_EXPIRE_TIME_S: number;
  tokenId: string;
  refreshToken: string;
  tokenType: string;
  session: string;
  challenge: {
    name: string;
    parameters: any;
  }
  user: User;
}

interface SignInParams {
  email: string;
  password: string;
}

interface NewPasswordRequiredProps {
  password: string; 
  passwordConfirm: string;
  userSession: string;
  userId: string;
}

interface SaveAuthCredentialsOnServerParams {
  accessToken?: string;
  refreshToken?: string;
  tokenId?: string;
}

interface ResendCodeVerificationSignUpProps {
  email: string;
}

interface ForgotPasswordParams {
  email: string;
}

interface ForgotPasswordConfirmParams {
  email: string, 
  code: string, 
  password: string, 
  passwordConfirm: string,
}

interface UpdatePasswordUserParams {
  password: string, 
  passwordConfirm: string,
}

interface SignOutByUserEmailParams {
  email: string;  
}

async function saveAuthCredentialsOnServer({ accessToken, refreshToken, tokenId }: SaveAuthCredentialsOnServerParams) {
  try {
    const cookieStore = await cookies()

    cookieStore.delete({ name: 'everest_server.access_token', path: '/'});

    cookieStore.delete({ name: 'everest_server.refresh_token', path: '/'});

    cookieStore.delete({ name: 'everest_server.token_id', path: '/'});

    cookieStore.set("everest_server.access_token", accessToken ?? '', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES === 'true',
      path: '/',
      maxAge: 60 * 60 * 24 * 1, // 1 dia
    });

    cookieStore.set("everest_server.refresh_token", refreshToken ?? '', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES === 'true',
      path: '/',
      maxAge: 60 * 60 * 24 * 1, // 1 dia
    })

    cookieStore.set("everest_server.token_id", tokenId ?? '', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES === 'true',
      path: '/',
      maxAge: 60 * 60 * 24 * 1, // 1 dia
    })

    return
  } catch (error: any) {
    throw new Error(error?.message ?? 'Falha ao salvar os dados de autenticação do usuário no servidor');
  }
}

async function destroyAuthCredentialsOnServer() {
  try {
    const cookieStore = await cookies()

    cookieStore.delete({ name: 'everest_server.access_token', path: '/'});

    cookieStore.delete({ name: 'everest_server.refresh_token', path: '/'});

    cookieStore.delete({ name: 'everest_server.token_id', path: '/'});

    return
  } catch (error: any) {
    throw new Error(error?.message ?? 'Falha ao remover os dados de autenticação do usuário no servidor');
  }
}

async function getCredentialsAuthentication(): Promise<CredentialsAuthentication> {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('everest_server.refresh_token')

    if(!refreshToken?.value) {
      await destroyAuthCredentialsOnServer();

      return {
        accessToken: '',
        ACCESS_TOKEN_EXPIRE_TIME_S: 0,
        tokenId: '',
        refreshToken: '',
        tokenType: '',
        session: '',
        challenge: {
          name: '',
          parameters: '',
        },
        user: {
          id: '',
          name: '',
          email: '',
          createdAt: '',
          updatedAt: '',
          enabled: undefined,
          rules: {
            adminCliente: [],
            adminOito: [],
            consultas: [],
            excecoes: {
              excecaoCliente: [],
              excecaoOito: [],
              excecaoSistemica: [],
            },
            operadorOito: [],
            operadorCliente: [],
            portalUploadLote: [],
            portalUploadIndividual: [],
          },
        },
      }
    }

    const response = await api.noAuthenticated(`/auth/refresh_token_auth`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken?.value }),
    })

    const data = await response.json();

    const portalUploadLote = getClientesPortalUploadLote(data?.PortalUpload);
    const portalUploadIndividual = getClientesPortalUploadIndividual(data?.PortalUpload);

    const credentials: CredentialsAuthentication = {
      accessToken: data?.AuthenticationResult?.AccessToken ?? '',
      ACCESS_TOKEN_EXPIRE_TIME_S: data?.AuthenticationResult?.ExpiresIn,
      tokenId: data?.AuthenticationResult?.IdToken ?? '',
      refreshToken: refreshToken.value,
      tokenType: data?.AuthenticationResult?.TokenType ?? '',
      session: data?.Session ?? '',
      challenge: {
        name: data?.ChallengeName ?? '',
        parameters: data?.ChallengeParameters ?? '',
      },
      user: {
        id: data?.user?.user_id ?? '',
        name: data?.user?.user_name ?? '',
        email: data?.user?.user_email ?? '',
        createdAt: data?.created_at ?? '',
        updatedAt: data?.updated_at ?? '',
        enabled: data?.is_active ?? undefined,
        rules: {
          adminCliente: data?.AdminCliente ?? [],
          adminOito: data?.AdminOito ?? [],
          consultas: data?.Consultas ?? [],
          excecoes: {
            excecaoCliente: data?.Excecoes?.ExcecaoCliente ?? [],
            excecaoOito: data?.Excecoes?.ExcecaoOito ?? [],
            excecaoSistemica: data?.Excecoes?.ExcecaoSistemica ?? [],
          },
          operadorOito: data?.OperadorOito ?? [],
          operadorCliente: data?.OperadorCliente ?? [],
          portalUploadLote,
          portalUploadIndividual,
        },
      },
    }

    //Save access token at server side
    await saveAuthCredentialsOnServer({
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenId: credentials.tokenId,
    });

    return credentials;
  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    }

    console.log('DESTRUINDO SESSÃO SERVIDOR', new Date().toISOString());

    destroyAuthCredentialsOnServer();

    throw new Error(error?.message ?? 'Falha ao obter as credenciais de acesso do usuário');
  }
}

async function signIn ({ email, password }: SignInParams): Promise<CredentialsAuthentication> {
  try {
    if (!email && !password) {
      throw new Error('E-mail e senha obrigatórios.', { cause: 'validation' });
    }

    if (!email) {
      throw new Error('E-mail obrigatório.', { cause: 'validation' });
    }

    if (!password) {
      throw new Error('Senha obrigatória.', { cause: 'validation' });
    }

    const response = await api.noAuthenticated(`/auth/signIn`, {
      method: 'POST',
      body: JSON.stringify({ 
        Username: email, 
        Password: password 
      }),
    })

    const data = await response?.json();

    const portalUploadLote = getClientesPortalUploadLote(data?.PortalUpload);
    const portalUploadIndividual = getClientesPortalUploadIndividual(data?.PortalUpload);

    const credentials: CredentialsAuthentication = {
      accessToken: data?.AuthenticationResult?.AccessToken ?? '',
      ACCESS_TOKEN_EXPIRE_TIME_S: data?.AuthenticationResult?.ExpiresIn ?? 0,
      tokenId: data?.AuthenticationResult?.IdToken ?? '',
      refreshToken: data?.AuthenticationResult?.RefreshToken ?? '',
      tokenType: data?.AuthenticationResult?.TokenType ?? '',
      session: data?.Session ?? '',
      challenge: {
        name: data?.ChallengeName ?? '',
        parameters: data?.ChallengeParameters ?? '',
      },
      user: {
        id: data?.user?.user_id ?? '',
        name: data?.user?.user_name ?? '',
        email: data?.user?.user_email ?? '',
        createdAt: data?.created_at ?? '',
        updatedAt: data?.updated_at ?? '',
        enabled: data?.is_active ?? undefined,
        rules: {
          adminCliente: data?.AdminCliente ?? [],
          adminOito: data?.AdminOito ?? [],
          consultas: data?.Consultas ?? [],
          excecoes: {
            excecaoCliente: data?.Excecoes?.ExcecaoCliente ?? [],
            excecaoOito: data?.Excecoes?.ExcecaoOito ?? [],
            excecaoSistemica: data?.Excecoes?.ExcecaoSistemica ?? [],
          },
          operadorOito: data?.OperadorOito ?? [],
          operadorCliente: data?.OperadorCliente ?? [],
          portalUploadLote,
          portalUploadIndividual,
        },
      },
    }

    await saveAuthCredentialsOnServer({
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenId: credentials.tokenId
    });

    return credentials;
  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw error;
    } 

    const message = error?.message && error?.message?.length > 0 ? 
      error?.message 
      : 
      'Falha ao realizar o login, verifique seus dados de acesso';

    throw new Error(message);
  }
}

async function signOut() { 
  try {
    await api.logout(`/auth/signOut`, {
      method: 'POST',
    })

    return 
  } catch(error: any) {
    throw new Error(error?.message ?? 'Necessário realizar o login novamente');
  } finally {
    await destroyAuthCredentialsOnServer();
  }
}

async function signOutByUserEmail({ email }: SignOutByUserEmailParams): Promise<void> { 
  try {
    const userEmailEncoded = encodeURIComponent(email);

    await api.logout(`/auth/admin_signout/${userEmailEncoded}`, {
      method: 'POST',
    })

    return 
  } catch(error: any) {
    throw new Error(error?.message ?? 'Necessário realizar o login novamente');
  } finally {
    await destroyAuthCredentialsOnServer();
  }
}

async function newPasswordRequired({
  password,
  passwordConfirm,
  userSession,
  userId,
}: NewPasswordRequiredProps): Promise<CredentialsAuthentication> {
  try {
    if(!password! || !passwordConfirm) {
      throw new Error('Senha obrigatória', { cause: 'validation' });
    }

    if(password !== passwordConfirm) {
      throw new Error('Verifique as senhas digitadas, há divergências entre elas', { cause: 'validation' });
    }

    const response = await api.noAuthenticated(`/auth/new_password_required`, {
      method: 'POST',
      body: JSON.stringify({ 
        Session: userSession,
        NewPassword: password, 
        UserId: userId
      }),
    })

    const data = await response?.json();

    const portalUploadLote = getClientesPortalUploadLote(data?.PortalUpload);
    const portalUploadIndividual = getClientesPortalUploadIndividual(data?.PortalUpload);

    const credentials: CredentialsAuthentication = {
      accessToken: data?.AuthenticationResult?.AccessToken ?? '',
      ACCESS_TOKEN_EXPIRE_TIME_S: data?.AuthenticationResult?.ExpiresIn,
      tokenId: data?.AuthenticationResult?.IdToken ?? '',
      refreshToken: data?.AuthenticationResult?.RefreshToken ?? '',
      tokenType: data?.AuthenticationResult?.TokenType ?? '',
      session: data?.Session ?? '',
      challenge: {
        name: data?.ChallengeName ?? '',
        parameters: data?.ChallengeParameters ?? '',
      },
      user: {
        id: data?.user?.user_id ?? '',
        name: data?.user?.user_name ?? '',
        email: data?.user?.user_email ?? '',
        createdAt: data?.created_at ?? '',
        updatedAt: data?.updated_at ?? '',
        enabled: data?.is_active ?? undefined,
        rules: {
          adminCliente: data?.AdminCliente ?? [],
          adminOito: data?.AdminOito ?? [],
          consultas: data?.Consultas ?? [],
          excecoes: {
            excecaoCliente: data?.Excecoes?.ExcecaoCliente ?? [],
            excecaoOito: data?.Excecoes?.ExcecaoOito ?? [],
            excecaoSistemica: data?.Excecoes?.ExcecaoSistemica ?? [],
          },
          operadorOito: data?.OperadorOito ?? [],
          operadorCliente: data?.OperadorCliente ?? [],
          portalUploadLote,
          portalUploadIndividual,
        },
      },
    }

    await saveAuthCredentialsOnServer({
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenId: credentials.tokenId,
    });

    return credentials;
  } catch (error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Falha ao alterar a senha do usuário');
  }
}

async function resendCodeVerificationSignUp ({ email }: ResendCodeVerificationSignUpProps) {
  try {
    await api.noAuthenticated(`/auth/resend_confirmation_code`, {
      method: 'POST',
      body: JSON.stringify({ userEmail: email }),
    })

    return;
  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Falha ao reenviar código de verificação');
  }
}

async function forgotPassword({ email }: ForgotPasswordParams) {
  try {
    if(!email) {
      throw new Error('E-mail obrigatório para alterar a senha.', { cause: 'validation' });
    }

    await api.noAuthenticated(`/auth/forgot_password`, {
      method: 'POST',
      body: JSON.stringify({ userEmail: email }),
    })

  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Usuário não existe ou está desabilitado');
  }
}

async function forgotPasswordConfirm({
  email, 
  code, 
  password, 
  passwordConfirm
}: ForgotPasswordConfirmParams) {
  try {
    if(!email) {
      throw new Error('E-mail obrigatório.', {cause: 'validation'});
    }

    if(!code) {
      throw new Error('Código obrigatório.', {cause: 'validation'});
    }

    if(!password || !passwordConfirm) {
      throw new Error('Senha obrigatória.', {cause: 'validation'});
    }

    if(password !== passwordConfirm) {
      throw new Error('Verifique as senhas digitadas, há divergências entre elas.', {cause: 'validation'});
    }

    await api.noAuthenticated(`/auth/confirm_forgot_password`, {
      method: 'POST',
      body: JSON.stringify({ 
        userEmail: email, 
        confirmation_code: code, 
        new_password: password 
      }),
    })

  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Falha ao realizar a alteração de senha');
  }
}

async function updatePasswordUser({ password, passwordConfirm }: UpdatePasswordUserParams) {
  try { 
    if(!password || !passwordConfirm) {
      throw new Error('Campos obrigatórios, digite sua nova senha.', {cause: 'validation'});
    }

    if(password !== passwordConfirm) {
      throw new Error('Verifique as senhas digitadas, há divergências entre elas.', {cause: 'validation'});
    }

    await api.authenticated(`/auth/change_password`, {
      method: 'POST',
      body: JSON.stringify({ 
        new_password: password 
      }),
    })

  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Falha ao atualizar a senha do usuário');
  }
}

export const services = {
  signIn,
  signOut,
  signOutByUserEmail,
  forgotPassword,
  forgotPasswordConfirm,
  updatePasswordUser,
  newPasswordRequired,
  getCredentialsAuthentication,
  resendCodeVerificationSignUp,
}