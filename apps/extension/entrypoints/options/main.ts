import { getClipAction, setClipAction, CLIP_ACTIONS, type ClipAction } from '../../lib/settings.js';

async function init(): Promise<void> {
  const current = await getClipAction();
  const form = document.getElementById('opts');
  const status = document.getElementById('status');
  if (!form) return;

  const inputs = form.querySelectorAll<HTMLInputElement>('input[name="clipAction"]');
  for (const input of inputs) {
    input.checked = input.value === current;
    input.addEventListener('change', async () => {
      const value = input.value;
      if (!input.checked || !(CLIP_ACTIONS as ReadonlyArray<string>).includes(value)) return;
      await setClipAction(value as ClipAction);
      if (status) {
        status.textContent = 'Saved';
        setTimeout(() => (status.textContent = ''), 1200);
      }
    });
  }
}

void init();
