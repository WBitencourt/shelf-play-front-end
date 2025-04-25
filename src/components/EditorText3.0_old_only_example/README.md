# Editor de Rich Text (EditorText2.1)

Este é um editor de texto rico (Rich Text Editor) personalizado, construído com [Lexical](https://lexical.dev) e otimizado para o framework React.

## Recursos Implementados

### Funcionalidades Básicas

- Formatação de texto (negrito, itálico, sublinhado, tachado, código)
- Alinhamento de texto (esquerda, centro, direita, justificado)
- Listas ordenadas e não-ordenadas
- Cabeçalhos (H1-H5)
- Links
- Tabelas
- Emojis
- Importação/exportação HTML
- Histórico de ações (desfazer/refazer)

### Plugins Avançados

- **AutoLinkPlugin**: Detecta e converte URLs e emails em links automáticos
- **EmojiPickerPlugin**: Permite inserir emojis no texto
- **FontPlugin**: Gerencia a família e o tamanho da fonte
- **HorizontalRulePlugin**: Insere linhas horizontais
- **MarkdownShortcutPlugin**: Suporta atalhos de formatação em markdown
- **TablePlugin**: Permite criar e editar tabelas

### Design

- Interface moderna com Tailwind CSS
- Compatibilidade com temas claro e escuro
- Ícones da biblioteca Lucide React
- Barras de ferramentas organizadas por funcionalidade
- Dropdowns para seleção de fonte e tamanho

## Uso Básico

```tsx
import EditorText from "components/EditorText3.1";

function MyComponent() {
  const handleChange = (html: string) => {
    console.log("Conteúdo HTML:", html);
  };

  return (
    <EditorText
      label="Descrição"
      value="<p>Conteúdo inicial</p>"
      onChange={handleChange}
    />
  );
}
```

## Propriedades Suportadas

| Propriedade | Tipo                    | Descrição                                   |
| ----------- | ----------------------- | ------------------------------------------- |
| `id`        | string                  | ID do campo                                 |
| `name`      | string                  | Nome do campo                               |
| `label`     | string                  | Rótulo do campo                             |
| `value`     | string                  | Conteúdo HTML inicial                       |
| `visible`   | boolean                 | Define se o editor está visível             |
| `disabled`  | boolean                 | Define se o editor está desabilitado        |
| `onChange`  | (value: string) => void | Função chamada quando o conteúdo é alterado |

## Melhorias Futuras Potenciais

- Melhorar o suporte a colaboração em tempo real
- Implementar opções para exportar como Markdown
- Adicionar suporte para upload e gerenciamento de imagens
- Adicionar mais opções de customização de estilo (cores, espaçamento)
- Implementar plugins para comentários e tracking de alterações
- Melhorar a acessibilidade e suporte a leitores de tela
- Adicionar suporte para temas personalizados além de claro/escuro

## Solução de Problemas Conhecidos

### Botões Desfazer/Refazer não funcionam

- Verifique se o `HistoryPlugin` está corretamente importado e adicionado ao editor
- Confirme que os comandos UNDO_COMMAND e REDO_COMMAND estão sendo disparados

### Problemas de formatação de fonte

- O `FontPlugin` aplica estilos globalmente ao editor
- Para formatação específica por seleção, é necessário implementar nós personalizados

### Renderização de HTML com tags vazias

- O editor agora detecta e trata casos especiais como `<p><br></p>` e `<p></p>`
- O importador de HTML valida e processa o HTML antes de renderizá-lo

## Exemplo de Configuração

Para testar o componente de forma isolada, use o arquivo `test.tsx` que demonstra como o editor funciona com estilos Tailwind isolados.
