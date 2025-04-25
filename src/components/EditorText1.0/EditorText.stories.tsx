import "./suneditor-storybook.min.css"; //only storybook mode

import { useState } from "react";
import { Meta, StoryObj } from "@storybook/react";

import EditorText, { EditorTextProps } from "../EditorText1.0";

export default {
  title: "Components/EditorText3.1",
  component: EditorText,
  decorators: [
    (Story) => {
      return Story();
    },
  ],
} as Meta<EditorTextProps>;

export const Default: StoryObj<EditorTextProps> = (args: EditorTextProps) => {
  const Component = () => {
    const [text, setText] = useState("");

    const handleOnChange = (value: string) => {
      setText(value);
    };

    return (
      <EditorText
        {...args}
        id="editorID"
        label="Label do editor"
        value={text}
        onChange={handleOnChange}
      />
    );
  };

  return <Component />;
};

Default.args = {
  visible: true,
};
