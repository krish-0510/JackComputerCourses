const mongoose = require('mongoose');

// What the institute offers, written by the admin rather than by us. The public
// catalogue used to be a list in the frontend source, so every new course was a
// deploy; it is a collection now, and the admin decides both what it says and
// whether the site carries it at all.
const CONTENT_TYPES = ['online', 'hybrid', 'online+hybrid'];

// Topics and prerequisites are typed as one comma separated line, so the blanks and
// the repeats a line like that collects are cleaned off here — once, rather than in
// every controller that writes one.
const toCleanList = (values) => [...new Set((values || [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean))];

const contentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Give this content a name'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Describe what this content is'],
        trim: true
    },
    // A number so it sorts and formats the same everywhere. Zero is how the institute
    // says the fee depends on the batch, and every reader of it prints "on request"
    // instead of "₹0" — which is what the old catalogue said in words.
    price: {
        type: Number,
        required: [true, 'Set a price, or 0 to quote it on request'],
        min: [0, 'Price cannot be negative']
    },
    // Free text, because "3 months" and "Ask us" are both honest answers here.
    duration: {
        type: String,
        required: [true, 'Say how long this runs for'],
        trim: true
    },
    code: {
        type: String,
        trim: true,
        default: ''
    },
    // What the catalogue filters by. Left empty, the content simply sits under "All".
    category: {
        type: String,
        trim: true,
        default: ''
    },
    level: {
        type: String,
        trim: true,
        default: ''
    },
    type: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
        enum: {
            values: ['', ...CONTENT_TYPES],
            message: 'Pick online, hybrid or online+hybrid'
        }
    },
    taughtBy: {
        type: String,
        trim: true,
        default: ''
    },
    topics: {
        type: [String],
        default: [],
        set: toCleanList
    },
    prerequisites: {
        type: [String],
        default: [],
        set: toCleanList
    },
    // The one the admin wants read first. It leads the catalogue and says so.
    isHighlighted: {
        type: Boolean,
        default: false
    },
    // Showcasing is the admin's pick of what the public site carries. The moment it
    // was picked is the whole of the state — content is showcased when it carries a
    // date — and it also orders the catalogue, newest pick first.
    showcasedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// The catalogue reads showcased content in the order it is shown in: the highlighted
// ones first, then whatever was picked most recently.
contentSchema.index({ isHighlighted: -1, showcasedAt: -1 });

const Content = mongoose.model('Content', contentSchema);

Content.TYPES = CONTENT_TYPES;

module.exports = Content;
