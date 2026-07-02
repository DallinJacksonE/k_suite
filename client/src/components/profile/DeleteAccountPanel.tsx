import type { ChangeEvent } from 'react'

interface Props {
  email: string
  deleting: boolean
  confirmation: string
  onConfirmationChange(value: string): void
  onDelete(): void
}

export function DeleteAccountPanel({ email, deleting, confirmation, onConfirmationChange, onDelete }: Props) {
  function change(event: ChangeEvent<HTMLInputElement>) { onConfirmationChange(event.target.value) }
  return (
    <section className="profile-panel danger-panel">
      <h2>Delete account</h2>
      <p>Type your email address to confirm. Historical order snapshots may be retained for business records.</p>
      <label>Confirm email<input value={confirmation} onChange={change} /></label>
      <button type="button" className="danger-button" disabled={deleting || confirmation !== email} onClick={onDelete}>{deleting ? 'Deleting…' : 'Delete account'}</button>
    </section>
  )
}
