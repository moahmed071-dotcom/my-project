import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '@/lib/clipboard';
import { Button, type ButtonProps } from './Button';
import { useToast } from './Toast';

interface Props extends Omit<ButtonProps, 'onClick'> {
  text: string | (() => string);
  label?: string;
  toastMessage?: string;
}

export function CopyButton({ text, label = 'Copy', toastMessage = 'Copied to clipboard', variant = 'outline', size = 'sm', ...rest }: Props) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function handle() {
    const ok = await copyText(typeof text === 'function' ? text() : text);
    if (ok) {
      setCopied(true);
      toast(toastMessage);
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast('Copy failed — your browser blocked clipboard access', 'error');
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handle}
      icon={copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
      aria-label={label || 'Copy'}
      {...rest}
    >
      {label && (copied ? 'Copied' : label)}
    </Button>
  );
}
