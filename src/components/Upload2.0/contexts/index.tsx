import { fi } from 'date-fns/locale';
import React, { createContext, useState, useEffect, useContext as useContextPrimitive, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Accept, FileRejection } from 'react-dropzone';
import { v4 as uuid } from 'uuid';

export interface UpdateFileProps<T> {
  newFile: FileItem<T>;
}

export interface RetryUpdateFileProps<T> {
  newFile?: FileItem<T>;
}

export type FileItem<T> = T & { 
  id: string;
  dropzoneFile: File | FileRejection | undefined 
};

export type UpdateInfo = (props: UpdateInfoProps) => void;
export type UploadFile<T> = (props: UploadFileProps<T>) => void;
export type UpdateFile<T> = (id: string, props: UpdateFileProps<T>) => void;
export type RemoveFile<T> = (id: string) => void;
export type RetryUpload<T> = (id: string, props?: RetryUpdateFileProps<T>) => void;

export interface ProviderBag<T> {
  list: FileItem<T>[];
  updateInfo: UpdateInfo;
  uploadFiles: UploadFile<T>;
  updateFile: UpdateFile<T>
  removeFile: RemoveFile<T> 
  retryUpload: RetryUpload<T> 
}

export interface ProviderBagProps<T> {
  initialList: T[];
  visible?: boolean;
  disabled?: boolean;
  disabledGlobal?: boolean;
  onProcessUpload?: (file: FileItem<T>, updateFile: UpdateFile<T>) => void;
  onChange?: (list: FileItem<T>[]) => void;
  children: (bag: ProviderBag<T>) => React.ReactNode | React.ReactNode[];
} 

export interface Info {
  filesAccept: Accept | undefined;
  maxFiles: number | undefined;
  maxSizeFile: string | undefined;
  maxSizeListFile: string | undefined;
}

export interface ProviderData<T> {
  list: FileItem<T>[];
  info: Info;
  disabledGlobal: boolean;
}

export interface UpdateInfoProps {
  filesAccept?: Accept | undefined;
  maxFiles?: number | undefined;
  maxSizeFile?: string | undefined;
  maxSizeListFile?: string | undefined;
}

export interface UploadFileProps<T> {
  files: FileItem<T>[];
}

export interface ProviderFunctions<T> {
  updateInfo: UpdateInfo;
  uploadFiles: UploadFile<T>;
  updateFile: UpdateFile<T>
  removeFile: RemoveFile<T> 
  retryUpload: RetryUpload<T> 
}

export interface UploadRootHandles<T> {
  list: FileItem<T>[];
  updateInfo: UpdateInfo;
  uploadFiles: UploadFile<T>;
  updateFile: UpdateFile<T>
  removeFile: RemoveFile<T> 
  retryUpload: RetryUpload<T> 
}

export interface ContextProps<T> extends ProviderFunctions<T>, ProviderData<T> {}

const Context = createContext({} as ContextProps<any>);

const UploadProviderRef = <T,>({
  initialList,
  disabledGlobal = false,
  onChange,
  onProcessUpload,
  children,
}: ProviderBagProps<T>, ref: React.Ref<UploadRootHandles<T>>) => {
  const [fileList, setFileList] = useState<FileItem<T>[]>([]);
  const [filesPendingUpload, setFilesPendingUpload] = useState<FileItem<T>[]>([]);

  const [info, setInfo] = useState<Info>({
    filesAccept: undefined,
    maxFiles: undefined,
    maxSizeFile: undefined,
    maxSizeListFile: undefined,
  });

  const updateInfo = useCallback((props: UpdateInfoProps) => {
    setInfo((prevState) => ({
      ...prevState,
      ...props,
    }));
  }, []);

  const uploadFiles = useCallback(({ files }: UploadFileProps<T>) => {
    setFileList((prevState) => [...prevState, ...files]);
    setFilesPendingUpload(files);
  }, []);

  const updateFile = useCallback((id: string, { newFile }: UpdateFileProps<T>) => {
    setFileList((prevState) => {
      return prevState.map((file) => {
        if (file.id === id) {
          return newFile;
        }
        return file;
      });
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFileList((prevState) => {
      return prevState.filter((file) => file.id !== id);
    });
  }, []);

  const retryUpload = useCallback((id: string, props: RetryUpdateFileProps<T> = {}) => {
    const file = props?.newFile ? props.newFile : fileList.find((file) => file.id === id);

    if (!file) {
      return;
    }

    setFilesPendingUpload((prevState) => [...prevState, file]);
  }, [fileList]);

  useImperativeHandle(ref, () => ({
    list: fileList,
    updateInfo,
    uploadFiles,
    updateFile,
    removeFile,
    retryUpload,
  }), [fileList, updateInfo, uploadFiles, updateFile, removeFile, retryUpload]);

  useEffect(() => {
    if(!initialList) {
      return;
    }

    const initializedList: FileItem<T>[] = initialList.map(item => {
      return {
        id: uuid(),
        dropzoneFile: undefined,
        ...item,
      };
    });

    setFileList(initializedList);
  }, []);

  useEffect(() => {
    if(filesPendingUpload.length === 0) {
      return;
    }

    if(!onProcessUpload) {
      return 
    }
    
    const processFiles = async () => {
      await Promise.all(filesPendingUpload.map(async (file) => {
        onProcessUpload(file, updateFile);
      }));
      setFilesPendingUpload([]);
    };
  
    processFiles();
  }, [filesPendingUpload]);

  useEffect(() => {
    if(!onChange) {
      return
    }
    
    onChange(fileList);
  }, [fileList]);

  const providerContext: ContextProps<T> = {
    list: fileList,
    info,
    updateInfo,
    uploadFiles,
    removeFile,
    retryUpload,
    updateFile,
    disabledGlobal,
  };

  const providerBag: ProviderBag<T> = {
    list: fileList,
    updateInfo,
    uploadFiles,
    removeFile,
    retryUpload,
    updateFile,
  };

  return (
    <Context.Provider value={providerContext}>
      {children(providerBag)}
    </Context.Provider>
  );
};

export const useContext = function useContext<T>() {
  const context = useContextPrimitive<ContextProps<T>>(Context as any);
  return context;
}

export const UploadProvider = forwardRef(UploadProviderRef) as <T>(props: ProviderBagProps<T> & { ref?: React.Ref<ProviderFunctions<T>> }) => ReturnType<typeof UploadProviderRef>;
