import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware'
import { getAuthenticatedUser } from "@/actions/bff/user";
import { util } from "@/utils";
import { parseCookies, destroyCookie } from 'nookies';
import { toast } from "@/utils/toast";

import { 
  signIn as signInAction,
  newPasswordRequired as newPasswordRequiredAction,
  getCredentialsAuthentication as getCredentialsAuthenticationAction,
  signOut as signOutAction,
  resendCodeVerificationSignUp as resendCodeVerificationSignUpAction,
  forgotPassword as forgotPasswordAction,
  forgotPasswordConfirm as forgotPasswordConfirmAction,
  updatePasswordUser as updatePasswordUserAction,
  signOutByUserEmail,
 } from "@/actions/auth";

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

interface SignInParams {
  email: string;
  password: string;
}

interface ForgotPasswordParams {
  email: string;
}

interface ForgotPasswordConfirmParams {
  email: string, 
  code: string, 
  newPassword: string, 
  newPasswordConfirm: string,
}

interface ResendCodeVerificationSignUpParams {
  email: string;
}

interface UpdatePasswordUserParams {
  newPassword: string;
  newPasswordConfirm: string;
}

export interface CredentialsAuthentication {
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

interface NewPasswordRequiredParams {
  newPassword: string, 
  newPasswordConfirm: string,
}

interface AuthState {
  session: string | undefined;
  ACCESS_TOKEN_EXPIRE_TIME_S: number;
  accessToken: string | undefined;
  tokenId: string | undefined;
  isAuthenticated: boolean | undefined;
  user: User | null;
  countUnauthorized: number;

  updateUser: (props: User | null) => void;
  signIn: (props: SignInParams) => Promise<string>;
  signOut: (redirectTo?: string) => Promise<void>;
  newPasswordRequired: (props: NewPasswordRequiredParams) => Promise<void>;
  resendCodeVerificationSignUp: (props: ResendCodeVerificationSignUpParams) => Promise<void>;
  forgotPassword: (props: ForgotPasswordParams) => Promise<void>;
  forgotPasswordConfirm: (props: ForgotPasswordConfirmParams) => Promise<void>;
  updatePasswordUser: (props: UpdatePasswordUserParams) => Promise<void>;
  refreshAuthenticatedUser: () => Promise<User>;
  increaseCountUnauthorized: () => void;
  clearCountUnauthorized: () => void;
  revalidateAccessToken: () => Promise<CredentialsAuthentication>;
  destroySession: () => void;
  scheduleRevalidateAccessToken: (ACCESS_TOKEN_EXPIRE_TIME_MS: number) => Promise<void>;
  updateIsAuthenticated: (isAuthenticated: boolean | undefined) => void;
}

type Set = {
  (partial: AuthState | Partial<AuthState> | ((state: AuthState) => AuthState | Partial<AuthState>), replace?: false | undefined): void;
  (state: AuthState | ((state: AuthState) => AuthState), replace: true): void;
};

type Get = () => AuthState

const updateUser = (get: Get, set: Set) => (newUser: User | null) => {
  set({
    user: newUser
  })
}

const signIn = (get: Get, set: Set) => async ({ email, password }: SignInParams) => {
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

    const response = await signInAction({ email, password });

    const credentials = util.actions.convertResponseActionData(response?.data);

    if(!credentials) {
      throw new Error('Não foi possível obter as credenciais de acesso do usuário', { cause: 'validation' });
    }

    if(credentials.challenge.name === 'NEW_PASSWORD_REQUIRED') {
      try {
        const userAttributes = JSON.parse(credentials.challenge.parameters?.userAttributes);

        if(!credentials.challenge.parameters?.USER_ID_FOR_SRP || !userAttributes?.email) {
          throw new Error('Não foi possível identificar o usuário', { cause: 'validation' })
        }

        set({ 
          session: credentials.session, 
        })

        get().updateUser({ 
          id: credentials.challenge.parameters?.USER_ID_FOR_SRP, 
          name: credentials?.user.name,
          email: credentials?.user.email,
          createdAt: credentials?.user.createdAt,
          updatedAt: credentials?.user.updatedAt,
          enabled: credentials?.user.enabled,
          rules: credentials?.user.rules,
        });
    
        return '/auth/challenges/new_password_required' as string;
      } catch (error: any) {
        if(error?.cause === 'validation') {
          throw new Error(error.message, { cause: error?.cause });
        }

        throw new Error('Falha ao redirecionar usuário para alteração de senha')
      }
    } 

    const accessToken = credentials?.accessToken;
    const tokenId = credentials?.tokenId;

    if(!tokenId || !accessToken) {
      throw new Error('Não foi possível obter as credenciais de acesso do usuário', { cause: 'validation' });
    }

    const ACCESS_TOKEN_EXPIRE_TIME_MS = credentials.ACCESS_TOKEN_EXPIRE_TIME_S * 1000; //seconds to milliseconds

    if(ACCESS_TOKEN_EXPIRE_TIME_MS <= 0) {
      destroySession(get, set)();
      return '/auth/login' as string;
    }

    scheduleRevalidateAccessToken(get, set)(ACCESS_TOKEN_EXPIRE_TIME_MS);

    get().updateUser({
      id: credentials.user.id,
      name: credentials.user.name,
      email: credentials.user.email,
      createdAt: credentials.user.createdAt,
      updatedAt: credentials.user.updatedAt,
      enabled: credentials.user.enabled,
      rules: credentials.user.rules,
    })

    set({ accessToken, tokenId, isAuthenticated: true });

    //right way is get that data from endpoint sign in
    //That way is not necessary to get that data from endpoint refreshAuthenticatedUser
    await refreshAuthenticatedUser(get, set)();

    const {'everest.intended_url_after_login': intendedUrl } = parseCookies();

    if(intendedUrl) {
      destroyCookie(undefined, 'everest.intended_url_after_login', { path: '/' });
      return intendedUrl as string;
    }

    return '/home' as string;
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

const signOut = (get: Get, set: Set) => async () => { 
  try {
    const response = await signOutByUserEmail({
      email: get().user?.email ?? '',
    });

    util.actions.checkHaveError(response?.data);

    destroySession(get, set)();  
  } catch(error: any) {
    throw new Error(error?.message ?? 'Necessário realizar o login novamente');
  }
}

const newPasswordRequired = (get: Get, set: Set) => async ({
  newPassword,
  newPasswordConfirm,
}: NewPasswordRequiredParams) => {
  try {
    if(!newPassword! || !newPasswordConfirm) {
      throw new Error('Senha obrigatória', { cause: 'validation' });
    }

    if(newPassword !== newPasswordConfirm) {
      throw new Error('Verifique as senhas digitadas, há divergências entre elas', { cause: 'validation' });
    }

    const response = await newPasswordRequiredAction({ 
      password: newPassword, 
      passwordConfirm: newPasswordConfirm, 
      userId: get().user?.id ?? '',
      userSession: get().session ?? '',
    });

    const credentials = util.actions.convertResponseActionData(response?.data);

    if(!credentials) {
      throw new Error('Não foi possível obter as credenciais de acesso do usuário', { cause: 'validation' });
    }

    const accessToken = credentials?.accessToken;
    const tokenId = credentials?.tokenId;

    if(!tokenId || !accessToken) {
      throw new Error('Não foi possível obter as credenciais de acesso do usuário', { cause: 'validation' });
    }

    const ACCESS_TOKEN_EXPIRE_TIME_MS = credentials.ACCESS_TOKEN_EXPIRE_TIME_S * 1000; //seconds to milliseconds

    if(ACCESS_TOKEN_EXPIRE_TIME_MS <= 0) {
      destroySession(get, set)();
      return;
    }

    scheduleRevalidateAccessToken(get, set)(ACCESS_TOKEN_EXPIRE_TIME_MS);

    updateUser(get, set)({
      id: credentials.user.id,
      name: credentials.user.name,
      email: credentials.user.email,
      createdAt: credentials.user.createdAt,
      updatedAt: credentials.user.updatedAt,
      enabled: credentials.user.enabled,
      rules: credentials.user.rules,
    })

    set({ accessToken, tokenId, isAuthenticated: true });

    //right way is get that data from endpoint sign in
    //That way is not necessary to get/update that data from endpoint refreshAuthenticatedUser
    await refreshAuthenticatedUser(get, set)();
  } catch (error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Falha ao alterar a senha do usuário');
  }
}

const resendCodeVerificationSignUp = (get: Get, set: Set) => async ({ email }: ResendCodeVerificationSignUpParams) => {
  try {
    const response = await resendCodeVerificationSignUpAction({ email });

    util.actions.checkHaveError(response?.data);
  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Falha ao reenviar código de verificação');
  }
}

const forgotPassword = (get: Get, set: Set) => async ({ email }: ForgotPasswordParams) => {
  try {
    if(!email) {
      throw new Error('E-mail obrigatório.', { cause: 'validation' });
    }

    updateUser(get, set)({
      id: '',
      name: '',
      email,
      createdAt: '',
      updatedAt: '',
      enabled: false,
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
      }
    })

    const response = await forgotPasswordAction({ email });

    util.actions.checkHaveError(response?.data);

  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Usuário não existe ou está desabilitado');
  }
}

const forgotPasswordConfirm = (get: Get, set: Set) => async ({
  email, 
  code, 
  newPassword, 
  newPasswordConfirm
}: ForgotPasswordConfirmParams) => {
  try {
    if(!email) {
      throw new Error('E-mail obrigatório.', {cause: 'validation'});
    }

    if(!code) {
      throw new Error('Código obrigatório.', {cause: 'validation'});
    }

    if(!newPassword || !newPasswordConfirm) {
      throw new Error('Senha obrigatória.', {cause: 'validation'});
    }

    if(newPassword !== newPasswordConfirm) {
      throw new Error('Verifique as senhas digitadas, há divergências entre elas.', {cause: 'validation'});
    }

    const response = await forgotPasswordConfirmAction({ 
      email, 
      code, 
      password: newPassword,
      passwordConfirm: newPasswordConfirm,
    });

    util.actions.checkHaveError(response?.data);

  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Falha ao realizar a alteração de senha');
  }
}

const updatePasswordUser = (get: Get, set: Set) => async ({ newPassword, newPasswordConfirm }: UpdatePasswordUserParams) => {
  try { 
    if(!newPassword || !newPasswordConfirm) {
      throw new Error('Campos obrigatórios, digite sua nova senha.', {cause: 'validation'});
    }

    if(newPassword !== newPasswordConfirm) {
      throw new Error('Verifique as senhas digitadas, há divergências entre elas.', {cause: 'validation'});
    }

    const response = await updatePasswordUserAction({ 
      password: newPassword, 
      passwordConfirm: newPasswordConfirm 
    });

    util.actions.checkHaveError(response?.data);

  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Falha ao atualizar a senha do usuário');
  }
}

const destroySession = (get: Get, set: Set) => () => {
  try {
    console.log('DESTRUINDO SESSÃO CLIENTE', new Date().toISOString());

    updateUser(get, set)(null);
    
    set({ 
      accessToken: undefined, 
      tokenId: undefined, 
      isAuthenticated: false,
      session: undefined,
      user: undefined, 
    });
  } catch(error: any ) {
    throw new Error('Falha ao encerrar a sessão do usuário');
  }
}

const refreshAuthenticatedUser = (get: Get, set: Set) => async (): Promise<User> => {
  try {

    const defaultUser = {
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
      }
    }

    if(!get().isAuthenticated) {
      return defaultUser
    }

    const response = await getAuthenticatedUser();

    const dadosUsuario = util.actions.convertResponseActionData(response?.data);

    if(!dadosUsuario) {
      return defaultUser;
    }

    updateUser(get, set)(dadosUsuario);

    return dadosUsuario;

  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    } 

    throw new Error(error?.message ?? 'Falha ao obter detalhes do usuário');
  }
}

const revalidateAccessToken = (get: Get, set: Set) => async (): Promise<CredentialsAuthentication> => {
  try {
    set({ 
      isAuthenticated: undefined, 
    });

    const credentials = await getCredentialsAuthentication(get, set)();

    if(!credentials?.accessToken) {
      destroySession(get, set)();
      return credentials;
    }
  
    set({ 
      accessToken: credentials.accessToken, 
      isAuthenticated: true, 
    });
  
    return credentials;
  } catch(error: any) {
    destroySession(get, set)();

    throw new Error(error?.message ?? 'Falha ao revalidar o token de acesso do usuário');
  }
}

const scheduleRevalidateAccessToken = (get: Get, set: Set) => async (ACCESS_TOKEN_EXPIRE_TIME_MS: number): Promise<void> => { 
  try {
    if(!ACCESS_TOKEN_EXPIRE_TIME_MS || ACCESS_TOKEN_EXPIRE_TIME_MS <= 0) {
      return;
    }

    const revalidate = async () => {
      const credentials = await revalidateAccessToken(get, set)();

      const EXPIRE_TIME_MS = credentials.ACCESS_TOKEN_EXPIRE_TIME_S * 1000; //seconds to milliseconds
      scheduleRevalidateAccessToken(get, set)(EXPIRE_TIME_MS);
    };

    setTimeout(revalidate, ACCESS_TOKEN_EXPIRE_TIME_MS);
  } catch(error: any) {
    destroySession(get, set)();
    
    toast.error({
      title: 'Falha ao agendar revalidação do token',
      description: error?.message || 'Necessário realizar o login novamente',
    });
  }
}

const getCredentialsAuthentication = (get: Get, set: Set) => async (): Promise<CredentialsAuthentication> => {
  try {
    const response = await getCredentialsAuthenticationAction();

    const credentials = util.actions.convertResponseActionData(response?.data);

    if(!credentials) {
      throw new Error('Não foi possível obter as credenciais de acesso do usuário', { cause: 'validation' });
    }

    return credentials;
  } catch(error: any) {
    if(error?.cause === 'validation') {
      throw new Error(error.message, { cause: error?.cause });
    }

    throw new Error(error?.message ?? 'Falha ao obter as credenciais de acesso do usuário');
  }
}

const increaseCountUnauthorized = (get: Get, set: Set) => () => {
  set({ countUnauthorized: get().countUnauthorized + 1 });
}

const clearCountUnauthorized = (get: Get, set: Set) => () => {
  set({ countUnauthorized: 0 });
}

const updateIsAuthenticated = (get: Get, set: Set) => (isAuthenticated: boolean | undefined) => {
  set({ isAuthenticated });
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => {   
    return {
      session: undefined,
      accessToken: undefined,
      ACCESS_TOKEN_EXPIRE_TIME_S: 0,
      tokenId: undefined,
      isAuthenticated: undefined,
      user: null,
      countUnauthorized: 0,

      updateIsAuthenticated: updateIsAuthenticated(get, set),
      updateUser: updateUser(get, set),
      signIn: signIn(get, set),
      signOut: signOut(get, set),
      newPasswordRequired: newPasswordRequired(get, set),
      resendCodeVerificationSignUp: resendCodeVerificationSignUp(get, set),
      forgotPassword: forgotPassword(get, set),
      forgotPasswordConfirm: forgotPasswordConfirm(get, set),
      updatePasswordUser: updatePasswordUser(get, set),
      destroySession: destroySession(get, set),
      refreshAuthenticatedUser: refreshAuthenticatedUser(get, set),
      revalidateAccessToken: revalidateAccessToken(get, set),
      increaseCountUnauthorized: increaseCountUnauthorized(get, set),
      clearCountUnauthorized: clearCountUnauthorized(get, set),
      scheduleRevalidateAccessToken: scheduleRevalidateAccessToken(get, set),
    }
  }
))
