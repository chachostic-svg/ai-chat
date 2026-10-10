/** Минималистичный аватар оператора (белый силуэт на градиенте из CSS). */
export const AGENT_AVATAR_SVG = `
<svg class="jivo-agent-avatar" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <g fill="#fff">
    <circle cx="24" cy="19.5" r="8.2" opacity="0.98"/>
    <path d="M13.5 40c0-7.2 4.2-11.5 10.5-11.5S34.5 32.8 34.5 40H13.5z" opacity="0.92"/>
  </g>
  <path
    d="M9.5 22.5c0-8.5 6.5-14 14.5-14s14.5 5.5 14.5 14"
    fill="none"
    stroke="#fff"
    stroke-width="2.6"
    stroke-linecap="round"
    opacity="0.95"
  />
  <rect x="6.5" y="20" width="5.5" height="10" rx="2.75" fill="#fff" opacity="0.88"/>
  <rect x="36" y="20" width="5.5" height="10" rx="2.75" fill="#fff" opacity="0.88"/>
  <rect x="7.5" y="21.5" width="3.5" height="7" rx="1.75" fill="#a7f3d0" opacity="0.55"/>
  <rect x="37" y="21.5" width="3.5" height="7" rx="1.75" fill="#a7f3d0" opacity="0.55"/>
  <path
    d="M36.5 27.5c-3.8 4.2-7.5 5-11 3.8"
    fill="none"
    stroke="#fff"
    stroke-width="2"
    stroke-linecap="round"
    opacity="0.9"
  />
  <circle cx="24.5" cy="30.5" r="2" fill="#fff" opacity="0.95"/>
</svg>`;

export function agentAvatarHtml() {
  return AGENT_AVATAR_SVG.trim();
}
