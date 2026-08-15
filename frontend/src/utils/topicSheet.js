import { downloadSheet, isEmptyCell, normalizeHeader, readSheetGrid } from './sheetFile'

// A syllabus is written in a spreadsheet long before it is written into this site, so a
// content's topics can be uploaded rather than retyped one comma at a time. One column,
// one topic per row — the sample below is exactly that, and it is also what the form
// shows so the shape reads without downloading anything.
export const TOPIC_SHEET_HEADER = 'topic'

const TOPIC_HEADERS = new Set([
  TOPIC_SHEET_HEADER,
  'topics',
  'topicname',
  'name',
  'title',
  'chapter',
  'lesson',
  'module',
  'syllabus',
].map(normalizeHeader))

export const SAMPLE_TOPICS = [
  'Variables, input and output',
  'Conditions and loops',
  'Lists, dictionaries and strings',
  'Functions and modules',
  'Reading errors and debugging',
  'A project of your own',
]

const SAMPLE_FILE_NAME = 'content-topics-sample'

// An uploaded sheet read down to the list it is holding. A header is looked for and
// skipped, but a bare list is a list too: with nothing to go by, the first column that
// has anything in it is the one being read and its first row is a topic rather than a
// label. Repeats are dropped here for the same reason the schema drops them — a topic
// listed twice is a typo, not two topics.
export const readTopicSheet = async (file) => {
  const grid = await readSheetGrid(file)
  const firstFilledRow = grid.findIndex((cells) => cells.some((cell) => !isEmptyCell(cell)))

  if (firstFilledRow < 0) {
    throw new Error('That file is empty.')
  }

  const headerColumn = grid[firstFilledRow].findIndex((cell) => TOPIC_HEADERS.has(normalizeHeader(cell)))
  const hasHeader = headerColumn >= 0
  const column = hasHeader ? headerColumn : grid[firstFilledRow].findIndex((cell) => !isEmptyCell(cell))

  const topics = [...new Set(
    grid
      .slice(hasHeader ? firstFilledRow + 1 : firstFilledRow)
      .map((cells) => String(cells[column] ?? '').trim())
      .filter(Boolean),
  )]

  if (!topics.length) {
    throw new Error('That file has no topics in it. Put one topic per row and try again.')
  }

  return topics
}

export const downloadSampleTopicSheet = (format) => downloadSheet({
  grid: [[TOPIC_SHEET_HEADER], ...SAMPLE_TOPICS.map((topic) => [topic])],
  fileName: SAMPLE_FILE_NAME,
  format,
  sheetName: 'Topics',
})
