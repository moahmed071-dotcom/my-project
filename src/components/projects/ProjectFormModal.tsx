import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { PROJECT_CATEGORIES, PROJECT_STATUSES, type Project } from '@/types';
import { useStore, type ProjectDraft } from '@/store/AppStore';

interface Props {
  open: boolean;
  project?: Project | null;
  onClose: () => void;
  onSaved?: (p: Project) => void;
}

const EMPTY: ProjectDraft = {
  name: '',
  clientId: null,
  category: 'Branding',
  status: 'Planning',
  description: '',
};

export function ProjectFormModal({ open, project, onClose, onSaved }: Props) {
  const { clients, saveProject } = useStore();
  const [draft, setDraft] = useState<ProjectDraft>(EMPTY);
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDraft(
      project
        ? { name: project.name, clientId: project.clientId, category: project.category, status: project.status, description: project.description }
        : EMPTY,
    );
  }, [open, project]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setErrors({ name: 'Give the project a name.' });
      return;
    }
    const saved = saveProject({ ...draft, name: draft.name.trim(), description: draft.description.trim() }, project?.id);
    onSaved?.(saved);
    onClose();
  }

  const set = <K extends keyof ProjectDraft>(k: K, v: ProjectDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Edit project' : 'New project'}
      description={project ? 'Update the details for this project.' : 'Add a project to your workspace.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="project-form">
            {project ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input
          label="Project name"
          required
          wrapperClassName="sm:col-span-2"
          placeholder="e.g. Marina Crest Launch"
          value={draft.name}
          error={errors.name}
          onChange={(e) => set('name', e.target.value)}
        />
        <Select
          label="Client"
          wrapperClassName="sm:col-span-2"
          value={draft.clientId ?? ''}
          placeholder="No client"
          options={clients.map((c) => ({ value: c.id, label: c.company }))}
          onChange={(e) => set('clientId', e.target.value || null)}
          hint={clients.length === 0 ? 'Add clients from the Clients page to link them here.' : undefined}
        />
        <Select label="Category" value={draft.category} options={PROJECT_CATEGORIES} onChange={(e) => set('category', e.target.value as ProjectDraft['category'])} />
        <Select label="Status" value={draft.status} options={PROJECT_STATUSES} onChange={(e) => set('status', e.target.value as ProjectDraft['status'])} />
        <Textarea
          label="Description"
          wrapperClassName="sm:col-span-2"
          rows={4}
          placeholder="Scope, deliverables, key dates…"
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </form>
    </Modal>
  );
}
