import type { ComponentType } from 'react'

const youtubeSocialUrl = 'https://www.youtube.com/@KayliesCreations30'
const instagramSocialUrl = 'https://www.instagram.com/kayliescreations/'
const tiktokSocialUrl = 'https://www.tiktok.com/'

interface SocialLink {
  href: string
  label: string
  Icon: ComponentType
}

const socialLinks: SocialLink[] = [
  { href: youtubeSocialUrl, label: 'YouTube', Icon: YouTubeIcon },
  { href: instagramSocialUrl, label: 'Instagram', Icon: InstagramIcon },
  { href: tiktokSocialUrl, label: 'TikTok', Icon: TikTokIcon },
]

export function ClientFooter() {
  return (
    <footer className="client-shell__footer" aria-label="Kaylie's Creations social links">
      <p>Follow Kaylie's Creations</p>
      <nav className="client-shell__socials" aria-label="Social media links">
        {socialLinks.map((social) => (
          <a key={social.label} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label}>
            <social.Icon />
          </a>
        ))}
      </nav>
    </footer>
  )
}

function YouTubeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.9 12l-6.3 3.6Z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.1A4.9 4.9 0 1 1 7.1 12 4.9 4.9 0 0 1 12 7.1Zm0 2A2.9 2.9 0 1 0 14.9 12 2.9 2.9 0 0 0 12 9.1Zm5.1-2.4a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2Z" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M16.6 2c.4 3 2 4.8 5 5v3.4a8.6 8.6 0 0 1-5-1.5v6.5a6.6 6.6 0 1 1-6.6-6.6c.4 0 .8 0 1.2.1v3.6a3 3 0 0 0-1.2-.2 3.1 3.1 0 1 0 3.1 3.1V2h3.5Z" />
    </svg>
  )
}
