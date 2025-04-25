'use server';

import 'dotenv/config';

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { services } from './service';
import { api } from '@/actionsV2/api';

const schemas = {
  signIn: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
  signOutByUserEmail: z.object({
    email: z.string(),
  }),
  newPasswordRequired: z.object({
    userId: z.string().uuid(),
    userSession: z.string(),
    password: z.string(),
    passwordConfirm: z.string(),
  }),
  forgotPassword: z.object({
    email: z.string().email(),
  }),
  forgotPasswordConfirm: z.object({
    email: z.string().email(),
    code: z.string(),
    password: z.string(),
    passwordConfirm: z.string(),
  }),
}

export const signInAction = actionClient
  .schema(schemas.signIn)
  .action(async ({ parsedInput: params }) => {
    try {
      const result = await services.signIn({
        email: params.email,
        password: params.password,
      });

      return { 
        success: true, 
        result, 
        error: null 
      };
    } catch (error: any) {
      return { 
        success: false, 
        result: null, 
        error: { 
          message: error.message 
        } 
      };
    }
  }
);

export const signOutByUserEmailAction = actionClient
  .schema(schemas.signOutByUserEmail)
  .action(async ({ parsedInput: params }) => {
    try {
      const result = await services.signOutByUserEmail({
        email: params.email,
      });

      return { 
        success: true, 
        result, 
        error: null 
      };
    } catch (error: any) {
      return { 
        success: false, 
        result: null, 
        error: { 
          message: error.message 
        } 
      };
    }
  }
);

export const newPasswordRequiredAction = actionClient
  .schema(schemas.newPasswordRequired)
  .action(async ({ parsedInput: params }) => {
    try {
      const result = await services.newPasswordRequired({
        userId: params.userId,
        userSession: params.userSession,
        password: params.password,
        passwordConfirm: params.passwordConfirm,
      });

      return { 
        success: true, 
        result, 
        error: null 
      };
    } catch (error: any) {
      return { 
        success: false, 
        result: null, 
        error: { 
          message: error.message 
        } 
      };
    }
  }
);

export const forgotPasswordAction = actionClient
  .schema(schemas.forgotPassword)
  .action(async ({ parsedInput: params }) => {
    try {
      const result = await services.forgotPassword({
        email: params.email,
      });

      return { 
        success: true, 
        result, 
        error: null 
      };
    } catch (error: any) {
      return { 
        success: false, 
        result: null, 
        error: { 
          message: error.message 
        } 
      };
    }
  }
);

export const forgotPasswordConfirmAction = actionClient
  .schema(schemas.forgotPasswordConfirm)
  .action(async ({ parsedInput: params }) => {
    try {
      const result = await services.forgotPasswordConfirm({
        email: params.email,
        code: params.code,
        password: params.password,
        passwordConfirm: params.passwordConfirm,
      });

      return { 
        success: true, 
        result, 
        error: null 
      };
    } catch (error: any) {
      return { 
        success: false, 
        result: null, 
        error: { 
          message: error.message 
        } 
      };
    }
  }
); 