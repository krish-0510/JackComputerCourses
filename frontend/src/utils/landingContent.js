import {
  BookOpenCheck,
  CalendarCheck,
  Compass,
  MessagesSquare,
  PlayCircle,
  TerminalSquare,
} from 'lucide-react'
import { INSTITUTE, whatsappLink } from './instituteInfo'

// What the site says about the institute itself: how it teaches, how to join, what it
// answers before you ask. What it *offers* is not here — courses are written by the
// admin in the portal and read from the server, so adding one is no longer a deploy.
// See utils/content.js for those.

// The four public pages, in the order the navbar and the footer both list them.
export const PUBLIC_NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Courses', to: '/courses' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export const GENERAL_ENQUIRY_LINK = whatsappLink(
  `Hi ${INSTITUTE.legalName}, I want to know about your courses.`,
)

export const HELP_ME_CHOOSE_LINK = whatsappLink(
  `Hi ${INSTITUTE.legalName}, I need help choosing a course.`,
)

export const QUESTION_LINK = whatsappLink(`Hi ${INSTITUTE.legalName}, I have a question.`)

export const TICKER_WORDS = [
  'Python',
  'SQL',
  'CCC',
  'Tally',
  'Graphic Design',
  'Practice editor',
  'Student portal',
  'Classroom + online',
  'Chandkheda, Ahmedabad',
  `Since ${INSTITUTE.since}`,
]

export const PORTAL_FEATURES = [
  {
    icon: TerminalSquare,
    title: 'Practice editor in the browser',
    body: 'Write and run code from any computer. Nothing to install, nothing to configure — just start typing.',
  },
  {
    icon: PlayCircle,
    title: 'Course player',
    body: 'Go through your course topic by topic. Where you stopped is where you start next time.',
  },
  {
    icon: BookOpenCheck,
    title: 'Notes for every topic',
    body: 'Written by the faculty who teach it, not copied from a book. Revise before the exam or the interview.',
  },
  {
    icon: MessagesSquare,
    title: 'Ask a doubt, get an answer',
    body: 'Send your question to your faculty from inside the portal. No waiting for the next class.',
  },
  {
    icon: CalendarCheck,
    title: 'Your attendance, visible',
    body: 'See your own record any time. Parents asking how many classes you attended? Show them.',
  },
  {
    icon: Compass,
    title: 'A guided tour',
    body: 'First time on a portal like this? It walks you through every screen the day you log in.',
  },
]

// The three states the scroll-driven scene moves through. The text and the 3D object
// are scrubbed by the same progress value, so the words never describe a shape that has
// already gone past.
export const SCROLL_CHAPTERS = [
  {
    tag: 'Chapter 01',
    title: 'You type the first line',
    body: 'Class starts at the keyboard, not at a slide. The editor opens in the browser and the very first thing you do is write something that runs.',
    stat: 'Day one',
    statNote: 'you write code',
  },
  {
    tag: 'Chapter 02',
    title: 'It breaks, and you fix it',
    body: 'Errors are the lesson. Your faculty sits with the message on your screen until you can read it yourself — and then you read the next one alone.',
    stat: 'Every topic',
    statNote: 'ends in practice',
  },
  {
    tag: 'Chapter 03',
    title: 'You build the whole thing',
    body: 'Three months in, the projects are yours: a program you designed, a database you queried, work you can open in front of anyone and explain.',
    stat: '3 months',
    statNote: 'start to finish',
  },
]

export const LEARNING_MODES = [
  {
    tag: 'Classroom',
    title: 'In our lab, Chandkheda',
    body: 'A computer of your own, a faculty two steps away, and a batch small enough to ask a silly question in.',
    points: [
      'Slots from 9 AM to 9 PM',
      'Fits around college or a job',
      'Machines provided — no laptop needed',
    ],
  },
  {
    tag: 'Online',
    title: 'From home, on your time',
    body: 'The same syllabus through the student portal, with your faculty still on the other end of a message.',
    points: [
      'Topic-by-topic course player',
      'Practice editor in the browser',
      'Doubts answered by the same faculty',
    ],
  },
]

export const JOIN_STEPS = [
  {
    n: '01',
    title: 'Message us on WhatsApp',
    body: 'Tell us what you want to learn and what you already know. We reply between 9 AM and 9 PM.',
  },
  {
    n: '02',
    title: 'Come and see the class',
    body: 'Visit the lab in Chandkheda, sit in, meet the faculty who would teach you. No obligation.',
  },
  {
    n: '03',
    title: 'Get your login and start',
    body: 'We create your student account, put you in a batch that fits your day, and you begin.',
  },
]

export const FAQS = [
  {
    q: 'I have barely used a computer. Can I still join?',
    a: 'Yes. Both Python and SQL start from the very beginning, and CCC exists precisely for people who are new to computers. Nobody here will assume you already know something.',
  },
  {
    q: 'Can I do this alongside college or a job?',
    a: 'Yes — most of our students do. We are open 9 AM to 9 PM every day, so tell us your free hours and we will put you in a batch that fits them. If you miss a session, the topic is still in the portal.',
  },
  {
    q: 'Classroom or online — is there a difference?',
    a: 'Same syllabus, same faculty, same portal. The classroom gives you a machine and someone standing next to you; online gives you your own hours. Some students do both.',
  },
  {
    q: 'What are the fees?',
    a: 'Python is ₹10,000 and SQL is ₹10,000, each for the full 3 months. For CCC, Tally and Graphic Designing the fee depends on the batch and duration — message us and we will tell you the number straight away.',
  },
  {
    q: 'What are the batch timings?',
    a: 'We are open 9 AM to 9 PM, every day. Tell us your college or office hours and we will find a slot that fits instead of asking you to fit ours.',
  },
  {
    q: 'Do I need my own laptop?',
    a: 'Not for classroom batches — computers are provided in the lab. For online, any ordinary laptop or desktop with a browser is enough; the practice editor runs in the browser.',
  },
]

export const INSTITUTE_FACTS = [
  { k: `Teaching since ${INSTITUTE.since}`, v: 'Same place, same people, in Chandkheda.' },
  { k: 'Five faculty', v: 'Two for programming, two for CCC and Tally, one for graphic designing.' },
  { k: `Open ${INSTITUTE.openingHours}`, v: 'Every day, so a batch can fit around your college or job.' },
  { k: 'Our own portal', v: 'Built for this classroom — editor, notes, course player, attendance.' },
]

export const FACULTY = [
  {
    count: '2',
    role: 'Programming',
    label: 'Python · SQL',
    body: 'They take you from your first line of code to programs you write without help, and they stay with your batch from the first session to the last.',
  },
  {
    count: '2',
    role: 'CCC & Tally',
    label: 'Computer basics · Accounts',
    body: 'Patient with absolute beginners, and used to teaching people who came in nervous about touching a keyboard.',
  },
  {
    count: '1',
    role: 'Graphic Designing',
    label: 'Photoshop · CorelDRAW',
    body: 'Works the way a real design job works: a brief, a draft, feedback, a print-ready file.',
  },
]

export const TEACHING_APPROACH = [
  {
    tag: 'Small batches',
    body: 'Enough seats to run properly, few enough that a faculty notices when you have gone quiet.',
  },
  {
    tag: 'Keyboard first',
    body: 'Every topic ends with you typing it yourself. Watching someone else code teaches nobody.',
  },
  {
    tag: 'One faculty, start to finish',
    body: 'The person who begins your course is the person who finishes it. No rotating panel of teachers.',
  },
  {
    tag: 'Answers after class',
    body: 'Doubts do not wait for the next session. Ask through the portal or on WhatsApp.',
  },
]

// What the hero terminal types out. Kept here so the "day one" story on the home page
// and the courses it belongs to are edited side by side.
export const HERO_SCRIPT = `# your first class, day one
name = "Priya"
course = "Python"

for day in range(1, 91):
    practice(course)

print(name, "can code now.")

>>> Priya can code now.`
