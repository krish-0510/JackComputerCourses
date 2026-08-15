import { Filter, Globe, Plus } from 'lucide-react'

const adminContentsPageTour = [
  {
    id: 'new',
    target: '[data-tour="admin-content-new"]',
    icon: Plus,
    eyebrow: 'Stop 1',
    title: 'Write anything you offer',
    points: [
      'A name, a description, a price and a length',
      'Topics, prerequisites and the rest are optional',
      'A price of 0 reads as "fees on request"',
    ],
  },
  {
    id: 'filters',
    target: '[data-tour="admin-content-filters"]',
    icon: Filter,
    eyebrow: 'Stop 2',
    title: 'What the website carries',
    points: [
      'Everything you have written, in one place',
      'Filter by what is showcased and what is not',
      'Nothing is public until you showcase it',
    ],
  },
  {
    id: 'card',
    target: '[data-tour="admin-content-card"]',
    icon: Globe,
    eyebrow: 'Stop 3',
    title: 'Put it on the website',
    points: [
      'Showcase adds it to the course catalog',
      'Highlighted ones lead the catalog',
      'Edit and delete change it everywhere at once',
    ],
  },
]

export default adminContentsPageTour
