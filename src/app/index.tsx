'use client'

import type { Metadata } from "next";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { useThemeStore } from '@/zustand-store/theme.store';
import { useFontSizeStore } from '@/zustand-store/font-size.store';
import { useAuthStore } from '@/zustand-store/auth.store';
import { useClientStore } from '@/zustand-store/client.store';
import { useNavigationStore } from '@/zustand-store/navigation.store';
import { useShallow } from "zustand/react/shallow";
import { toast } from "@/utils/toast";

interface AppProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Everest",
};

export default function App({ children }: AppProps) {
  const pathname = usePathname();

  const { 
    user,
    isAuthenticated,
    revalidateAccessToken,
    destroySession,
    refreshAuthenticatedUser,
    scheduleRevalidateAccessToken,
    updateIsAuthenticated,
  } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      revalidateAccessToken: state.revalidateAccessToken,
      destroySession: state.destroySession,
      refreshAuthenticatedUser: state.refreshAuthenticatedUser,
      scheduleRevalidateAccessToken: state.scheduleRevalidateAccessToken,
      updateIsAuthenticated: state.updateIsAuthenticated,
    }))
  );
  
  const {
    abortUpdateIconCountBadge,
    scheduleUpdateIconCountBadge,
    updateItemSelectedMenuByActiveUrl,
    updateItemMenuVisibilityByUserPermissions,
  } = useNavigationStore(
    useShallow((state) => ({
      abortUpdateIconCountBadge: state.abortUpdateIconCountBadge,
      scheduleUpdateIconCountBadge: state.scheduleUpdateIconCountBadge,
      updateItemSelectedMenuByActiveUrl: state.updateItemSelectedMenuByActiveUrl,
      updateItemMenuVisibilityByUserPermissions: state.updateItemMenuVisibilityByUserPermissions,
    }))
  );

  const { 
    updateUserClientStore,
    scheduleEventManagementClientActivity,
    abortEventManagementClientActivity,
  } = useClientStore(
    useShallow((state) => ({
      updateUserClientStore: state.updateUser,
      scheduleEventManagementClientActivity: state.scheduleEventManagementClientActivity,
      abortEventManagementClientActivity: state.abortEventManagementClientActivity,
    }))
  );

  const startThemeStore = useThemeStore((state) => state.startThemeStore);
  const startFontSizeStore = useFontSizeStore((state) => state.startFontSizeStore);

  const startAuthStore = async () => {
    try {
      const credentials = await revalidateAccessToken();
  
      const EXPIRE_TIME_MS = credentials.ACCESS_TOKEN_EXPIRE_TIME_S * 1000; //seconds to milliseconds

      if (EXPIRE_TIME_MS > 0) {
        scheduleRevalidateAccessToken(EXPIRE_TIME_MS)
      }
    } catch(error: any) {
      destroySession();

      toast.error({
        title:  'Falha na autenticação',
        description: error?.message,
      })
    }
  }

  const startClientStore = () => {
    try {
      updateIsAuthenticated(isAuthenticated);
    } catch(error: any) {
      toast.error({
        title:  'Falha na inicialização do Everest',
        description: error?.message,
      })
    }
  };

  const onStartApp = async () => {
    try {
      startAuthStore();
      startThemeStore();
      startFontSizeStore();
    } catch(error: any) {
      toast.error({
        title:  'Falha na inicialização do Everest',
        description: error?.message,
      })
    }
  }

  const onUserChange = () => {
    try {
      updateItemMenuVisibilityByUserPermissions({ user });
      updateUserClientStore(user);
    } catch(error: any) {
      toast.error({
        title:  'Falha na atualização do usuário',
        description: error?.message,
      });
    }
  }

  const onAuthenticationChange = async () => {
    try { 
      startClientStore();

      refreshAuthenticatedUser();

      if (isAuthenticated) {
        scheduleUpdateIconCountBadge()
      }

      if (!isAuthenticated) {
        abortUpdateIconCountBadge();
      }
  
    } catch(error: any) {
      toast.error({
        title:  'Falha na autenticação',
        description: error?.message,
      })
    }
  }

  const onPathnameChange = () => {
    try {
      updateItemSelectedMenuByActiveUrl(pathname);
    } catch(error: any) {
      toast.error({
        title:  'Falha na atualização do menu',
        description: error?.message,
      })
    }
  }

  const onAuthenticationAndPathnameChange = () => {
    try {
      if (isAuthenticated) {
        scheduleEventManagementClientActivity();
      }
  
      if (!isAuthenticated) {
        abortEventManagementClientActivity();
      }
    } catch(error: any) {
      toast.error({
        title:  'Falha na autenticação e atualização de atividades programadas',
        description: error?.message,
      })
    }
  }

  useEffect(() => {
    onStartApp();
  }, [])

  useEffect(() => {
    onUserChange();
  }, [user])

  useEffect(() => {
    onAuthenticationChange();
  }, [isAuthenticated])

  useEffect(() => {
    onPathnameChange();
  }, [pathname])

  useEffect(() => {
    onAuthenticationAndPathnameChange();
  }, [isAuthenticated, pathname])

  useEffect(() => {
    startThemeStore();
  }, [startThemeStore]);
  
  return children;
}
