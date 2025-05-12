type ValidationErrors = { [key: string]: { _errors: string[] } };

export interface ActionError {
  message: string;
  cause: string | null;
}

export interface ActionResultData<T> {
  success: boolean;
  result: T | null;
  error: ActionError | null;
  response: {
    status: number;
    statusText: string;
  }
}

export interface SafeActionResult<T> {
  data: ActionResultData<T>;
  validationErrors?: ValidationErrors
}

const formatValidationErrors = (validationErrors: ValidationErrors): string => {
  // O Object.entries transforma um objeto em um array de pares [chave, valor]
  return Object.entries(validationErrors)
    .map(([key, value]) => {
      // Trata diferentes formatos de erros
      console.log('errors', key, value);

      const formattedErrors = value?._errors?.map(error => 
        typeof error === 'string' ? error : 'Erro de validação não reconhecido'
      ).join(', ');
      
      return `${key}: ${formattedErrors}`;
    }).join('\n');
};

const throwValidationErrorsIfExist = <T>(result: SafeActionResult<T>): void => {
  if (result?.validationErrors && Object.keys(result?.validationErrors ?? {}).length > 0) {
    const errorMessages = formatValidationErrors(result.validationErrors);

    throw new Error(errorMessages, { cause: 'validation' });
  }
};

const getActionResultData = <T>(safeResult: SafeActionResult<T>): ActionResultData<T> | null => {
  if (!safeResult) {
    return null
  }

  // Verifica se existem erros de validação
  throwValidationErrorsIfExist(safeResult);

  return safeResult.data;
}

export const util = {
  getActionResultData,
}