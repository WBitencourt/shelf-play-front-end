import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  EditorState, 
  LexicalEditor, 
  $getRoot, 
  $insertNodes,
  $createTextNode
} from 'lexical';

// Importações básicas do Lexical
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

// Plugins Core
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';

// Nodes
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';

// HTML Serialização/Desserialização
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';

// Componentes personalizados
import ToolbarPlugin from './plugins/ToolbarPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import CustomHorizontalRulePlugin from './plugins/HorizontalRulePlugin';
import CustomTablePlugin from './plugins/TablePlugin';
import EmojiPickerPlugin from './plugins/EmojiPickerPlugin';
import FontPlugin from './plugins/FontPlugin';
import SelectionSavePlugin from './plugins/SelectionSavePlugin';
import FocusPlugin from './plugins/FocusPlugin';

export interface EditorTextProps {
  id?: string; 
  name?: string;
  label?: string;
  value?: string; // Aceita HTML como string
  visible?: boolean;
  disabled?: boolean;
  isSelfHosted?: boolean;
  onChange?: (value: string) => void; // Retorna HTML como string
}

const EditorText = ({ 
  id, 
  name,
  label, 
  value = '', 
  disabled = false, 
  visible = true, 
  onChange 
}: EditorTextProps) => {
  const [editor, setEditor] = useState<LexicalEditor | null>(null);
  const [debugHtml, setDebugHtml] = useState<string>('');
  const isDevMode = process.env.NEXT_PUBLIC_ENVIRONMENT === 'Dev';

  // Função para inicializar o editor Lexical
  const initialConfig = {
    namespace: 'lexical-editor',
    theme: {
      root: 'relative rounded bg-white border border-gray-300',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through',
        code: 'bg-slate-100 px-1 py-0.5 font-mono rounded',
      },
      link: 'text-blue-500 underline',
      list: {
        nested: {
          listitem: 'pl-5',
        },
        ol: 'pl-5 list-decimal',
        ul: 'pl-5 list-disc',
        listitem: 'mb-1',
      },
      quote: 'pl-4 border-l-4 border-gray-200 text-gray-600',
      heading: {
        h1: 'text-2xl font-bold mb-3',
        h2: 'text-xl font-bold mb-2',
        h3: 'text-lg font-bold mb-2',
        h4: 'text-base font-bold mb-1',
        h5: 'text-sm font-bold mb-1',
      },
      table: 'lexical-table border-collapse w-full my-4',
      tableCell: 'lexical-table-cell border border-gray-300 p-2 min-w-[100px] align-top relative',
      tableCellHeader: 'lexical-table-cell-header bg-gray-100 text-center font-bold',
      code: 'bg-gray-100 p-2 my-2 rounded font-mono',
      hr: 'border-t border-gray-300 my-4 w-full',
      codeHighlight: {
        atrule: 'editor-tokenAttr',
        attr: 'editor-tokenAttr',
        boolean: 'editor-tokenProperty',
        builtin: 'editor-tokenSelector',
        cdata: 'editor-tokenComment',
        char: 'editor-tokenSelector',
        class: 'editor-tokenFunction',
        'class-name': 'editor-tokenFunction',
        comment: 'editor-tokenComment',
        constant: 'editor-tokenProperty',
        deleted: 'editor-tokenProperty',
        doctype: 'editor-tokenComment',
        entity: 'editor-tokenOperator',
        function: 'editor-tokenFunction',
        important: 'editor-tokenVariable',
        inserted: 'editor-tokenSelector',
        keyword: 'editor-tokenAttr',
        namespace: 'editor-tokenVariable',
        number: 'editor-tokenProperty',
        operator: 'editor-tokenOperator',
        prolog: 'editor-tokenComment',
        property: 'editor-tokenProperty',
        punctuation: 'editor-tokenPunctuation',
        regex: 'editor-tokenVariable',
        selector: 'editor-tokenSelector',
        string: 'editor-tokenSelector',
        symbol: 'editor-tokenProperty',
        tag: 'editor-tokenProperty',
        url: 'editor-tokenOperator',
        variable: 'editor-tokenVariable',
      },
    },
    onError: (error: Error) => {
      console.error('Erro no Editor:', error);
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      HorizontalRuleNode
    ],
    editable: !disabled,
  };

  // Função para importar HTML para o editor
  const importHTML = useCallback((htmlString: string) => {
    if (!editor || !htmlString) {
      console.warn('Impossível importar HTML: editor não inicializado ou HTML vazio');
      return;
    }
    
    try {
      // Garantir que temos um HTML válido com tags HTML/BODY se necessário
      let htmlProcessado = htmlString.trim();
      
      // Remover tags <p><br></p> vazias que podem estar causando problemas
      if (htmlProcessado === '<p><br></p>' || htmlProcessado === '<p></p>') {
        htmlProcessado = `
          <p>Texto de exemplo para testar o editor.</p>
          <p>Você pode editar este texto como desejar.</p>
        `;
      }
      
      // Se não começar com <!DOCTYPE> ou <html>, envolvemos em tags div
      if (!htmlProcessado.toLowerCase().includes('<!doctype') && 
          !htmlProcessado.toLowerCase().includes('<html')) {
        // Não envolver em div se já tiver tags html válidas
        if (!htmlProcessado.match(/<\/?[a-z][\s\S]*>/i)) {
          htmlProcessado = `<div>${htmlProcessado}</div>`;
        }
      }
      
      // Usar a função discreta para garantir que a atualização ocorra imediatamente
      editor.update(() => {
        try {
          // Limpar o editor
          const root = $getRoot();
          root.clear();
          
          // Converter HTML para nós do Lexical
          const parser = new DOMParser();
          const dom = parser.parseFromString(htmlProcessado, 'text/html');
          
          // Gerar nós a partir do DOM
          const nodes = $generateNodesFromDOM(editor, dom);
          
          // Inserir nós no editor
          if (nodes && nodes.length > 0) {
            $getRoot().select();
            $insertNodes(nodes);
          } else {
            // Tentativa de recuperação: inserir texto de exemplo
            const selection = $getRoot().select();
            selection.insertText('Texto de exemplo para testar o editor.');
          }
        } catch (innerError) {
          console.error('Erro durante a atualização do editor:', innerError);
        }
      }, { discrete: true }); // Usar discrete: true para aplicar imediatamente
    } catch (error) {
      console.error('Erro ao importar HTML:', error);
    }
  }, [editor]);

  // Função para exportar HTML do editor
  const exportHTML = useCallback((editorState: EditorState) => {
    if (!editor) return '';
    
    let htmlOutput = '';
    
    try {
      editorState.read(() => {
        // Converter estado do editor para HTML usando a API do Lexical
        htmlOutput = $generateHtmlFromNodes(editor, null);
        
        // Verificar se o HTML gerado é válido e não vazio
        if (htmlOutput === '' || htmlOutput === '<p><br></p>' || htmlOutput === '<p></p>') {
          // Para HTML vazio, não atualizamos o estado para evitar loops
          return;
        }
        
        // Atualizar o estado de debug
        setDebugHtml(htmlOutput);
      });
      
      // Verificar se o HTML foi gerado corretamente e não está vazio
      if (htmlOutput && htmlOutput !== '<p><br></p>' && htmlOutput !== '<p></p>') {
        // Chamar o callback onChange se existir
        if (onChange) {
          onChange(htmlOutput);
        }
      }
    } catch (error) {
      console.error('Erro ao gerar HTML:', error);
    }
    
    return htmlOutput;
  }, [editor, onChange]);

  const handleEditorChange = useCallback((editorState: EditorState) => {
    if (!onChange) return;

    exportHTML(editorState);
  }, [onChange, exportHTML]);

  const handleEditorClick = useCallback((event: React.MouseEvent) => {
    // Forçar o editor a manter o foco e a posição do cursor
    if (editor) {
      const editorElement = editor.getRootElement();
      if (editorElement && !editorElement.contains(document.activeElement)) {
        setTimeout(() => {
          editor.focus();
        }, 10);
      }
    }
  }, [editor]);

  useEffect(() => {
    if (editor) {
      // Se não tiver valor inicial ou for um valor vazio, usamos um HTML básico
      const htmlInicial = value;
      
      // Aguardar um momento para garantir que o editor esteja completamente inicializado
      const timer = setTimeout(() => {
        importHTML(htmlInicial);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [editor, value, importHTML]);

  if (!visible) {
    return null;
  }

  return (
    <div className='flex flex-col dark:bg-gray-900 dark:text-white bg-white text-gray-900 border-2 rounded-md'>
      <span className="font-sans p-2 font-normal text-sm text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="relative">
        <LexicalComposer initialConfig={initialConfig}>
          <div className="relative">
            <ToolbarPlugin />
            <div className="p-3 border-t-1">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable 
                    className="outline-none border-none min-h-[160px] h-full resize-y" 
                    ariaLabel="Editor de texto rico"
                    spellCheck={true}
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    aria-autocomplete="list"
                    role="textbox"
                    aria-multiline="true"
                    onClick={handleEditorClick}
                    onBlur={(e) => {
                      // Prevenimos a perda de foco se o clique foi dentro do editor
                      const editorElement = editor?.getRootElement();
                      if (editorElement && editorElement.contains(e.relatedTarget as Node)) {
                        e.preventDefault();
                        // Refocar o editor se necessário
                        setTimeout(() => editor?.focus(), 0);
                      }
                    }}
                    onFocus={() => {
                      // Garantimos que o editor mantenha o cursor na posição correta
                      setTimeout(() => {
                        editor?.getEditorState().read(() => {
                          // Apenas forçar a releitura do estado atual
                        });
                      }, 0);
                    }}
                    onKeyDown={(e) => {
                      // Monitorar as teclas de seta para garantir que a posição do cursor seja mantida
                      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                        // Não interferimos com o comportamento normal
                      }
                    }}
                  />
                }
                placeholder={
                  <div className="absolute top-[10.25rem] left-4 text-gray-400 pointer-events-none">
                    Digite seu conteúdo aqui...
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <AutoFocusPlugin />
              <ListPlugin />
              <LinkPlugin />
              <TablePlugin />
              <TabIndentationPlugin />
              <AutoLinkPlugin />
              <CustomHorizontalRulePlugin />
              <CustomTablePlugin />
              <EmojiPickerPlugin />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
              <FontPlugin />
              <OnChangePlugin onChange={handleEditorChange} />
              <SelectionSavePlugin />
              <FocusPlugin />
              
              {/* Plugin para capturar a instância do editor */}
              {React.createElement(function EditorInitializerComponent() {
                const [editor] = useLexicalComposerContext();
                useEffect(() => {
                  setEditor(editor);
                  return () => {
                    setEditor(null);
                  };
                }, [editor]);
                return null;
              })}
            </div>
          </div>
        </LexicalComposer>
      </div>
      
      {isDevMode && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold">Debug - HTML Atual</h3>
            </div>
            <div className="text-xs font-mono p-2 bg-white border border-gray-200 rounded max-h-40 overflow-auto">
              {debugHtml || '<sem conteúdo>'}
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-bold mb-2">Preview HTML</h4>
              <div 
                className="p-4 bg-white border border-gray-200 rounded min-h-[100px]"
                dangerouslySetInnerHTML={{ __html: debugHtml }}
              />
            </div>
          </div>
        )}
      </div>
  );
};

export default EditorText;
