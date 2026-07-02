import type { FormEvent } from 'react'
import type { UserProfileDetails } from '../../service/ClientTypes'

interface Props {
  user: UserProfileDetails
  saving: boolean
  onSave(input: { name: string; emailNotificationsEnabled: boolean }): void
}

export function ProfileInfoForm({ user, saving, onSave }: Props) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSave({ name: String(form.get('name') ?? user.name), emailNotificationsEnabled: form.get('emailNotificationsEnabled') === 'on' })
  }

  return (
    <form className="profile-panel" onSubmit={submit}>
      <h2>Profile details</h2>
      <label>Name<input name="name" defaultValue={user.name} /></label>
      <label className="inline"><input name="emailNotificationsEnabled" type="checkbox" defaultChecked={user.emailNotificationsEnabled !== false} /> Email notifications</label>
      <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
    </form>
  )
}
