'use client'
 
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}
 
export default function Error({
  error,
  reset,
}: ErrorProps) { 
  const [isResetting, setIsResetting] = useState(false);

  return (
    <div className='flex flex-1 flex-col justify-center items-center bg-white text-black dark:bg-black dark:text-white'>
      <Image 
        src="/everest/portal/everest-logo.svg" 
        alt="Everest logo" 
        width="300" 
        height="175" 
      />

      <br />
      <h2 className='text-3xl'>Oops! Algo deu errado</h2>
      <br />
      <br />
      <p className="max-w-lg text-center">
        A página não carregou corretamente.
      </p>
      <br />
      <p className="max-w-lg text-center text-red-500">
        { error?.message }
      </p>
      <br />
      <br />
      <button
        onClick={async () => {
          setIsResetting(true);

          await new Promise((resolve) => {
            setTimeout(() => {
              setIsResetting(false);
              resolve(null);
            }, 2000);
          });

          reset();
        }}
        className={[
          'cursor-pointer', 
          'bg-cyan-500 hover:bg-cyan-400', 
          'text-white dark:text-black', 
          'font-bold py-2 px-4 rounded-full'
        ].join(' ')}
      >
        { isResetting ? 'Carregando...' : 'TENTAR NOVAMENTE' }
      </button>
      <br />
      <Link
        href='/'
        className={[
          'cursor-pointer', 
          'bg-black dark:bg-white hover:bg-opacity-50', 
          'text-white dark:text-black', 
          'font-bold py-2 px-4 rounded-full'
        ].join(' ')}
      >
        Ir para a página inicial
      </Link>
    </div>
  )
}