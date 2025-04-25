
import 'suneditor/dist/css/suneditor.min.css';

import React, { useEffect, useRef } from 'react';
import dynamic from "next/dynamic";
import SunEditorCore from "suneditor/src/lib/core";
import { SunEditorOptions } from 'suneditor/src/options';
//import plugins from 'suneditor/src/plugins'
//import SunEditor from 'suneditor-react';

const SunEditor = dynamic(() => import("suneditor-react"), {
  ssr: false,
});

export interface EditorTextProps {
  id?: string; 
  label?: string;
  value?: string;
  visible?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void; 
}

export default function EditorText({ 
  id, 
  label, 
  value, 
  visible = true, 
  disabled, 
  onChange 
}: EditorTextProps) {
  const editorRef = useRef<SunEditorCore>();

  const getSunEditorInstance = (sunEditor: SunEditorCore) => {
    editorRef.current = sunEditor;
  };

  const handleKeyDown = (event: KeyboardEvent) => {}

  useEffect(() => {}, []);

  // const styles = stylesDark; //theme === 'light' ? stylesLight : stylesDark;
  // const classesKey = Object.keys(styles);
  // const classes = classesKey.map((key) => styles[key]).join(' ');

  const options: SunEditorOptions = {
    height: '200px',
    //className: classes,
    defaultStyle: 'font-family: Arial; font-size: 16px;',
    buttonList: [
      //["undo", "redo"],
      ["font"], 
      ["fontSize"], 
      ["showBlocks"],
      ["print"],
      //["paragraphStyle", "blockquote"], 
      ["fullScreen"],
      //["formatBlock"],
      "/", // Line break
      ["bold", "underline", "italic", "strike", "subscript", "superscript"],
      ["fontColor", "hiliteColor", "textStyle"],
      ["removeFormat"], 
      "/", // Line break
      ["align", "lineHeight", "list"],
      ["outdent", "indent"],
      ["horizontalRule", "table", "link", "image"],
      //["video", "audio"]
      //["preview", "codeView"],
    ],
  }

  return (
    visible ?
    <div className='flex flex-col gap-2 pt-2 bg-white rounded'>
      <span className="flex ml-2 text-zinc-700 font-sans font-normal text-sm">{label}</span>
      <SunEditor 
        lang="pt_br"
        width="100%"
        height='100%'
        placeholder={label}
        disableToolbar={disabled}
        disable={disabled}
        defaultValue={value}
        getSunEditorInstance={getSunEditorInstance} 
        setOptions={options}
        onChange={onChange}
        onKeyDown={handleKeyDown}
      />
    </div>
    :
    null
  );
}