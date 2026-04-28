 
 
import { useRef } from 'react';

export function useFileInput(setInput: React.Dispatch<React.SetStateAction<string>>) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/') || file.name.match(/\.(json|js|ts|jsx|tsx|java|xml|txt|md|html|css|csv)$/i);
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (isImage) {
           setInput(prev => prev + `\n![${file.name}](${content})\n`);
        } else if (isText) {
           setInput(prev => prev + `\n\n\`\`\`${file.name}\n${content}\n\`\`\`\n`);
        } else {
           // For non-text/non-image, we can't easily embed content. Just note it.
           setInput(prev => prev + `\n[Attached File: ${file.name} (Binary)]\n`);
        }
      };
      
      if (isImage) {
        reader.readAsDataURL(file);
      } else if (isText) {
        reader.readAsText(file);
      } else {
        // Just trigger onload with empty string or handle differently
        reader.readAsDataURL(file); // Or just skip reading
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
    fileInputRef,
    handleAttachClick,
    handleFileChange
  };
}
