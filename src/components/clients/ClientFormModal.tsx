import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import type { Client } from '@/types';
import { useStore, type ClientDraft } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';

interface Props {
  open: boolean;
  client?: Client | null;
  onClose: () => void;
}

const EMPTY: ClientDraft = { name: '', company: '', industry: '', email: '', notes: '' };

export function ClientFormModal({ open, client, onClose }: Props) {
  const { saveClient } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<ClientDraft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ClientDraft, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDraft(client ? { name: client.name, company: client.company, industry: client.industry, email: client.email, notes: client.notes } : EMPTY);
  }, [open, client]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = 'Add a contact name.';
    if (!draft.company.trim()) next.company = 'Add a company name.';
    if (draft.email && !/^\S+@\S+\.\S+$/.test(draft.email)) next.email = 'That email doesn’t look right.';
    setErrors(next);
    if (Object.keys(next).length) return;
    saveClient(
      {
        name: draft.name.trim(),
        company: draft.company.trim(),
        industry: draft.industry.trim(),
        email: draft.email.trim(),
        notes: draft.notes.trim(),
      },
      client?.id,
    );
    toast(client ? `Saved “${draft.company.trim()}”` : `Added “${draft.company.trim()}”`);
    onClose();
  }

  const set = (k: keyof ClientDraft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Edit client' : 'New client'}
      description="Keep key contacts and context in one place."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="client-form">
            {client ? 'Save changes' : 'Add client'}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Client name" required placeholder="e.g. Layla Haddad" value={draft.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />
        <Input label="Company" required placeholder="e.g. Azure Shores" value={draft.company} error={errors.company} onChange={(e) => set('company', e.target.value)} />
        <Input label="Industry" placeholder="e.g. Real Estate" value={draft.industry} onChange={(e) => set('industry', e.target.value)} />
        <Input label="Email" type="email" placeholder="name@company.com" value={draft.email} error={errors.email} onChange={(e) => set('email', e.target.value)} />
        <Textarea
          label="Notes"
          wrapperClassName="sm:col-span-2"
          rows={4}
          placeholder="Preferences, approval process, brand sensitivities…"
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </form>
    </Modal>
  );
}
