import { FileText, ListVideo, Plus, ScrollText, SquarePlay, Users } from 'lucide-react'

// A course open to all has no access list, so the page never renders that link and the stop
// about it is dropped rather than left pointing at nothing. The stops are numbered from
// whatever survives that, so dropping one cannot leave a gap in the count.
const getAdminCoursePageTour = ({ canManageAccess }) => [
  {
    id: 'summary',
    target: '[data-tour="admin-course-summary"]',
    icon: ScrollText,
    title: 'The course itself',
    points: [
      'Published or draft, and who it is open to',
      'What it holds, end to end, in one line',
      'Edit these from the courses page',
    ],
  },
  {
    id: 'chapter-form',
    target: '[data-tour="admin-chapter-new"]',
    icon: Plus,
    title: 'Add a chapter',
    points: [
      'A name and a YouTube playlist link',
      'Order decides where it sits in the list',
      'Lessons are pulled from the playlist',
    ],
  },
  {
    id: 'chapters',
    target: '[data-tour="admin-chapter-list"]',
    icon: ListVideo,
    title: 'Every chapter in order',
    points: [
      'Pick one to open it in the panel beside',
      'Each line carries its lessons and length',
      'The dot is its sync standing, the icon its settings',
      'Edit and delete sit under that icon',
    ],
  },
  {
    id: 'chapter-detail',
    target: '[data-tour="admin-chapter-detail"]',
    icon: SquarePlay,
    title: 'The chapter you picked',
    points: [
      'Empty until you pick one from the list',
      'Every lesson pulled from its playlist',
      'Sync Videos reads the playlist again',
    ],
  },
  canManageAccess ? {
    id: 'access',
    target: '[data-tour="admin-course-access"]',
    icon: Users,
    title: 'Who can watch it',
    points: [
      'This course is held for named students',
      'User Access is where you name them',
      'Access runs out after the duration',
    ],
  } : null,
  {
    id: 'notes',
    target: '[data-tour="admin-course-notes"]',
    icon: FileText,
    title: 'Notes for the course',
    points: [
      'A Drive folder synced onto the course',
      'Faculty read and print what is in it',
      'Manage Notes links the folder',
    ],
  },
].filter(Boolean).map((step, index) => ({ ...step, eyebrow: `Stop ${index + 1}` }))

export default getAdminCoursePageTour
