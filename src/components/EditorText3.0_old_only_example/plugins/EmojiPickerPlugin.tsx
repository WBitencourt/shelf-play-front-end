import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getSelection, 
  $isRangeSelection, 
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand  
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Lista de emojis populares
const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '😊',
  '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙',
  '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎',
  '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
  '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
  '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '👊', '✌️', '🤞',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔'
];

// Interface para definir o tipo do payload
interface EmojiPickerPayload {
  anchorRect: DOMRect;
}

// Comando para abrir/fechar o seletor de emojis
export const TOGGLE_EMOJI_COMMAND: LexicalCommand<EmojiPickerPayload> = 
  createCommand('TOGGLE_EMOJI_COMMAND');

export default function EmojiPickerPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  // Manipulador para fechar o picker quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Função para inserir emoji na posição atual do cursor
  const insertEmoji = useCallback(
    (emoji: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(emoji);
        }
      });
      setIsOpen(false);
    },
    [editor]
  );

  // Registrar comando para alternar o seletor de emojis
  useEffect(() => {
    return editor.registerCommand<EmojiPickerPayload>(
      TOGGLE_EMOJI_COMMAND,
      (payload) => {
        const { anchorRect } = payload;

        if (anchorRect) {
          setPosition({
            top: anchorRect.bottom + window.scrollY,
            left: anchorRect.left + window.scrollX,
          });
          setIsOpen(!isOpen);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, isOpen]);

  // Renderiza o seletor de emojis como um portal
  return isOpen && position
    ? createPortal(
        <div
          ref={emojiPickerRef}
          className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 w-72 max-w-[90vw]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div className="flex justify-between items-center p-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Emojis</h3>
            <button
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setIsOpen(false)}
              type="button"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-wrap p-2 max-h-60 overflow-y-auto">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={() => insertEmoji(emoji)}
                type="button"
                aria-label={`Emoji ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )
    : null;
} 