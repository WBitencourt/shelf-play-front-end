'use server';

import 'dotenv/config';

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { services } from './services';

const schemas = {
  getCidadesPorUf: z.object({
    uf: z.string().length(2),
  }),
};

export const getCidadesPorUf = actionClient
  .schema(schemas.getCidadesPorUf)
  .action(async ({ parsedInput: params }) => {
    try {
      const result = await services.getCidadesPorUf({
        uf: params.uf
      });

      return { 
        success: true, 
        result, 
        error: null,
        response: {
          status: '200',
          statusText: 'OK',
        }
      };
    } catch (error: any) {
      return { 
        success: false, 
        result: null, 
        error: { 
          message: error.message 
        },
        response: {
          status: '500',
          statusText: 'Internal Server Error',
        }
      };
    }
  }
);