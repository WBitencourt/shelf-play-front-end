import { util } from "@/utils";
import { 
  signInAction, 
  signOutByUserEmailAction, 
  newPasswordRequiredAction, 
  forgotPasswordAction, 
  forgotPasswordConfirmAction 
} from "./action";
import { User } from "./service";

interface SignInParams {
  email: string;
  password: string;
}

interface SignOutByUserEmailParams {
  email: string;
}

interface NewPasswordRequiredParams {
  userId: string;
  userSession: string;
  password: string;
  passwordConfirm: string;
}

interface ForgotPasswordParams {
  email: string;
}

interface ForgotPasswordConfirmParams {
  email: string;
  code: string;
  password: string;
  passwordConfirm: string;
}

interface SignInResponse {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
  user: User;
}

interface SignOutByUserEmailResponse {
  success: boolean;
}

interface NewPasswordRequiredResponse {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
  user: User;
}

interface ForgotPasswordResponse {
  success: boolean;
}

interface ForgotPasswordConfirmResponse {
  success: boolean;
}

const signIn = async (params: SignInParams): Promise<SignInResponse> => {
  const response = await signInAction(params);

  const result = util.actions.convertResponseActionData(response?.data) ?? {
    accessToken: '',
    refreshToken: '',
    tokenId: '',
    user: {} as User,
  };

  return {
    accessToken: result.accessToken ?? '',
    refreshToken: result.refreshToken ?? '',
    tokenId: result.tokenId ?? '',
    user: result.user ?? {} as User,
  };
}

const signOutByUserEmail = async (params: SignOutByUserEmailParams): Promise<SignOutByUserEmailResponse> => {
  const response = await signOutByUserEmailAction(params);

  util.actions.convertResponseActionData(response?.data);

  return {
    success: true,
  };
}

const newPasswordRequired = async (params: NewPasswordRequiredParams): Promise<NewPasswordRequiredResponse> => {
  const response = await newPasswordRequiredAction(params);

  const result = util.actions.convertResponseActionData(response?.data) ?? {
    accessToken: '',
    refreshToken: '',
    tokenId: '',
    user: {} as User,
  };

  return {
    accessToken: result.accessToken ?? '',
    refreshToken: result.refreshToken ?? '',
    tokenId: result.tokenId ?? '',
    user: result.user ?? {} as User,
  };
}

const forgotPassword = async (params: ForgotPasswordParams): Promise<ForgotPasswordResponse> => {
  const response = await forgotPasswordAction(params);

  util.actions.convertResponseActionData(response?.data);

  return {
    success: true,
  };
}

const forgotPasswordConfirm = async (params: ForgotPasswordConfirmParams): Promise<ForgotPasswordConfirmResponse> => {
  const response = await forgotPasswordConfirmAction(params);

  util.actions.convertResponseActionData(response?.data);

  return {
    success: true,
  };
}

export const authActions = {
  signIn,
  signOutByUserEmail,
  newPasswordRequired,
  forgotPassword,
  forgotPasswordConfirm,
} 