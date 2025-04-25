import { toast } from "@/utils/toast";

export const copyToClipBoard = async (value: string | undefined) => {
  try {
    await navigator.clipboard.writeText(value ?? '');
  } catch (error: any) {
    console.error('Failed to copy to clipboard', value);

    toast.error({
      title: 'Falha ao copiar os dados para a área de transferência',
      description: error?.message,
    });
  }
};