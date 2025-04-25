import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createTableNodeWithDimensions, TableNode } from '@lexical/table';
import { $insertNodes, COMMAND_PRIORITY_EDITOR } from 'lexical';
import { useEffect } from 'react';
import { INSERT_TABLE_COMMAND } from './ToolbarPlugin';

export default function TablePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TableNode])) {
      throw new Error('TablePlugin: TableNode não está registrado no editor');
    }

    return editor.registerCommand<{ rows: number; columns: number }>(
      INSERT_TABLE_COMMAND,
      ({ rows, columns }) => {
        // Cria e insere um nó de tabela com as dimensões especificadas
        editor.update(() => {
          const tableNode = $createTableNodeWithDimensions(rows, columns);
          $insertNodes([tableNode]);
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
} 