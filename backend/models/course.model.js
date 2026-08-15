const mongoose = require('mongoose');

const isPositiveNumberString = (value) => {
    const numberValue = Number(value);

    return Number.isFinite(numberValue) && numberValue > 0;
};

const accessGrantSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        trim: true
    },
    grantedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    // A deadline set by hand for this one person, which stands in for the course
    // duration counted off grantedAt. Left null, the course's own clock applies.
    expiresAt: {
        type: Date,
        default: null
    }
}, {
    _id: false
});

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    duration: {
        type: String,
        trim: true,
        default: '',
        validate: {
            validator(value) {
                return this.isOpenToAll || isPositiveNumberString(value);
            },
            message: 'Duration must be a positive number of months'
        }
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    shortDescription: {
        type: String,
        trim: true,
        default: ''
    },
    thumbnailUrl: {
        type: String,
        trim: true,
        default: ''
    },
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
    language: {
        type: String,
        trim: true,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    highlights: {
        type: [String],
        default: []
    },
    prerequisites: {
        type: [String],
        default: []
    },
    totalDurationSeconds: {
        type: Number,
        default: 0,
        min: 0
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    isOpenToAll: {
        type: Boolean,
        default: false
    },
    showIde: {
        type: Boolean,
        default: false
    },
    allowedUserPhones: {
        type: [String],
        default: [],
        set: (phones) => [...new Set((phones || [])
            .map((phone) => String(phone || '').trim())
            .filter(Boolean))]
    },
    accessGrants: {
        type: [accessGrantSchema],
        default: []
    }
}, {
    timestamps: true
});

courseSchema.index({ isPublished: 1, isOpenToAll: 1, allowedUserPhones: 1, createdAt: -1 });
courseSchema.index({ 'accessGrants.phone': 1 });

module.exports = mongoose.model('Course', courseSchema);
