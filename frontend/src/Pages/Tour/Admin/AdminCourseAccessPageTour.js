import { Globe, ListChecks, UserPlus, UserRoundCheck } from 'lucide-react'

// A course open to all never renders the two lists, so the walkthrough says the one
// thing there is to say about the page instead of pointing at panels that are absent.
const getAdminCourseAccessPageTour = ({ isOpenToAll }) => (isOpenToAll ? [
  {
    id: 'open',
    icon: Globe,
    eyebrow: 'This course',
    title: 'Open to all',
    points: [
      'Every registered user can watch it',
      'There is no access list to keep',
      'Turn Open to All off to hold it back',
    ],
  },
] : [
  {
    id: 'grant',
    target: '[data-tour="admin-access-grant"]',
    icon: UserPlus,
    eyebrow: 'Stop 1',
    title: 'Grant by phone',
    points: [
      'The phone they sign in with',
      'Access starts the moment you grant it',
      'It runs for the duration on the course',
    ],
  },
  {
    id: 'available',
    target: '[data-tour="admin-access-available"]',
    icon: ListChecks,
    eyebrow: 'Stop 2',
    title: 'Everyone without it',
    points: [
      'Every user who cannot watch this yet',
      'Add grants one without typing a phone',
      'They leave this list once added',
    ],
  },
  {
    id: 'granted',
    target: '[data-tour="admin-access-granted"]',
    icon: UserRoundCheck,
    eyebrow: 'Stop 3',
    title: 'Everyone with it',
    points: [
      'When each one loses access is shown',
      'Expired means it has already run out',
      'Custom Expiry gives one an end of its own',
      'Remove takes the course away at once',
    ],
  },
])

export default getAdminCourseAccessPageTour
