// Every admin dialog is the same handful of fields wearing the same clothes, and a
// list of short things is typed into all of them the same way — as one comma
// separated line. Both live here once, so a form is the fields it asks for rather
// than another copy of how a field looks.
export const inputClass = 'mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800'
export const textAreaClass = `${inputClass} resize-y`
export const selectClass = `${inputClass} cursor-pointer`
export const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-200'
export const toggleClass = 'flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3'
export const checkboxClass = 'h-5 w-5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed'

export const toListInput = (values) => (Array.isArray(values) ? values.join(', ') : '')

export const parseListInput = (value) => (
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
)
