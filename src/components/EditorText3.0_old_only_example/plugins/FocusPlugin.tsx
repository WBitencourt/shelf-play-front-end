import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getSelection, 
  $createRangeSelection, 
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  BLUR_COMMAND,
  FOCUS_COMMAND,
  CLICK_COMMAND
} from 'lexical';
import { useEffect, useRef } from 'react';

/**
 * Plugin para melhorar o comportamento de foco do editor.
 * Impede que o cursor pule para o final do texto ao clicar no meio.
 */
export default function FocusPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const isMouseDownRef = useRef(false);
  const lastPositionRef = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    // Referência ao elemento raiz do editor
    const rootElement = editor.getRootElement();
    if (!rootElement) return;
    
    // Manipulador para capturar cliques no editor
    const handleMouseDown = (event: MouseEvent) => {
      // Armazenamos a posição exata do clique
      isMouseDownRef.current = true;
      lastPositionRef.current = { x: event.clientX, y: event.clientY };
      
      // Importante: Não impedimos o comportamento padrão!
      
      // Resetamos o estado de clique após um pequeno delay
      setTimeout(() => {
        isMouseDownRef.current = false;
      }, 300);
    };
    
    // Tratamos o evento blur para garantir que o foco não seja perdido inesperadamente
    const removeBlurListener = editor.registerCommand(
      BLUR_COMMAND,
      () => {
        // Só impedimos o comportamento padrão se for por causa de um clique interno
        if (isMouseDownRef.current) {
          // Devolvemos o foco ao editor após um pequeno delay
          setTimeout(() => {
            editor.focus();
          }, 10);
          // Impedimos a perda de foco
          return true;
        }
        // Permitimos a perda de foco em outros casos
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
    
    // Registramos um manipulador para o evento de clique
    const removeClickListener = editor.registerCommand(
      CLICK_COMMAND,
      (payload) => {
        // Nada a fazer, apenas deixamos o clique acontecer normalmente
        // O editor vai posicionar o cursor na posição correta do clique
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
    
    // Adicionamos um ouvinte de mouse down para capturar a posição do clique
    rootElement.addEventListener('mousedown', handleMouseDown);
    
    // Remoção dos listeners quando o componente for desmontado
    return () => {
      rootElement.removeEventListener('mousedown', handleMouseDown);
      removeBlurListener();
      removeClickListener();
    };
  }, [editor]);
  
  return null;
} 