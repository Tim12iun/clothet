import {
  ArrowDown, ArrowUp, BookmarkSimple, CalendarBlank, Camera, CaretLeft, CaretRight, Check, CoatHanger, DiceFive, GearSix,
  Image, MagnifyingGlass, Person, Plus, SlidersHorizontal, SquaresFour, Trash, X, type Icon,
} from '@phosphor-icons/react'

// Ein Icon-Set: Phosphor. Oberfläche in "light" mit 24 px, aktive Zustände in "fill" (siehe DESIGN.md, Abschnitt 7).
const make = (P: Icon) => ({ on = false }: { on?: boolean }) => <P size={24} weight={on ? 'fill' : 'light'} aria-hidden="true" />

export const IconHanger = make(CoatHanger)
export const IconOutfit = make(SquaresFour)
export const IconCalendar = make(CalendarBlank)
export const IconPlus = make(Plus)
export const IconClose = make(X)
export const IconCamera = make(Camera)
export const IconImage = make(Image)
export const IconTrash = make(Trash)
export const IconUp = make(ArrowUp)
export const IconDown = make(ArrowDown)
export const IconPerson = make(Person)
export const IconChevronLeft = make(CaretLeft)
export const IconChevronRight = make(CaretRight)
export const IconSearch = make(MagnifyingGlass)
export const IconGear = make(GearSix)
export const IconDice = make(DiceFive)
export const IconSliders = make(SlidersHorizontal)
export const IconBookmark = make(BookmarkSimple)
export const IconCheck = ({ on: _on }: { on?: boolean } = {}) => <Check size={16} weight="bold" aria-hidden="true" />
