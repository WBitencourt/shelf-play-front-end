import { create } from 'zustand';
import * as Icon from '@phosphor-icons/react';
import { v4 as uuid } from 'uuid';
import { User } from './auth.store';
import moment from 'moment';

import { subscribeWithSelector } from 'zustand/middleware';
import { actions } from '@/actionsV2';
import { toast } from '@/utils/toast';

export type IconName = keyof typeof Icon;

export type EsteiraNome = 'auditoria' | 'consulta' | 'esteira' | 'excecao';
export type EsteiraTipo = 'oito' | 'cliente' | 'sistemica' | 'demandas';

export type Permission = { 
  [key: string]: string[] | undefined; 
};

export interface TabProps {
  id: string | number;
  title: string;
  href: string;
  pathname: string;
  permissions: Permission | undefined;
  selected: boolean;
  visible: boolean;
}

export interface Menu {
  id: string;
  title: string;
  icon: {
    selected: boolean;
    name: IconName;
  }
  badge: {
    count: {
      valid: number;
      expired: number;
    };
  }
  href: string;
  openNewTab?: boolean,
  pathname: string;
  level: number;
  tabs: TabProps[] | undefined;
  children?: Menu[];
  selected: boolean;
  visible: boolean;
}

interface UpdateMenu {
  id?: string;
  title?: string;
  icon?: {
    selected: boolean;
    name: IconName;
  }
  badge?: {
    count: {
      valid: number;
      expired: number;
    };
  }
  href?: string;
  pathname?: string;
  level?: number;
  tabs?: TabProps[];
  children?: Menu[];
  selected?: boolean;
  visible?: boolean;
}

interface IconMenuProps {
  name: IconName;
  selected: boolean;
}

interface UpdateItemMenuVisibilityByUserPermissionsProps {
  user: User | null;
}

interface NavigationState {
  menu: Menu[];
  intendedPathNameClient: string | null;
  isLoadingMenu: boolean | undefined;

  updateItemSelectedMenuByActiveUrl: (url: string) => void;
  updateIconCountBadge: () => Promise<void>;
  updateItemMenuVisibilityByUserPermissions: (props: UpdateItemMenuVisibilityByUserPermissionsProps) => void;
  updateIntendedPathNameClient: (url: string) => void;

  abortUpdateIconCountBadge: () => void;
  scheduleUpdateIconCountBadge: () => void;
}

type Set = {
  (partial: NavigationState | Partial<NavigationState> | ((state: NavigationState) => NavigationState | Partial<NavigationState>), replace?: false | undefined): void;
  (state: NavigationState | ((state: NavigationState) => NavigationState), replace: true): void;
};

type Get = () => NavigationState

let timeoutUpdateIconCountBadge: NodeJS.Timeout | null = null;

const getInitialMenu = (get: Get, set: Set) => () => {
  const menu: Menu[] = [
    {
      id: uuid(),
      title: 'Home',
      badge: {
        count: {
          valid: 0,
          expired: 0,
        },
      },
      href: '/home',
      pathname: '/home',
      level: 100,
      selected: false,
      visible: true,
      tabs: [
        {
          id: uuid(),
          title: 'Home',
          href: '/home',
          pathname: '/home',
          selected: false,
          visible: true,
          permissions: undefined,
        },
      ],
      icon: {
        selected: false,
        name: 'House',
      },
    },
    {
      id: uuid(),
      title: 'Relatórios',
      badge: {
        count: {
          valid: 0,
          expired: 0,
        },
      },
      href: '/report',
      pathname: '/report',
      level: 100,
      selected: false,
      visible: true,
      tabs: [
        {
          id: uuid(),
          title: 'Relatório',
          href: '/report',
          pathname: '/report',
          selected: false,
          visible: true,
          permissions: {
            consultas: undefined,
          },
        },
      ],
      icon: {
        selected: false,
        name: 'ChartLine',
      },
    },
    {
      id: uuid(),
      title: 'Consulta',
      badge: {
        count: {
          valid: 0,
          expired: 0,
        },
      },
      href: '/consulta/demandas?type=Nº%20Processo',
      pathname: '/consulta/demandas',
      level: 100,
      selected: false,
      visible: false,
      tabs: [
        {
          id: uuid(),
          title: 'Consulta',
          href: '/consulta/demandas?type=Nº%20Processo',
          pathname: '/consulta/demandas',
          permissions: {
            consultas: undefined,
          },
          selected: false,
          visible: false,
        },
      ],
      icon: {
        selected: false,
        name: 'FileMagnifyingGlass',
      },
    },
    {
      id: uuid(),
      title: 'Esteira oito',
      badge: {
        count: {
          valid: 0,
          expired: 0,
        },
      },
      href: '/esteira/oito',
      pathname: '/esteira/oito',
      level: 100,
      selected: false,
      visible: false,
      tabs: [
        {
          id: uuid(),
          title: 'Esteira Oito',
          href: '/esteira/oito',
          pathname: '/esteira/oito',
          permissions: {
            operadorOito: undefined,
          },
          selected: false,
          visible: false,
        },
      ],
      icon: {
        selected: false,
        name: 'Receipt',
      },
    },
    {
      id: uuid(),
      title: 'Esteira cliente',
      badge: {
        count: {
          valid: 0,
          expired: 0,
        },
      },
      href: '/esteira/cliente',
      pathname: '/esteira/cliente',
      level: 100,
      selected: false,
      visible: false,
      tabs: [
        {
          id: uuid(),
          title: 'Esteira Cliente',
          href: '/esteira/cliente',
          pathname: '/esteira/cliente',
          permissions: {
            operadorCliente: undefined,
          },
          selected: false,
          visible: false,
        },
      ],
      icon: {
        selected: false,
        name: 'NewspaperClipping',
      },
    },
    {
      id: uuid(),
      title: 'Exceção',
      badge: {
        count: {
          valid: 0,
          expired: 0,
        },
      },
      href: '/excecao/demandas',
      pathname: '/excecao/',
      level: 100,
      selected: false,
      visible: false,
      tabs: [
        {
          id: uuid(),
          title: 'Exceção',
          href: '/excecao/demandas',
          pathname: '/excecao/demandas',
          permissions: {
            excecaoCliente: undefined,
            excecaoOito: undefined,
            excecaoSistemica: undefined,
          },
          selected: false,
          visible: false,
        },
      ],
      icon: {
        selected: false,
        name: 'BugBeetle',
      },
    },
    {
      id: uuid(),
      title: 'Auditoria Oito',
      badge: {
        count: {
          valid: 0,
          expired: 0,
        },
      },
      href: '/auditoria/oito',
      pathname: '/auditoria/oito',
      level: 100,
      selected: false,
      visible: false,
      tabs: [
        {
          id: uuid(),
          title: 'Auditoria Oito',
          href: '/auditoria/oito',
          pathname: '/auditoria/oito',
          selected: false,
          visible: false,
          permissions: {
            adminOito: undefined,
          },
        },
      ],
      icon: {
        selected: false,
        name: 'Certificate',
      },
    },
    // {
    //   id: uuid(),
    //   title: 'Auditoria Cliente',
    //   badge: {
    //     count: {
    //       valid: 0,
    //       expired: 0,
    //     },
    //   },
    //   href: '/auditoria/cliente',
    //   pathname: '/auditoria/cliente',
    //   level: 100,
    //   selected: false,
    //   visible: false,
    //   tabs: [
    //     {
    //       id: uuid(),
    //       title: 'Auditoria Cliente',
    //       href: '/auditoria/cliente',
    //       pathname: '/auditoria/cliente',
    //       selected: false,
    //       visible: false,
    //       permissions: {
    //         adminCliente: undefined,
    //       },
    //     },
    //   ],
    //   icon: {
    //     selected: false,
    //     name: 'Certificate',
    //   },
    // },
    {
      id: uuid(),
      title: 'Portal de upload',
      badge: {
        count: {
          valid: 0,
          expired: 0,
        },
      },
      href: undefined,
      pathname: undefined,
      level: 100,
      selected: false,
      visible: false,
      tabs: [
        {
          id: uuid(),
          title: 'Lote',
          href: '/upload/lote',
          pathname: '/upload/lote',
          selected: false,
          visible: false,
          permissions: {
            portalUploadLote: undefined,
          },
        },
        {
          id: uuid(),
          title: 'Entrevista guiada',
          href: '/upload/individual',
          pathname: '/upload/individual',
          selected: false,
          visible: false,
          permissions: {
            portalUploadIndividual: undefined,
          },
        },
      ],
      icon: {
        selected: false,
        name: 'FileArrowUp',
      },
    },
    {
      id: uuid(),
      title: 'Perfil',
      badge: {
        count: {
          valid: 0,
          expired: 0,
        },
      },
      href: '/user/profile',
      pathname: '/user/profile',
      level: 999,
      selected: false,
      visible: true,
      tabs: [
        {
          id: 'c0ff03c2-5f3e-4be4-9cab-22466212548b',
          title: 'Perfil',
          href: '/user/profile',
          pathname: '/user/profile',
          selected: false,
          visible: true,
          permissions: undefined,
        },
        {
          id: '4d874c5f-16c9-42a8-9a48-0568b8f77d0c',
          title: 'Segurança',
          href: '/user/security',
          pathname: '/user/security',
          selected: false,
          visible: true,
          permissions: undefined,
        },
      ],
      icon: {
        selected: false,
        name: 'User',
      },
    },
  ].sort((a, b) => {
    if ( a.title === 'Home' || b.title === 'Home' ){ return 1; } 
    if ( a.title < b.title ){ return -1; }
    if ( a.title > b.title ){ return 1; }
    return 0;
  }) as Menu[];

  return menu;
};

const dateNowInRange = (startDate: string, endDate: string) => {
  const currentDate = moment();
  const start = moment(startDate);
  const end = moment(endDate);

  if (currentDate.isSame(start) || currentDate.isSame(end) || currentDate.isBetween(start, end)) {
    return true;
  }
  
  return false;
}

const updateItemSelectedMenuByActiveUrl = (get: Get, set: Set) => (pathname: string) => {
  if(!pathname || typeof pathname !== 'string') { 
    return;
  }

  set({
    menu: get().menu.map((item) => {
      if(item.tabs === undefined) {
        return item;
      }
      
      const updatedTabs = item.tabs.map((tab) => {
        return {
          ...tab,
          selected: pathname.includes(tab.pathname) || tab.pathname.includes(pathname),
        }
      });

      const someTabSelected = updatedTabs.some((tab) => tab.selected);

      return {
        ...item,
        selected: someTabSelected,
        tabs: updatedTabs,
      }
    })
  });
}

const checkUserHavePermissions = (userPermissions: Permission, tabMenuPermissions: Permission | undefined) => {
  if(tabMenuPermissions === undefined) {
    return true;
  }

  if(userPermissions === undefined) {
    return false;
  }

  const userPermissionKeys = Object.keys(userPermissions);
  const tabMenuPermissionKeys = Object.keys(tabMenuPermissions);

  const userHavePermissions = userPermissionKeys.some((userPermissionKey) => {
    const userHaveKeyPermission = tabMenuPermissionKeys.includes(userPermissionKey);

    if(!userHaveKeyPermission) {
      return false;
    }

    const tabMenuPermission = tabMenuPermissions[userPermissionKey];
    const userPermission = userPermissions[userPermissionKey];

    if(!userPermission) {
      return false;
    }

    if(tabMenuPermission === undefined) {
      return userPermission.filter(item => item.trim().length > 0).length > 0;
    }

    return userPermission.some((permissionUserName) => tabMenuPermission.includes(permissionUserName));
  });

  return userHavePermissions;
}

const updateItemMenuVisibilityByUserPermissions = (get: Get, set: Set) => async ({ user }: UpdateItemMenuVisibilityByUserPermissionsProps) => {
  try {
    if(!user) {
      return 
    }

    const userPermission: Permission = {
      adminCliente: user?.rules?.adminCliente ?? [],
      adminOito: user?.rules?.adminOito ?? [],
      operadorCliente: user?.rules?.operadorCliente ?? [],
      operadorOito: user?.rules?.operadorOito ?? [],
      portalUploadLote: user?.rules?.portalUploadLote ?? [],
      portalUploadIndividual: user?.rules?.portalUploadIndividual ?? [],
      consultas: user?.rules?.consultas ?? [],
      excecaoCliente: user?.rules?.excecoes?.excecaoCliente ?? [],
      excecaoOito: user?.rules?.excecoes?.excecaoOito ?? [],
      excecaoSistemica: user?.rules?.excecoes?.excecaoSistemica ?? [],
    }

    const updatedMenu = get().menu.map((item) => {
      if(item.tabs === undefined) {
        return item
      }

      const updatedTabs = item.tabs.map((tab) => {
        const userHavePermissions = checkUserHavePermissions(userPermission, tab.permissions);

        return {
          ...tab,
          visible: userHavePermissions,
        };
      });

      const tabVisible = updatedTabs.find((tab) => tab.visible);
      const someTabVisible = updatedTabs.some((tab) => tab.visible);

      return {
        ...item,
        href: tabVisible?.href ?? item.href,
        pathname: tabVisible?.pathname ?? item.pathname,
        visible: someTabVisible,
        tabs: updatedTabs,
      }
    })

    set({
      menu: updatedMenu,
    });

    //set all menu items to visible
    // set({
    //   menu: get().menu.map((item) => {
    //     const updatedTabs = item.tabs.map((tab) => {
    //       return {
    //         ...tab,
    //         visible: true,
    //       };
    //     });

    //     return {
    //       ...item,
    //       visible: true,
    //       tabs: updatedTabs,
    //     }
    //   })
    // });
  } catch (error: any) {
    throw new Error(error?.message ?? 'Não foi possível atualizar a visibilidade do menu lateral');
  }
}

const updateMenuByTitle = (get: Get, set: Set) => (title: string, data: UpdateMenu) => {
  set((state) => {
    const updatedMenu = state.menu?.map((item) => {
      return item.title.toLowerCase() === title.toLowerCase() ? { ...item, ...data } : item;
    });

    return {
      menu: updatedMenu,
    };
  });
}

const updateIconCountBadge = (get: Get, set: Set) => async () => {
  try {     
    console.log('Atualizando volumetria', new Date().toISOString());

    const volumetria = await actions.backend.indicador.getVolumetria();

    if(!volumetria) {
      return;
    }

    updateMenuByTitle(get, set)('Auditoria Cliente', { 
      badge: {
        count: {
          valid: volumetria.auditoriaCliente.valid,
          expired: volumetria.auditoriaCliente.expired,
        },
      }
    })

    updateMenuByTitle(get, set)('Auditoria Oito', { 
      badge: {
        count: {
          valid: volumetria.auditoriaOito.valid,
          expired: volumetria.auditoriaOito.expired,
        },
      }
    })

    updateMenuByTitle(get, set)('Exceção', { 
      badge: {
        count: {
          valid: volumetria.excecao.valid,
          expired: volumetria.excecao.expired,
        },
      }
    })

    updateMenuByTitle(get, set)('Esteira Cliente', { 
      badge: {
        count: {
          valid: volumetria.esteiraCliente.valid,
          expired: volumetria.esteiraCliente.expired,
        },
      }
    })

    updateMenuByTitle(get, set)('Esteira Oito', { 
      badge: {
        count: {
          valid: volumetria.esteiraOito.valid,
          expired: volumetria.esteiraOito.expired,
        },
      }
    })

  } catch(error: any) {
    throw new Error(error?.message ?? 'Não foi possível atualizar a contagem do menu lateral');
  }
}

const abortUpdateIconCountBadge = (get: Get, set: Set) => () => {
  if(timeoutUpdateIconCountBadge) {
    console.log('Abortando atualização de volumetria', new Date().toISOString());
    clearTimeout(timeoutUpdateIconCountBadge)
  }
}

const scheduleUpdateIconCountBadge = (get: Get, set: Set) => async () => {
  try {     
    if(timeoutUpdateIconCountBadge) {
      clearTimeout(timeoutUpdateIconCountBadge)
    }

    timeoutUpdateIconCountBadge = setTimeout(async () => {
      await updateIconCountBadge(get, set)();

      scheduleUpdateIconCountBadge(get, set)();
    }, 1000 * 60 * 1); //1min 

  } catch(error: any) {
    toast.error({
      title: 'Falha ao agendar atualização do menu',
      description: error?.message ?? 'Não foi possível atualizar a contagem do menu lateral',
    });
  }
}

const updateIntendedPathNameClient = (get: Get, set: Set) => async (url: string) => {
  set({ intendedPathNameClient: url });
}

export const useNavigationStore = create<NavigationState>()(
  subscribeWithSelector((set, get) => {    
    return {
      menu: getInitialMenu(get, set)(),
      intendedPathNameClient: null,
      isLoadingMenu: undefined,
    
      updateItemSelectedMenuByActiveUrl: updateItemSelectedMenuByActiveUrl(get, set),
      updateItemMenuVisibilityByUserPermissions: updateItemMenuVisibilityByUserPermissions(get, set),
      updateIconCountBadge: updateIconCountBadge(get, set),
      updateIntendedPathNameClient: updateIntendedPathNameClient(get, set),

      abortUpdateIconCountBadge: abortUpdateIconCountBadge(get, set),
      scheduleUpdateIconCountBadge: scheduleUpdateIconCountBadge(get, set),
    }
  }
));
