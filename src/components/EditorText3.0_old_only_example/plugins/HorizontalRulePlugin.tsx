import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import { useEffect } from 'react';
import { INSERT_HORIZONTAL_RULE_COMMAND } from './ToolbarPlugin';
import { $createHorizontalRuleNode, HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';

export default function HorizontalRulePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Verifique se o nó HorizontalRuleNode está registrado
    if (!editor.hasNodes([HorizontalRuleNode])) {
      throw new Error('HorizontalRulePlugin: HorizontalRuleNode não está registrado no editor');
    }

    return editor.registerCommand(
      INSERT_HORIZONTAL_RULE_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            // Cria um nó de linha horizontal usando a função apropriada do Lexical
            const horizontalRuleNode = $createHorizontalRuleNode();
            
            // Insere a linha horizontal no editor
            $insertNodeToNearestRoot(horizontalRuleNode);
            
            // Insere um novo parágrafo após a linha horizontal
            const paragraphNode = $createParagraphNode();
            paragraphNode.setDirection(null);
            $insertNodeToNearestRoot(paragraphNode);
            
            // Move a seleção para o novo parágrafo
            paragraphNode.select();
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
} 