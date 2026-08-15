import axios from 'axios'
import { useEffect, useState } from 'react'
import { INSTITUTE, whatsappLink } from './instituteInfo'
import { parseListInput, toListInput } from './formFields'

// What the institute offers is written by the admin, read by the faculty and — where
// the admin has showcased it — carried by the public catalogue. All three read the
// same fields, so what a price of zero means, what a mode of learning is called and
// how content is saved are settled here once.
const API_BASE_URL = import.meta.env.VITE_BASE_URL

export const SHOWCASED_CONTENTS_URL = `${API_BASE_URL}/contents`
export const ADMIN_CONTENTS_URL = `${API_BASE_URL}/admin/contents`
export const FACULTY_CONTENTS_URL = `${API_BASE_URL}/faculty/contents`

// The three the server's enum allows, with the words the site prints for them. The
// server enforces the list too; repeating it here only stops a mode being picked
// that would be thrown back.
export const CONTENT_TYPES = [
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'online+hybrid', label: 'Online + Hybrid' },
]

export const getContentTypeLabel = (type) => (
  CONTENT_TYPES.find((option) => option.value === type)?.label || ''
)

// A fee the institute quotes per batch is held as zero rather than as words, so the
// number stays a number and only its reading changes.
export const ON_REQUEST_FEE = 'Fees on request'

export const formatContentPrice = (price) => (
  price > 0 ? `₹${Number(price).toLocaleString('en-IN')}` : ON_REQUEST_FEE
)

export const formatContentPriceNote = (price) => (price > 0 ? 'full course' : 'ask on WhatsApp')

export const isPriceOnRequest = (content) => !(content.price > 0)

// The card's own colour, and the only place it carries one. Cycling the palette by
// position is what makes a row of cards read as one set with several marks rather
// than as several palettes — and it is not something the admin should have to pick.
const CONTENT_ACCENTS = [
  'from-blue-500 via-indigo-500 to-cyan-400',
  'from-cyan-400 via-sky-500 to-blue-600',
  'from-emerald-400 via-teal-500 to-cyan-500',
  'from-amber-400 via-orange-500 to-rose-500',
  'from-fuchsia-500 via-purple-500 to-indigo-500',
]

export const getContentAccent = (index) => CONTENT_ACCENTS[index % CONTENT_ACCENTS.length]

export const ALL_CATEGORIES = 'All'

// The catalogue filters by whatever categories the admin actually used, in the order
// the catalogue lists them. Content filed under nothing still answers to "All".
export const getContentCategories = (contents) => [
  ALL_CATEGORIES,
  ...new Set(contents.map((content) => content.category).filter(Boolean)),
]

// One enquiry sentence per content, so the chat that opens already says what it is
// about instead of starting from "hi".
export const contentEnquiryLink = (content) => whatsappLink(
  `Hi ${INSTITUTE.legalName}, I want details about ${content.name}.`,
)

export const emptyContentForm = {
  name: '',
  description: '',
  price: '',
  duration: '',
  code: '',
  category: '',
  level: '',
  type: '',
  taughtBy: '',
  topics: '',
  prerequisites: '',
  isHighlighted: false,
}

export const toContentForm = (content) => ({
  ...emptyContentForm,
  name: content.name || '',
  description: content.description || '',
  price: Number.isFinite(Number(content.price)) ? String(content.price) : '',
  duration: content.duration || '',
  code: content.code || '',
  category: content.category || '',
  level: content.level || '',
  type: content.type || '',
  taughtBy: content.taughtBy || '',
  topics: toListInput(content.topics),
  prerequisites: toListInput(content.prerequisites),
  isHighlighted: Boolean(content.isHighlighted),
})

// Writing content and editing it differ by the id alone, so both go out from here and
// every caller gets the saved content back in the shape the server kept it in. The
// form is only converted on the way out, never judged: the schema is the one authority
// on what content may hold, and what it refuses comes back as the sentence to show.
export const saveContent = async ({ contentId, form }) => {
  const payload = {
    ...form,
    topics: parseListInput(form.topics),
    prerequisites: parseListInput(form.prerequisites),
  }

  const response = contentId
    ? await axios.patch(`${ADMIN_CONTENTS_URL}/${contentId}`, payload, { withCredentials: true })
    : await axios.post(ADMIN_CONTENTS_URL, payload, { withCredentials: true })

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Unable to save the content')
  }

  return response.data.data.content
}

// The catalogue, the footer and the enquiry form all name the same courses, and all
// three are on screen together. They ask once between them and share the answer; a
// request that failed is forgotten rather than cached, so the next page to mount asks
// again instead of inheriting the outage.
let showcasedContentsRequest = null

const loadShowcasedContents = () => {
  if (!showcasedContentsRequest) {
    showcasedContentsRequest = axios
      .get(SHOWCASED_CONTENTS_URL)
      .then((response) => {
        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to load the catalogue')
        }

        return response.data?.data?.contents || []
      })
      .catch((error) => {
        showcasedContentsRequest = null
        throw error
      })
  }

  return showcasedContentsRequest
}

export const useShowcasedContents = () => {
  const [state, setState] = useState({ contents: [], loading: true, failed: false })

  useEffect(() => {
    let isActive = true

    loadShowcasedContents()
      .then((contents) => {
        if (isActive) {
          setState({ contents, loading: false, failed: false })
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ contents: [], loading: false, failed: true })
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  return state
}
