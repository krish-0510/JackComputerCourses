import { downloadSheet, isEmptyCell, normalizeHeader, readSheetGrid } from './sheetFile'

// Everything that touches the bulk import sheet reads it from here: the sample file is
// written from these columns, an uploaded file is matched against them, and the preview
// takes its labels from them. Nothing else has to know what a column is called — and
// nothing here has to know what a .xlsx is, which sheetFile handles for every import.
export const SHEET_COLUMNS = [
  {
    key: 'firstName',
    header: 'firstname',
    label: 'First name',
    required: true,
    aliases: ['first', 'fname', 'givenname'],
  },
  {
    key: 'lastName',
    header: 'lastname',
    label: 'Last name',
    required: true,
    aliases: ['last', 'lname', 'surname'],
  },
  {
    key: 'phone',
    header: 'phno',
    label: 'Phone',
    required: true,
    aliases: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contact', 'contactnumber'],
  },
  {
    key: 'password',
    header: 'password',
    label: 'Password',
    required: false,
    aliases: ['pass'],
  },
]

// The rows the sample file ships with. They double as the demo the animation types out,
// so an admin downloads exactly the sheet they just watched being filled in — two of
// them leave the password empty, which is how the auto password gets shown off.
export const SAMPLE_USERS = [
  { firstName: 'Priya', lastName: 'Shah', phone: '9825012345', password: '' },
  { firstName: 'Rahul', lastName: 'Mehta', phone: '9737045678', password: 'rahul@2026' },
  { firstName: 'Anita', lastName: 'Desai', phone: '9574098765', password: '' },
]

const SAMPLE_FILE_NAME = 'bulk-users-sample'

const COLUMN_KEY_BY_HEADER = new Map(
  SHEET_COLUMNS.flatMap((column) => (
    [column.header, ...column.aliases].map((alias) => [normalizeHeader(alias), column.key])
  )),
)

// A filled-in sheet read down to the rows the import posts. Row numbers are the ones
// the admin sees in their own spreadsheet, so a refusal points at a row they can find.
export const readUserSheet = async (file) => {
  const grid = await readSheetGrid(file)
  const headerIndex = grid.findIndex((cells) => cells.some((cell) => !isEmptyCell(cell)))

  if (headerIndex < 0) {
    throw new Error('That file is empty.')
  }

  const columnIndexByKey = {}

  grid[headerIndex].forEach((cell, index) => {
    const key = COLUMN_KEY_BY_HEADER.get(normalizeHeader(cell))

    if (key && !(key in columnIndexByKey)) {
      columnIndexByKey[key] = index
    }
  })

  const missingColumns = SHEET_COLUMNS.filter((column) => column.required && !(column.key in columnIndexByKey))

  if (missingColumns.length) {
    throw new Error(
      `The first row is missing the ${missingColumns.map((column) => column.header).join(' and ')} `
      + `column${missingColumns.length === 1 ? '' : 's'}. Download the sample file for the headers it expects.`,
    )
  }

  const rows = []

  grid.slice(headerIndex + 1).forEach((cells, index) => {
    const row = Object.fromEntries(SHEET_COLUMNS.map((column) => [
      column.key,
      String(cells[columnIndexByKey[column.key]] ?? '').trim(),
    ]))

    // A row that says nothing at all is spacing in the file, not a refused account.
    if (SHEET_COLUMNS.some((column) => row[column.key])) {
      rows.push({ ...row, rowNumber: headerIndex + index + 2 })
    }
  })

  if (!rows.length) {
    throw new Error('That file has a header row but no users under it.')
  }

  return rows
}

export const downloadSampleSheet = (format) => downloadSheet({
  grid: [
    SHEET_COLUMNS.map((column) => column.header),
    ...SAMPLE_USERS.map((user) => SHEET_COLUMNS.map((column) => user[column.key])),
  ],
  fileName: SAMPLE_FILE_NAME,
  format,
  sheetName: 'Users',
})
