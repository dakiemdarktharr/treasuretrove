'use client';
import { useState, useRef, useEffect } from 'react';
import { ImagePlus, Upload, ChevronDown, LoaderCircle, ArrowUpRight } from 'lucide-react';
import { GROUPS, FAMILIES, suggestGroup, type Part, type GroupName } from '@/lib/inventory';
import { Modal } from './modal';

export async function imageData(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a JPG, PNG or WebP picture.');
  if (file.size > 15_000_000) throw new Error('Choose a picture smaller than 15 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this picture.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/webp', 0.82);
    if (data.length > 2_600_000) throw new Error('Choose a smaller picture.');
    return data;
  } finally {
    bitmap.close();
  }
}

export default function PartForm({
  initialId = '',
  initialGroup = '',
  part,
  onClose,
  onSaved,
}: {
  initialId?: string;
  initialGroup?: GroupName | '';
  part?: Part;
  onClose: () => void;
  onSaved: (part: Part) => void;
}) {
  const [partId, setPartId] = useState(part?.partId || initialId);
  const [usage, setUsage] = useState(part?.usage || '');
  const [type, setType] = useState(part?.type || '');
  const [group, setGroup] = useState<GroupName | ''>(part?.group || initialGroup);
  const [photo, setPhoto] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  async function accept(file: File) {
    setImageBusy(true);
    setError('');
    try {
      setPhoto(await imageData(file));
      if (formRef.current) formRef.current.dataset.dirty = 'yes';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open picture.');
    } finally {
      setImageBusy(false);
    }
  }
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.items || [])
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile();
      if (file) {
        event.preventDefault();
        void accept(file);
      }
    };
    document.addEventListener('paste', paste);
    return () => document.removeEventListener('paste', paste);
  }, []);
  const preview = photo || (part ? `/api/parts/${part.id}/photo?v=${part.photoVersion}` : '');
  const suggested = group || suggestGroup(usage, type, partId);
  function close() {
    if (
      !busy &&
      !imageBusy &&
      (!formRef.current?.dataset.dirty || window.confirm('Discard your unsaved changes?'))
    )
      onClose();
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!preview) {
      setError('Add a picture before saving.');
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await fetch(part ? `/api/parts/${part.id}` : '/api/parts', {
        method: part ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId,
          quantity: part?.quantity ?? Number(form.get('quantity')),
          name: form.get('name') || '',
          type,
          usage,
          group: suggested,
          location: form.get('location') || '',
          notes: form.get('notes') || '',
          ...(photo ? { photo } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSaved(data.part);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={part ? 'Edit component' : 'New component'} onClose={close} wide>
      <form
        ref={formRef}
        onSubmit={submit}
        onChange={() => {
          if (formRef.current) formRef.current.dataset.dirty = 'yes';
        }}
      >
        <div className="part-form-body">
          <div
            className={`photo-drop ${drag ? 'dragging' : ''} ${preview ? 'has-photo' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const file = e.dataTransfer.files[0];
              if (file) {
                if (formRef.current) formRef.current.dataset.dirty = 'yes';
                void accept(file);
              }
            }}
          >
            {preview ? (
              <img src={preview} alt="Component preview" />
            ) : (
              <>
                <span className="upload-icon">
                  <ImagePlus size={27} strokeWidth={1.3} />
                </span>
                <strong>Add a component picture</strong>
                <span>Drop an image here, or paste with Ctrl + V</span>
              </>
            )}
            <button
              type="button"
              className={preview ? 'photo-replace' : 'secondary'}
              onClick={() => fileRef.current?.click()}
              disabled={imageBusy}
            >
              {imageBusy ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />}
              {preview ? 'Replace picture' : 'Choose picture'}
            </button>
            <input
              ref={fileRef}
              aria-label="Component picture"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) void accept(e.target.files[0]);
                e.target.value = '';
              }}
            />
            {!preview && <small>JPG, PNG or WebP · up to 15 MB</small>}
          </div>
          <div className="form-main-fields">
            <label>
              Part ID
              <input
                name="partId"
                value={partId}
                onChange={(e) => setPartId(e.target.value)}
                placeholder="e.g. ESP32-WROOM-32"
                required
                maxLength={100}
                autoFocus
              />
            </label>
            {!part && (
              <label>
                Quantity
                <input
                  name="quantity"
                  type="number"
                  defaultValue={1}
                  min={0}
                  max={1000000}
                  step={1}
                  required
                />
              </label>
            )}
            <label>
              Component group
              <select value={group} onChange={(e) => setGroup(e.target.value as GroupName | '')}>
                <option value="">Automatic · {suggestGroup(usage, type, partId)}</option>
                {FAMILIES.map((family) => (
                  <optgroup key={family} label={family}>
                    {GROUPS.filter((g) => g.family === family).map((g) => (
                      <option key={g.name}>{g.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          <details className="optional-details" open={part ? true : undefined}>
            <summary>
              More details <span>Optional</span>
              <ChevronDown size={16} />
            </summary>
            <div className="optional-fields">
              <label>
                Name
                <input
                  name="name"
                  defaultValue={part?.name}
                  placeholder="e.g. Wi-Fi development board"
                  maxLength={150}
                />
              </label>
              <label>
                Type
                <input
                  name="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="e.g. Microcontroller"
                  maxLength={100}
                />
              </label>
              <label>
                Usage
                <textarea
                  name="usage"
                  value={usage}
                  onChange={(e) => setUsage(e.target.value)}
                  placeholder="What do you use this component for?"
                  maxLength={500}
                  rows={2}
                />
              </label>
              <label>
                Location
                <input
                  name="location"
                  defaultValue={part?.location}
                  placeholder="e.g. Drawer A3"
                  maxLength={100}
                />
              </label>
              <label>
                Notes
                <textarea name="notes" defaultValue={part?.notes} maxLength={2000} rows={2} />
              </label>
            </div>
          </details>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="modal-footer">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy || imageBusy}>
            {busy ? <LoaderCircle size={16} className="spin" /> : <ArrowUpRight size={17} />}
            {busy ? 'Saving…' : part ? 'Save changes' : 'Add component'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
