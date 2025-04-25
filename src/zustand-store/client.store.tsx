import { create } from 'zustand';
import { useAuthStore, User } from './auth.store';
import { signOutByUserEmail } from '@/actions/auth';
import { util } from '@/utils';
import { toast } from '@/utils/toast';

export interface ClientState {
  user: User | null;
  TIME_LIMIT_TO_CLIENT_INTERACT: number;
  TIME_LIMIT_WITHOUT_INTERACTION_CLIENT: number;

  abortEventManagementClientActivity: () => void;
  scheduleEventManagementClientActivity: () => void;
  updateUser: (user: User | null) => void;
}

type Set = {
  (partial: ClientState | Partial<ClientState> | ((state: ClientState) => ClientState | Partial<ClientState>), replace?: false | undefined): void;
  (state: ClientState | ((state: ClientState) => ClientState), replace: true): void;
};
type Get = () => ClientState;

let timeoutSignOutClient: NodeJS.Timeout | null = null;
let timeoutClientInteract: NodeJS.Timeout | null = null;

const updateIsAuthenticated = (isAuthenticated: boolean | undefined) => {
  useAuthStore.setState({ isAuthenticated });
}

const updateUser = (get: Get, set: Set) => async (user: User | null) => {
  set({ user });
};

const eventMouseAndKeyboardInteract = (get: Get, set: Set) => {
  const handler = (event: MouseEvent | KeyboardEvent) => {
    // const { updateLastClientActivity } = get();

    console.log('client interact with frontend with mouse and keyboard', new Date().toISOString());

    // Client interact with frontend, then remove timeout that signOut client
    if (timeoutSignOutClient) {
      clearTimeout(timeoutSignOutClient);
    }

    // Remove event to a new loop check interact client
    window.removeEventListener('mousemove', handler, true);
    window.removeEventListener('keydown', handler, true);

    get().scheduleEventManagementClientActivity();
  };
  
  return handler;
};

const abortEventManagementClientActivity = (get: Get, set: Set) => () => {
  if (timeoutClientInteract) {
    clearTimeout(timeoutClientInteract);
  }
}

const scheduleEventManagementClientActivity = (get: Get, set: Set) => () => {
  try {
    const {
      TIME_LIMIT_TO_CLIENT_INTERACT,
      TIME_LIMIT_WITHOUT_INTERACTION_CLIENT,
    } = get();

    console.log('Client navigate', new Date().toISOString());

    if (timeoutClientInteract) {
      abortEventManagementClientActivity(get, set)();
    }

    // Renew timeout to check client interaction
    timeoutClientInteract = setTimeout(() => {
      // Add event to capture client interaction by mouse and keyboard 
      window.addEventListener('mousemove', eventMouseAndKeyboardInteract(get, set), true);
      window.addEventListener('keydown', eventMouseAndKeyboardInteract(get, set), true);

      console.log('Client without interact', new Date().toISOString());

      // Create timeout to signOut client, if in determinate time no have interact, then sign out user.
      timeoutSignOutClient = setTimeout(async () => {
        //Clean event
        window.removeEventListener('mousemove', eventMouseAndKeyboardInteract(get, set), true);
        window.removeEventListener('keydown', eventMouseAndKeyboardInteract(get, set), true);

        console.log('Logout', new Date().toISOString());
        
        const response = await signOutByUserEmail({ email: get().user?.email ?? '' });

        util.actions.checkHaveError(response?.data)

        updateIsAuthenticated(false);
        
      }, TIME_LIMIT_TO_CLIENT_INTERACT);
    }, TIME_LIMIT_WITHOUT_INTERACTION_CLIENT);
  } catch(error: any) {
    toast.error({
      title: 'Falha ao agendar gerenciamento de atividade do cliente',
      description: error?.message ?? 'Não foi possível monitorar a atividade do usuário',
    });
  }
}

export const useClientStore = create<ClientState>((set, get) => {
  return {
    user: null,

    TIME_LIMIT_WITHOUT_INTERACTION_CLIENT: 60000 * 30, // 30min
    TIME_LIMIT_TO_CLIENT_INTERACT: 60000 * 1, // 1min
    abortEventManagementClientActivity: abortEventManagementClientActivity(get, set),
    scheduleEventManagementClientActivity: scheduleEventManagementClientActivity(get, set),
    updateUser: updateUser(get, set),
  };
});
