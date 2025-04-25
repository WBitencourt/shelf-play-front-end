import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_LOW,
  createCommand,
  LexicalCommand,
  $createRangeSelection
} from 'lexical';
import { 
  $isListNode, 
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND 
} from '@lexical/list';
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingTagType,
} from '@lexical/rich-text';
import { $wrapNodes } from '@lexical/selection';
import {
  $findMatchingParent,
  $getNearestNodeOfType,
  mergeRegister,
} from '@lexical/utils';
import { useCallback, useEffect, useState, useRef } from 'react';
import { TOGGLE_EMOJI_COMMAND } from './EmojiPickerPlugin';
import { CHANGE_FONT_FAMILY_COMMAND, CHANGE_FONT_SIZE_COMMAND } from './FontPlugin';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  Undo, 
  Redo, 
  Copy, 
  ClipboardPaste, 
  Smile, 
  Minus, 
  Table, 
  ChevronDown
} from 'lucide-react';

// Criando nosso próprio comando para inserir linha horizontal
export const INSERT_HORIZONTAL_RULE_COMMAND: LexicalCommand<void> = createCommand('INSERT_HORIZONTAL_RULE_COMMAND');

export const INSERT_TABLE_COMMAND: LexicalCommand<{
  rows: number;
  columns: number;
}> = createCommand('INSERT_TABLE_COMMAND');

// Adicione este comando para fontes e tamanhos
export const FORMAT_FONT_COMMAND: LexicalCommand<string> = createCommand('FORMAT_FONT_COMMAND');
export const FORMAT_FONT_SIZE_COMMAND: LexicalCommand<string> = createCommand('FORMAT_FONT_SIZE_COMMAND');

const ToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isOrderedList, setIsOrderedList] = useState(false);
  const [isUnorderedList, setIsUnorderedList] = useState(false);
  const [currentBlockType, setCurrentBlockType] = useState('paragraph');
  const [isBlockTypeDropdownOpen, setIsBlockTypeDropdownOpen] = useState(false);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [fontSize, setFontSize] = useState('12pt');
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  
  const fontOptions = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
  const fontSizeOptions = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '24pt', '30pt', '36pt', '48pt', '60pt'];

  // Refs para os dropdowns
  const blockTypeRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);

  // Função para verificar o estado da formatação atual
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));

      // Verificar tipo do bloco atual (parágrafo, título, etc)
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === 'root'
        ? anchorNode
        : $findMatchingParent(anchorNode, e => {
            const parent = e.getParent();
            return parent !== null && $getRoot().is(parent);
          });

      if (element) {
        if ($isHeadingNode(element)) {
          setCurrentBlockType(`${element.getTag()}`);
        } else if ($isListNode(element)) {
          if (element.getListType() === 'bullet') {
            setCurrentBlockType('ul');
            setIsUnorderedList(true);
            setIsOrderedList(false);
          } else if (element.getListType() === 'number') {
            setCurrentBlockType('ol');
            setIsOrderedList(true);
            setIsUnorderedList(false);
          }
        } else {
          setCurrentBlockType('paragraph');
          setIsOrderedList(false);
          setIsUnorderedList(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    const applyFontStyle = (callback: () => void) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          callback();
        }
      });
    };

    const fontStyleHandler = (font: string) => {
      applyFontStyle(() => {
        const rootElement = editor.getRootElement();
        if (rootElement) {
          rootElement.style.fontFamily = font;
        }
      });
      return true;
    };

    const fontSizeHandler = (size: string) => {
      applyFontStyle(() => {
        const rootElement = editor.getRootElement();
        if (rootElement) {
          rootElement.style.fontSize = size;
        }
      });
      return true;
    };

    // Registre os comandos
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(FORMAT_FONT_COMMAND, fontStyleHandler, COMMAND_PRIORITY_LOW),
      editor.registerCommand(FORMAT_FONT_SIZE_COMMAND, fontSizeHandler, COMMAND_PRIORITY_LOW)
    );
  }, [editor, updateToolbar]);

  // Efeito para fechar os dropdowns quando clica fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Fechar dropdown de tipo de bloco
      if (blockTypeRef.current && !blockTypeRef.current.contains(event.target as Node)) {
        setIsBlockTypeDropdownOpen(false);
      }
      
      // Fechar dropdown de fonte
      if (fontFamilyRef.current && !fontFamilyRef.current.contains(event.target as Node)) {
        setIsFontDropdownOpen(false);
      }
      
      // Fechar dropdown de tamanho
      if (fontSizeRef.current && !fontSizeRef.current.contains(event.target as Node)) {
        setIsSizeDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Funções para manipular os formatos
  const formatBold = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  };

  const formatItalic = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
  };

  const formatUnderline = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
  };

  const formatStrikethrough = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
  };

  const formatCode = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
  };

  const formatOrderedList = () => {
    if (isOrderedList) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const formatUnorderedList = () => {
    if (isUnorderedList) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }
  };

  const insertHorizontalRule = () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  };

  const openTableDialog = () => {
    setIsTableDialogOpen(true);
  };

  const closeTableDialog = () => {
    setIsTableDialogOpen(false);
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: tableRows, columns: tableColumns });
    closeTableDialog();
  };

  const formatHeading = (headingSize: number) => {
    if (headingSize < 1 || headingSize > 5) return;

    const headingTag = `h${headingSize}` as HeadingTagType;
    
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () => $createHeadingNode(headingTag));
      }
    });
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () => $createParagraphNode());
      }
    });
  };

  const undo = () => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  };

  const redo = () => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  };

  const formatAlign = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  const copyFormatted = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const clonedContents = range.cloneContents();
      const div = document.createElement('div');
      div.appendChild(clonedContents);
      
      // Usar a API de clipboard moderna
      navigator.clipboard.writeText(div.innerHTML)
        .then(() => {
          console.log('Conteúdo HTML copiado com sucesso');
        })
        .catch(err => {
          console.error('Falha ao copiar o conteúdo', err);
        });
    }
  };

  const pasteAsPlainText = () => {
    navigator.clipboard.readText()
      .then(text => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(text);
          }
        });
      })
      .catch(err => {
        console.error('Falha ao acessar a área de transferência', err);
      });
  };

  const openEmojiPicker = () => {
    // Obter a posição do botão para posicionar o picker
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      editor.dispatchCommand(TOGGLE_EMOJI_COMMAND, {
        anchorRect: rect,
      });
    }
  };

  // Função para atualizar a fonte
  const formatFont = (font: string) => {
    setFontFamily(font);
    console.log('Aplicando fonte:', font);
    editor.dispatchCommand(CHANGE_FONT_FAMILY_COMMAND, font);
    setIsFontDropdownOpen(false);
  };

  // Função para atualizar o tamanho da fonte
  const formatFontSize = (size: string) => {
    setFontSize(size);
    console.log('Aplicando tamanho de fonte:', size);
    editor.dispatchCommand(CHANGE_FONT_SIZE_COMMAND, size);
    setIsSizeDropdownOpen(false);
  };

  // Função para obter o texto correspondente ao tipo de bloco
  const getBlockTypeText = (blockType: string) => {
    switch (blockType) {
      case 'paragraph':
        return 'Parágrafo';
      case 'h1':
        return 'Título 1';
      case 'h2':
        return 'Título 2';
      case 'h3':
        return 'Título 3';
      case 'h4':
        return 'Título 4';
      case 'h5':
        return 'Título 5';
      default:
        return 'Parágrafo';
    }
  };

  const blockTypeText = getBlockTypeText(currentBlockType);

  return (
    <div className="bg-white dark:bg-gray-800 border-t-1">
      {/* Linha 1: Desfazer, Refazer, Fonte e Tamanho */}
      <div className="flex flex-wrap items-center p-1 border-b border-gray-200 dark:border-gray-700">
        <button 
          onClick={undo} 
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 mr-0.5"
          aria-label="Desfazer"
          title="Desfazer"
          type="button"
        >
          <Undo className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button 
          onClick={redo} 
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Refazer"
          title="Refazer"
          type="button"
        >
          <Redo className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <div className="mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
        
        {/* Seletor de Fonte */}
        <div className="relative inline-block mr-1" ref={fontFamilyRef}>
          <button 
            className="flex items-center p-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300"
            type="button"
            onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
          >
            <span className="px-1">{fontFamily}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {isFontDropdownOpen && (
            <div className="absolute z-10 mt-1 w-40 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
              {fontOptions.map((font) => (
                <button
                  key={font}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => formatFont(font)}
                >
                  {font}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Seletor de Tamanho */}
        <div className="relative inline-block" ref={fontSizeRef}>
          <button 
            className="flex items-center p-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300"
            type="button"
            onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)}
          >
            <span className="px-1">{fontSize}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {isSizeDropdownOpen && (
            <div className="absolute z-10 mt-1 w-20 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-48 overflow-y-auto">
              {fontSizeOptions.map((size) => (
                <button
                  key={size}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => formatFontSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Linha 2: Formatação de texto */}
      <div className="flex flex-wrap items-center p-1 border-b border-gray-200 dark:border-gray-700">
        <button 
          onClick={formatBold} 
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isBold ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          aria-label="Negrito"
          title="Negrito"
          type="button"
        >
          <Bold className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button 
          onClick={formatItalic} 
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isItalic ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          aria-label="Itálico"
          title="Itálico"
          type="button"
        >
          <Italic className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button 
          onClick={formatUnderline} 
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isUnderline ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          aria-label="Sublinhado"
          title="Sublinhado"
          type="button"
        >
          <Underline className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button 
          onClick={formatStrikethrough} 
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isStrikethrough ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          aria-label="Tachado"
          title="Tachado"
          type="button"
        >
          <Strikethrough className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button 
          onClick={formatCode} 
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isCode ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          aria-label="Código"
          title="Código"
          type="button"
        >
          <Code className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
      
      {/* Linha 3: Alinhamento e Listas */}
      <div className="flex flex-wrap items-center p-1 border-b border-gray-200 dark:border-gray-700">
        <button 
          onClick={() => formatAlign('left')} 
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Alinhar à Esquerda"
          title="Alinhar à Esquerda"
          type="button"
        >
          <AlignLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button 
          onClick={() => formatAlign('center')} 
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Centralizar"
          title="Centralizar"
          type="button"
        >
          <AlignCenter className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button 
          onClick={() => formatAlign('right')} 
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Alinhar à Direita"
          title="Alinhar à Direita"
          type="button"
        >
          <AlignRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button 
          onClick={() => formatAlign('justify')} 
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Justificar"
          title="Justificar"
          type="button"
        >
          <AlignJustify className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <div className="mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
        
        <button 
          onClick={formatOrderedList} 
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isOrderedList ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          aria-label="Lista Numerada"
          title="Lista Numerada"
          type="button"
        >
          <ListOrdered className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button 
          onClick={formatUnorderedList} 
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isUnorderedList ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          aria-label="Lista com Marcadores"
          title="Lista com Marcadores"
          type="button"
        >
          <List className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Linha 4: Funções especiais */}
      <div className="flex flex-wrap items-center p-1">
        <button 
          onClick={openEmojiPicker}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Inserir Emoji"
          title="Inserir Emoji"
          type="button"
        >
          <Smile className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <button 
          onClick={copyFormatted}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Copiar Formatado"
          title="Copiar Formatado"
          type="button"
        >
          <Copy className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <button 
          onClick={pasteAsPlainText}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Colar como Texto Simples"
          title="Colar como Texto Simples"
          type="button"
        >
          <ClipboardPaste className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <button 
          onClick={insertHorizontalRule}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Inserir Linha Horizontal"
          title="Inserir Linha Horizontal"
          type="button"
        >
          <Minus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        <button 
          onClick={openTableDialog}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Inserir Tabela"
          title="Inserir Tabela"
          type="button"
        >
          <Table className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        
        {/* Seletor de tipo de bloco */}
        <div className="relative ml-2" ref={blockTypeRef}>
          <button 
            type="button" 
            className="flex items-center px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300"
            onClick={() => setIsBlockTypeDropdownOpen(!isBlockTypeDropdownOpen)}
            aria-label="Tipo de bloco"
            aria-haspopup="true"
            aria-expanded={isBlockTypeDropdownOpen}
          >
            <span>{blockTypeText}</span>
            <ChevronDown className="w-3 h-3 ml-2" />
          </button>
          
          {isBlockTypeDropdownOpen && (
            <div className="absolute z-10 mt-1 w-40 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => {
                  formatParagraph();
                  setIsBlockTypeDropdownOpen(false);
                }}
              >
                Parágrafo
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => {
                  formatHeading(1);
                  setIsBlockTypeDropdownOpen(false);
                }}
              >
                Título 1
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => {
                  formatHeading(2);
                  setIsBlockTypeDropdownOpen(false);
                }}
              >
                Título 2
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => {
                  formatHeading(3);
                  setIsBlockTypeDropdownOpen(false);
                }}
              >
                Título 3
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => {
                  formatHeading(4);
                  setIsBlockTypeDropdownOpen(false);
                }}
              >
                Título 4
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => {
                  formatHeading(5);
                  setIsBlockTypeDropdownOpen(false);
                }}
              >
                Título 5
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de Tabela com Tailwind */}
      {isTableDialogOpen && (
        <div className="absolute z-10 top-24 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg w-64">
          <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Inserir Tabela</h3>
            <button 
              type="button" 
              onClick={closeTableDialog} 
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          <div className="p-3">
            <div className="mb-3">
              <div className="flex items-center mb-2">
                <label className="block text-sm w-16 text-gray-700 dark:text-gray-300">Linhas:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Number(e.target.value))}
                  className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                />
              </div>
              <div className="flex items-center">
                <label className="block text-sm w-16 text-gray-700 dark:text-gray-300">Colunas:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableColumns}
                  onChange={(e) => setTableColumns(Number(e.target.value))}
                  className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button 
                type="button" 
                onClick={closeTableDialog}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={insertTable}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Inserir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolbarPlugin; 