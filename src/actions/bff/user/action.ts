'use server';

import 'dotenv/config';

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { services } from './service';
import { api } from '@/actions/api';
import { getTranslations } from 'next-intl/server';
import { ActionResultData } from '@/actions/util';

const t = await getTranslations();

const schemas = {
  getUserSafeAction: z.object({
    user: z.object({
      id: z.string({ message: t('actions.user.validation.id') }),
    }),
  }),
}

export const getUserSafeAction = actionClient
  .schema(schemas.getUserSafeAction)
  .action(async <T>({ parsedInput: params }: { parsedInput: z.infer<typeof schemas.getUserSafeAction> }): Promise<ActionResultData<T>> => {
    try {
      const response = await services.getUser({
        user: params.user,
      });
  
      const json = await api.json(response);
    
      if(response?.ok) {    
        return {
          success: true,
          result: json,
          error: null,
          response: {
            status: response.status,
            statusText: response.statusText,
          }
        };
      }
    
      if(response.status === 401) {
        return {
          success: false,
          result: null,
          error: {
            message: '401 Unauthorized',
            cause: null,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
          }
        }
      }
    
      return {
        success: false,
        result: null,
        error: {
          message: `${response?.status} ${response?.statusText}: Falha ao obter o perfil do usuário`,
          cause: null,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
        }
      }
    } catch (error: unknown) {
      return {
        success: false,
        result: null,
        error: {
          message: error instanceof Error && error.message.length > 0 ? 
            error.message : 'Falha ao obter o perfil do usuário',
          cause: null,
        },
        response: {
          status: 500,
          statusText: 'Internal Server Error',
        }
      }
    }
  }
);  