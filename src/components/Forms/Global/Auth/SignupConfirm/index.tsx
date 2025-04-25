'use client'

import * as Icon from '@phosphor-icons/react';
import { Formik } from "formik";
import { HtmlHTMLAttributes, useEffect, useState } from "react";
import { TextField } from "@/components/TextField2.0";
import { Button } from '@/components/Button2.0';
import Image from 'next/image';
import { Alert } from "@/components/Alert2.0";
import { Severity } from "@/components/Alert2.0/Root";
import { LinkButton } from '@/components/LinkButton';
import { useAuthStore } from '@/zustand-store/auth.store';
import { useShallow } from 'zustand/react/shallow';

interface InitialValuesFormik {
  email: string;
  code: string;
}

interface AlertProps {
  message?: string;
  severity?: Severity;
  visible?: boolean;
}

export function FormSignUpConfirmGlobal({ ...props }: HtmlHTMLAttributes<HTMLFormElement>) {  
  const { user, resendCodeVerificationSignUp } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      resendCodeVerificationSignUp: state.resendCodeVerificationSignUp,
    }))
  );

  const [alert, setAlert] = useState<AlertProps>({
    message: '',
    severity: 'default',
    visible: false,
  });

  const [showFinishMessage, setShowFinishMessage] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [counter, setCounter] = useState(30);

  const initial_values: InitialValuesFormik = {
    email: user?.email ?? '',
    code: '',
  }

  const openAlert = (message: string, severity: Severity) => {
    setAlert({ message, severity, visible: true });
  }

  const handleOpenAlert = (message: string, severity: Severity) => {
    openAlert(message, severity);
  }

  const handleSubmit = async ({ email, code }: InitialValuesFormik) => {
    try {
      //await signUpConfirmation({email, code})
      setShowFinishMessage(true);
    } catch(error: any) {
      openAlert(error.message, 'error')
    }
  }

  const handleresendCodeVerificationSignUp = async (email: string) => {
    try {
      setIsSendingCode(true);
      await resendCodeVerificationSignUp({email});
      setIsSendingCode(false);

      setCounter(30);
    } catch(error: any) {
      handleOpenAlert(error.message, 'error')
    }
  }

  useEffect(() => {
    const decrementCounter = () => {
      setCounter(counter - 1);
    }

    if (counter > 0) {
      const timeoutId = setTimeout(decrementCounter, 1000);
      return () => clearTimeout(timeoutId); // Limpa o timeout ao desmontar ou atualizar
    } else {
      setCounter(0);
    }
  }, [counter]);

  return (
    <Formik
      initialValues={initial_values}
      validate={() => {}}
      onSubmit={async (values, { setSubmitting }) => {
        await handleSubmit(values).then(() => {setSubmitting(false)});
      }}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        handleSubmit,
        isSubmitting,
        setFieldValue,
      }) => (
        <div className='flex flex-1 justify-center'>
          {
            showFinishMessage ? 
            <div className="flex flex-col justify-center items-center w-96 h-fit gap-2 p-8 rounded bg-zinc-100 dark:bg-zinc-800">
              <Icon.CheckCircle className="text-4xl text-green-500" />
              <p className="flex flex-1 pt-2 text-center">Verificação concluída com sucesso!</p>
              <LinkButton.Root href='/auth/login'>
                <LinkButton.Label text='Voltar para o login' className='flex flex-1 justify-end text-sm' />
              </LinkButton.Root>
            </div>
            :
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col items-center gap-4" { ...props } >
              <Alert.Root.Default 
                severity={alert.severity} 
                visible={alert.visible}
              >
                <Alert.Message>
                  { alert.message }
                </Alert.Message>
                <Alert.Button.Close />
              </Alert.Root.Default>
              <div className="flex flex-col justify-center items-center p-8 rounded bg-zinc-100 dark:bg-zinc-800 h-fit">
                <Image 
                  src="/everest/portal/everest-logo.svg" 
                  alt="Everest logo" 
                  width="100" 
                  height="100" 
                />
      
                <h1 className="text-2xl pb-8 text-black dark:text-white">EVEREST</h1>
      
                <div className="flex flex-1 flex-col w-96 gap-4">
                  <TextField.Root>
                    <TextField.Main.Root>
                      <TextField.Main.Label>
                        Endereço de e-mail
                      </TextField.Main.Label>
                      <TextField.Main.Input.Root>
                        <TextField.Main.Input.Field 
                        id="email"
                        name="email"
                        type="email"
                        disabled
                        title='Endereço de e-mail que recebeu o código de verificação'
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.email}
                        />
                      </TextField.Main.Input.Root>
                      <TextField.Button.Root>
                        <TextField.Button.Clean />
                      </TextField.Button.Root>
                    </TextField.Main.Root>
                  </TextField.Root>
            
                  <TextField.Root>
                    <TextField.Main.Root>
                      <TextField.Main.Label>
                        Insira o código de verificação
                      </TextField.Main.Label>
                      <TextField.Main.Input.Root>
                        <TextField.Main.Input.Field 
                        id="code"
                        name="code"
                        type="text"
                        autoFocus
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.code}
                        />
                      </TextField.Main.Input.Root>
                    </TextField.Main.Root>
                    <TextField.Button.Root>
                      <TextField.Button.Clean />
                    </TextField.Button.Root>
                  </TextField.Root>

                  <Button.Contained.Root 
                  type="submit" 
                  disabled={isSubmitting}
                  className='bg-cyan-500 dark:bg-cyan-500 hover:bg-cyan-400 dark:hover:bg-cyan-400'
                  >
                  {
                    isSubmitting ?
                    <Button.Contained.IconLoading />
                    :
                    <>
                    <Button.Contained.Icon>
                      <Icon.ShieldCheck weight='fill' />
                    </Button.Contained.Icon>
                    <Button.Contained.Text>
                    Verificar
                    </Button.Contained.Text>
                    </>
                  }
                  </Button.Contained.Root>
            
                  <Button.Contained.Root 
                    type="submit" 
                    disabled={isSubmitting || (counter > 0)} 
                    onClick={() => handleresendCodeVerificationSignUp(values.email)}
                    >
                    {
                      isSendingCode ?
                      <Button.Contained.IconLoading />
                      :
                      <>
                      <Button.Contained.Icon>
                        <Icon.FlagCheckered weight='fill' />
                      </Button.Contained.Icon>
                      <Button.Contained.Text>
                        {counter > 0 ? 'Reenviar (' + counter + ' seg)' : 'Reenviar' }
                      </Button.Contained.Text>
                      </>
                    }
                  </Button.Contained.Root>

                  <div className="flex gap-2 justify-center border border-zinc-300 dark:border-zinc-600 rounded items-center p-4 mt-4">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Ja tem uma conta no Everest?</span>
                  <LinkButton.Root href='/auth/login'>
                    <LinkButton.Label text='Faça login' className='flex flex-1 justify-end text-sm' />
                  </LinkButton.Root>
                  </div>
                </div>
              </div>
            </form>
          }
        </div>
      )}
    </Formik>
  );
}
