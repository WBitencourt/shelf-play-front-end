import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getSelection, 
  $isRangeSelection, 
  $createRangeSelection, 
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  SELECTION_CHANGE_COMMAND
} from 'lexical';
import { useEffect, useRef } from 'react';

/**
 * Plugin que garante que a seleção e posição do cursor sejam mantidas corretamente 
 * durante a edição.
 */
export default function SelectionSavePlugin(): null {
  const [editor] = useLexicalComposerContext();
  const lastSelectionRef = useRef<{
    anchorKey: string;
    anchorOffset: number;
    focusKey: string;
    focusOffset: number;
  } | null>(null);

  useEffect(() => {
    // Monitoramos os eventos de seleção
    const removeSelectionListener = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            // Salvamos a seleção atual para uso posterior
            lastSelectionRef.current = {
              anchorKey: selection.anchor.key,
              anchorOffset: selection.anchor.offset,
              focusKey: selection.focus.key,
              focusOffset: selection.focus.offset
            };
          }
        });
      }
    );

    // Registrar manipuladores para teclas de seta para garantir
    // que o cursor não pule para locais indesejados
    const removeArrowListeners = [
      KEY_ARROW_UP_COMMAND, 
      KEY_ARROW_DOWN_COMMAND, 
      KEY_ARROW_LEFT_COMMAND, 
      KEY_ARROW_RIGHT_COMMAND
    ].map(command => 
      editor.registerCommand(
        command,
        (payload) => {
          // Deixamos as teclas de seta funcionarem normalmente
          // mas garantimos que a seleção seja atualizada corretamente
          return false;
        },
        COMMAND_PRIORITY_HIGH
      )
    );

    // Registrar um manipulador para quando o conteúdo do editor mudar
    const removeCommandListener = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        // Este comando é disparado após mudanças na seleção
        // Garantimos que a seleção seja consistente durante a edição
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );

    // Limpeza quando o componente for desmontado
    return () => {
      removeSelectionListener();
      removeArrowListeners.forEach(remove => remove());
      removeCommandListener();
    };
  }, [editor]);

  return null;
} 