import { useCallback, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_CRITICAL, createCommand, LexicalCommand } from 'lexical';

// Cria comandos personalizados para font-family e font-size
export const CHANGE_FONT_FAMILY_COMMAND: LexicalCommand<string> = createCommand('CHANGE_FONT_FAMILY_COMMAND');
export const CHANGE_FONT_SIZE_COMMAND: LexicalCommand<string> = createCommand('CHANGE_FONT_SIZE_COMMAND');

export default function FontPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  
  // Handler para alterar a família de fonte
  const handleFontFamilyChange = useCallback((fontFamily: string) => {
    console.log('Alterando família de fonte para:', fontFamily);
    
    // Captura o elemento root do editor
    const editorElement = editor.getRootElement();
    if (!editorElement) {
      console.warn('Elemento raiz do editor não encontrado');
      return false;
    }
    
    // Aplica a font-family ao elemento raiz do editor
    editorElement.style.fontFamily = fontFamily;
    
    // Atualiza o estilo no editor
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Como estamos alterando o estilo global, não precisamos fazer nada aqui
        // Mas poderíamos aplicar o estilo a nós específicos se necessário
      }
    });
    
    return true;
  }, [editor]);
  
  // Handler para alterar o tamanho da fonte
  const handleFontSizeChange = useCallback((fontSize: string) => {
    console.log('Alterando tamanho de fonte para:', fontSize);
    
    // Captura o elemento root do editor
    const editorElement = editor.getRootElement();
    if (!editorElement) {
      console.warn('Elemento raiz do editor não encontrado');
      return false;
    }
    
    // Aplica o font-size ao elemento raiz do editor
    editorElement.style.fontSize = fontSize;
    
    // Atualiza o estilo no editor
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Como estamos alterando o estilo global, não precisamos fazer nada aqui
      }
    });
    
    return true;
  }, [editor]);
  
  // Registra os handlers para os comandos personalizados
  useEffect(() => {
    // Registra os comandos
    const fontFamilyListener = editor.registerCommand(
      CHANGE_FONT_FAMILY_COMMAND,
      handleFontFamilyChange,
      COMMAND_PRIORITY_CRITICAL,
    );
    
    const fontSizeListener = editor.registerCommand(
      CHANGE_FONT_SIZE_COMMAND,
      handleFontSizeChange,
      COMMAND_PRIORITY_CRITICAL,
    );
    
    // Limpa os listeners ao desmontar
    return () => {
      fontFamilyListener();
      fontSizeListener();
    };
  }, [editor, handleFontFamilyChange, handleFontSizeChange]);
  
  // Este componente não renderiza nada visualmente
  return null;
} 