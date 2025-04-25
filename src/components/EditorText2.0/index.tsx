// import React, { useEffect, useRef } from 'react';
// import { Editor } from '@tinymce/tinymce-react';
// import { EditorEvent, RawEditorOptions, Editor as TinyMCEEditor } from 'tinymce';
// import nextConfig from '../../../next.config';
// import { useThemeStore } from '@/zustand-store/theme.store';

// export interface EditorTextProps {
//   id?: string; 
//   name?: string;
//   label?: string;
//   value?: string;
//   visible?: boolean;
//   disabled?: boolean;
//   isSelfHosted?: boolean;
//   onChange?: (value: string) => void; 
// }

// type EditorInitComplement = { selector?: undefined; target?: undefined; }

// type EditorInit = RawEditorOptions & EditorInitComplement & { readonly: undefined, license_key: undefined };

// const EditorText = ({ 
//   id, 
//   name,
//   label, 
//   value, 
//   disabled = false, 
//   visible = true, 
//   isSelfHosted = true,
//   onChange 
// }: EditorTextProps) => {
//   const theme = useThemeStore((state) => state.theme);

//   const editorRef = useRef<TinyMCEEditor | null>(null);

//   const host = window.location.origin;
//   const basePath = nextConfig.basePath;
//   const scriptSrc = `${host}${basePath}/tinymce/tinymce.min.js`;
  
//   const log = () => {
//     if (editorRef.current) {
//       //console.log(editorRef.current.getContent());
//     }
//   };

//   const init: EditorInit = {
//     promotion: false,
//     min_height: 500,
//     menubar: true,
//     language: 'pt_BR',
//     resize: true,
//     images_file_types: '',
//     insertdatetime_formats: ["%d/%m/%Y", "%H:%M", "%d/%m/%Y %H:%M"],
//     // mergetags_list: [
//     //   {
//     //     title: 'Example merge tags list',
//     //     menu: [
//     //       {
//     //         value: 'Example.1',
//     //         title: 'Example one'
//     //       },
//     //       {
//     //         value: 'Example.2',
//     //         title: 'Example two'
//     //       }
//     //     ]
//     //   }
//     // ],
//     plugins: [
//       //'mergetags',
//       'autoresize',
//       'advlist', 
//       'autolink', 
//       'lists', 
//       'link', 
//       //'image', 
//       'charmap', 
//       'preview',
//       'anchor', 
//       'searchreplace', 
//       'visualblocks', 
//       'code', 
//       'fullscreen',
//       'insertdatetime', 
//       //'media', 
//       'table', 
//       'emoticons',
//       'help', 
//       'wordcount',
//       //'nonbreaking',
//     ].join(' '),
//     toolbar1: [
//       'undo redo mergetags',
//       'fontfamily fontsize',
//     ].join(' '),
//     toolbar2: [
//       'bold italic',
//       'underline strikethrough',
//       'superscript subscript',
//       'forecolor',
//       'removeformat',
//     ].join(' '),
//     toolbar3: [
//       'alignleft aligncenter alignright alignjustify',
//       'lineheight',
//       'bullist numlist outdent indent',
//       //'help',
//     ].join(' '),
//     toolbar4: [
//       'charmap',
//       'emoticons',
//       'insertdatetime',
//       'preview',
//     ].join(' '),    
//     skin: theme === 'dark' ? 'oxide-dark' : 'oxide',
//     // skin_url: `${
//     //   theme === 'dark' ? 
//     //   'http://localhost.com:3000/everest/portal/EditorText/skins/ui/oxide-dark' 
//     //   : 
//     //   'http://localhost.com:3000/everest/portal/EditorText/skins/ui/oxide'
//     // }`, 
//     // content_css: `${
//     //   theme === 'dark' ? 
//     //   'http://localhost.com:3000/everest/portal/EditorText/skins/content/dark/content.css' 
//     //   : 
//     //   'http://localhost.com:3000/everest/portal/EditorText/skins/content/default/content.css'
//     // }`, 
//     content_style: `
//       html {}

//       body { 
//         font-family: Helvetica, Arial, sans-serif; 
//         font-size: 16px; 
//       }
//     `,
//     license_key: undefined,
//     readonly: undefined,  // Adicione esta linha
//   }

//   const handleChange = (event: any) => {
//     //const content: string = editorRef?.current?.getContent() ?? '';
//     //console.log(event, content);
//     //onChange && onChange(content);
//   }

//   const handleBlur = (event: EditorEvent<{focusedEditor: TinyMCEEditor | null}>) => {
//     const content: string = editorRef?.current?.getContent() ?? '';

//     if(onChange) {
//       onChange(content);
//     }
//   }

//   useEffect(() => {
//   }, []);

//   return (
//     visible ?
//     <div className='flex flex-col'>
//       <span className="relative top-2 pt-2 pb-3 font-sans font-normal text-sm pl-4 border-1 border-zinc-200  dark:border-black  rounded bg-white dark:bg-black text-zinc-500 dark:text-zinc-400">
//         {label}
//       </span>
//       <Editor
//         id={id}
//         textareaName={name}
//         tinymceScriptSrc={isSelfHosted ? scriptSrc : undefined} //use it in production mode, because it NO HAVE limit of requests/loads per month
//         apiKey={isSelfHosted ? undefined : 'your-key-here'} //use it only development mode, because it have a limit of 1000 requests/loads per month
//         onInit={(evt, editor) => editorRef.current = editor}
//         onChange={handleChange}
//         onBlur={handleBlur}
//         disabled={disabled}
//         initialValue={value}
//         init={init}
//       />
//     </div>
//     :
//     null
//   );
// }

// export default EditorText;

const EditorText = () => {
  return (
    <div>
      <h1>Editor Text</h1>
    </div>
  );
}

export default EditorText;
