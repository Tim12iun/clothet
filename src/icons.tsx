import type { ReactNode } from 'react'

// Eigene Linien-Icons: 24er-Raster, Strich 1.75, runde Enden (siehe DESIGN.md, Abschnitt 7).
const I = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const IconHanger = () => <I><path d="M12 8.5V7.6c0-.9.5-1.4 1.2-1.8A2.4 2.4 0 1 0 9.6 3.7" /><path d="M12 8.5 3.6 14.2c-1.2.8-.6 2.8.9 2.8h15c1.500 0 2.100-2 .9-2.800z" /></I>
export const IconOutfit = () => <I><rect x="3.500" y="3.500" width="7" height="9" rx="1.500" /><rect x="13.500" y="3.500" width="7" height="5" rx="1.500" /><rect x="13.500" y="11.500" width="7" height="9" rx="1.500" /><rect x="3.500" y="15.500" width="7" height="5" rx="1.500" /></I>
export const IconCalendar = () => <I><rect x="3.500" y="5" width="17" height="15.500" rx="2.500" /><path d="M3.500 10h17M8 3v4M16 3v4" /></I>
export const IconPlus = () => <I><path d="M12 5v14M5 12h14" /></I>
export const IconClose = () => <I><path d="M6 6l12 12M18 6 6 18" /></I>
export const IconCamera = () => <I><path d="M4 8.500A1.500 1.500 0 0 1 5.500 7H8l1.500-2.500h5L16 7h2.500A1.500 1.500 0 0 1 20 8.500v9a1.500 1.500 0 0 1-1.500 1.500h-13A1.500 1.500 0 0 1 4 17.500z" /><circle cx="12" cy="13" r="3.500" /></I>
export const IconPaste = () => <I><rect x="5.500" y="5" width="13" height="15.500" rx="2" /><path d="M9 5V4.500A1 1 0 0 1 10 3.500h4a1 1 0 0 1 1 1V5M9 11h6M9 15h4" /></I>
export const IconImage = () => <I><rect x="3.500" y="4.500" width="17" height="15" rx="2.500" /><circle cx="9" cy="10" r="1.500" /><path d="m4 17 5-4.500 4 3.500 3-2.500 4 3.500" /></I>
export const IconTrash = () => <I><path d="M4.500 7h15M9.500 7V4.500h5V7M6.500 7l.8 12a1.500 1.500 0 0 0 1.500 1.500h6.400a1.500 1.500 0 0 0 1.500-1.500l.8-12" /></I>
export const IconUp = () => <I><path d="M12 19V5M6 11l6-6 6 6" /></I>
export const IconDown = () => <I><path d="M12 5v14M6 13l6 6 6-6" /></I>
export const IconPerson = () => <I><circle cx="12" cy="5.500" r="2.500" /><path d="M8 21v-6l-1.500-4.500A1.500 1.500 0 0 1 8 8.500h8a1.500 1.500 0 0 1 1.500 2L16 15v6M12 15v6" /></I>
export const IconChevronLeft = () => <I><path d="m14.500 5-7 7 7 7" /></I>
export const IconChevronRight = () => <I><path d="m9.500 5 7 7-7 7" /></I>
export const IconSearch = () => <I><circle cx="11" cy="11" r="6.500" /><path d="m16 16 4.500 4.500" /></I>
export const IconGear = () => <I><g transform="translate(12 12) scale(.84) translate(-12 -12)"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></g></I>
export const IconDice = () => <I><rect x="4" y="4" width="16" height="16" rx="3.500" /><circle cx="9" cy="9" r=".6" fill="currentColor" /><circle cx="15" cy="15" r=".6" fill="currentColor" /><circle cx="15" cy="9" r=".6" fill="currentColor" /><circle cx="9" cy="15" r=".6" fill="currentColor" /><circle cx="12" cy="12" r=".6" fill="currentColor" /></I>
export const IconSliders = () => <I><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></I>
export const IconBookmark = () => <I><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" /></I>
export const IconCheck = () => <I><path d="m5 12.5 4.5 4.5L19 7.5" /></I>
export const IconMinus = () => <I><path d="M5 12h14" /></I>
export const IconSort = () => <I><path d="M7 5v14M7 19l-3-3M7 19l3-3M17 19V5M17 5l-3 3M17 5l3 3" /></I>
export const IconChart = () => <I><path d="M5 20V10M12 20V4M19 20v-7" /></I>
