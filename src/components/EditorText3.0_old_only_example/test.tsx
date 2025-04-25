import React, { useState } from 'react';
import EditorText from './index';

const TestEditor: React.FC = () => {
  const [editorContent, setEditorContent] = useState<string>('<p>Conteúdo inicial de teste...</p>');
  
  // Esta tabela externa não deve ser afetada pelos estilos do editor
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Teste do Editor com Tailwind</h1>
      
      <div className="mb-4">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-gray-100">Coluna 1</th>
              <th className="border border-gray-300 p-2 bg-gray-100">Coluna 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2">Esta é uma tabela fora do editor</td>
              <td className="border border-gray-300 p-2">Não deve ser afetada pelos estilos do editor</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Editor de Texto Rich</h2>
        <EditorText 
          label="Editor de Texto" 
          value={editorContent} 
          onChange={(html) => setEditorContent(html)}
        />
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-2">HTML Gerado:</h3>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-40 text-sm">
          {editorContent}
        </pre>
      </div>
    </div>
  );
};

export default TestEditor; 