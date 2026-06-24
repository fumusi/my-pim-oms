import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type Lang = 'en' | 'nl' | 'de'

const STORAGE_KEY = 'pim_lang'

function loadLang(): Lang {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'nl' || v === 'de' ? v : 'en'
}

const langSlice = createSlice({
  name: 'lang',
  initialState: { current: loadLang() } as { current: Lang },
  reducers: {
    setLang(state, action: PayloadAction<Lang>) {
      state.current = action.payload
      localStorage.setItem(STORAGE_KEY, action.payload)
    },
  },
})

export const { setLang } = langSlice.actions
export default langSlice.reducer
