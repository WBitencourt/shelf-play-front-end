# Changelog - Editor de Rich Text (EditorText2.1)

## [Versão Atual] - 2024

### Adicionado

- Implementado suporte completo para temas claro e escuro em todos os elementos da interface
- Criado `FontPlugin` para melhor gerenciamento de fonte e tamanho
- Adicionado `AutoLinkPlugin` para detecção automática de links
- Integração com a biblioteca de ícones Lucide React
- Implementado suporte a atalhos de Markdown
- Adicionado tratamento especial para HTML vazio como `<p><br></p>`
- Criados arquivos README e CHANGELOG para documentação

### Modificado

- Refatorado o sistema de importação/exportação HTML para maior robustez
- Migrado de CSS global para estilos isolados com Tailwind CSS
- Reorganizada a barra de ferramentas para melhor usabilidade
- Melhorada a detecção de seleção de texto e formatação
- Atualizado o sistema de logs para depuração
- Corrigido o tratamento de fontes e tamanhos de texto

### Corrigido

- Resolvido problema com botões sem o atributo `type="button"`
- Corrigido problema com renderização de HTML vazio
- Ajustada a exportação HTML para evitar tags desnecessárias
- Corrigidos problemas de estilo que afetavam outras partes da aplicação
- Melhorada a acessibilidade e internacionalização

## Melhorias Pendentes

- Implementar seleção de cores para texto e fundo
- Adicionar suporte a inserção de imagens
- Melhorar a experiência em dispositivos móveis
- Implementar fórmulas matemáticas
- Adicionar suporte a mais formatos de exportação
