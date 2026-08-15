const mongoose = require('mongoose');

// Names are stored as one "First Last" string, so every writer hands over the
// combined value and this setter decides the casing for all of them.
const formatName = (value) => String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

// Accounts made before names were split still hold a single word, so they are
// asked for a first and a last name once before they can use the app.
const hasFullName = (value) => formatName(value).split(' ').filter(Boolean).length >= 2;

// Every profile detail is volunteered, so they are handled as one set: the form sends
// them together, the account may leave all of them empty, and nothing gates on them.
const PROFILE_TEXT_FIELDS = ['email', 'alternatePhone', 'occupation', 'address', 'city', 'state', 'pincode'];

// The account is asked for two optional things — the rest of its profile, and a review
// of the institute — and both asks work the same way: they are put once a login lands
// on the dashboard, going through the form answers them for good, and "remind me later"
// is answered by the calendar rather than by the next login, so the prompt stays out of
// the way for its own number of days however often the account signs in. Only the wait
// and the pair of dates differ, so every prompt reads its behaviour off this one table.
const PROMPTS = {
    profile: {
        days: 3,
        answeredField: 'profileUpdatedAt',
        remindField: 'profileRemindAfter'
    },
    review: {
        days: 7,
        answeredField: 'reviewSubmittedAt',
        remindField: 'reviewRemindAfter'
    }
};

const DAY_MS = 24 * 60 * 60 * 1000;

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required() {
            return this.isNew;
        },
        set: formatName
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    activeSessionId: {
        type: String,
        default: null,
        select: false
    },
    // Being blocked is a standing the account carries rather than something done to its
    // data, so it is stored as the moment it was applied and read as a yes or no. While
    // it is set the account cannot sign in and holds no session; clearing it lets the
    // same phone and password back in with everything it owned untouched.
    bannedAt: {
        type: Date,
        default: null
    },
    // The guided walkthrough runs once per account, so the moment it was finished
    // is the only thing that has to outlive the session it ran in.
    tourCompletedAt: {
        type: Date,
        default: null
    },
    // Optional details the account may volunteer. A rule only has something to say
    // once a value is actually typed, so an empty field is always accepted.
    profile: {
        email: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
            maxlength: [120, 'Email is too long'],
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address']
        },
        alternatePhone: {
            type: String,
            default: '',
            trim: true,
            match: [/^\d{10,15}$/, 'Alternate phone must be 10 to 15 digits']
        },
        occupation: {
            type: String,
            default: '',
            trim: true,
            maxlength: [80, 'Occupation is too long']
        },
        address: {
            type: String,
            default: '',
            trim: true,
            maxlength: [200, 'Address is too long']
        },
        city: {
            type: String,
            default: '',
            trim: true,
            maxlength: [60, 'City is too long']
        },
        state: {
            type: String,
            default: '',
            trim: true,
            maxlength: [60, 'State is too long']
        },
        pincode: {
            type: String,
            default: '',
            trim: true,
            match: [/^\d{4,10}$/, 'Pincode must be 4 to 10 digits']
        },
        dateOfBirth: {
            type: Date,
            default: null,
            validate: {
                validator: (value) => !value || (value.getTime() <= Date.now() && value.getFullYear() >= 1900),
                message: 'Date of birth must be a real date in the past'
            }
        }
    },
    // Going through a form once answers its prompt for good; asking for later only
    // moves it down the calendar, which is why the two are kept apart. Both prompts
    // carry the same pair of dates — see PROMPTS for what reads them.
    profileUpdatedAt: {
        type: Date,
        default: null
    },
    profileRemindAfter: {
        type: Date,
        default: null
    },
    // Written the first time the account reviews the institute. The reviews themselves
    // live in their own collection; this only retires the ask.
    reviewSubmittedAt: {
        type: Date,
        default: null
    },
    reviewRemindAfter: {
        type: Date,
        default: null
    }
});

// The form works in strings and gets back exactly what it can put in an input: an
// unset field reads as empty, and a date reads as the YYYY-MM-DD its picker expects.
const formatProfile = (profile) => ({
    ...Object.fromEntries(PROFILE_TEXT_FIELDS.map((field) => [field, profile?.[field] || ''])),
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : ''
});

// Only the fields that were sent are touched, so a form that carries part of the
// profile leaves the rest alone — and a box that was emptied clears its value rather
// than reading as "nothing to change". Anything unusable is left for validation.
const applyProfileInput = (user, input = {}) => {
    PROFILE_TEXT_FIELDS.forEach((field) => {
        if (field in input) {
            user.profile[field] = String(input[field] ?? '').trim();
        }
    });

    if ('dateOfBirth' in input) {
        const dateOfBirth = String(input.dateOfBirth ?? '').trim();

        user.profile.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

    return user;
};

// An account that has been through the form is never asked again. Until then it is
// asked on login, or once the days it asked to be left alone have passed.
const needsPrompt = (user, kind, now = new Date()) => {
    const { answeredField, remindField } = PROMPTS[kind];

    return !user[answeredField] && (!user[remindField] || user[remindField] <= now);
};

const getPromptRemindAfter = (kind, now = new Date()) => (
    new Date(now.getTime() + PROMPTS[kind].days * DAY_MS)
);

// The two answers a prompt can get, written the same way wherever they are given: from
// a document being saved (user.set) or straight from an update. Answering clears the
// reminder with it, so a date that has since passed can never put the prompt back.
const answerPrompt = (kind, now = new Date()) => ({
    [PROMPTS[kind].answeredField]: now,
    [PROMPTS[kind].remindField]: null
});

const remindPromptLater = (kind, now = new Date()) => ({
    [PROMPTS[kind].remindField]: getPromptRemindAfter(kind, now)
});

const User = mongoose.model('User', userSchema);

// Said in one voice wherever a blocked account is turned away, so the login that refuses
// it and anything that reports the refusal can never tell it two different things. It says
// what to do about it, because nothing on the account's own side can lift it.
User.BANNED_MESSAGE = 'Your account has been blocked by the admin. Please contact the admin to get access back.';

User.formatName = formatName;
User.hasFullName = hasFullName;
User.PROMPTS = PROMPTS;
User.formatProfile = formatProfile;
User.applyProfileInput = applyProfileInput;
User.needsPrompt = needsPrompt;
User.getPromptRemindAfter = getPromptRemindAfter;
User.answerPrompt = answerPrompt;
User.remindPromptLater = remindPromptLater;

module.exports = User;
