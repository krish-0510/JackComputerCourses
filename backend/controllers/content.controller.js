const mongoose = require('mongoose');
const Content = require('../models/content.model');

// Content is written once and read by three people: a visitor deciding whether to
// join, a faculty being asked what the institute teaches, and the admin who wrote it.
// None of them is owed a different set of fields, so all three read this one shape.
const CATALOGUE_SORT = { isHighlighted: -1, showcasedAt: -1 };
const LIBRARY_SORT = { isHighlighted: -1, createdAt: -1 };

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

// A missing name or a price that is not a price is the sender's to correct, so the
// field's own rule is quoted back instead of a server fault. The schema stays the
// single authority on what content may hold, which is also why nothing is checked
// twice on the way in.
const sendWriteError = (res, error, fallback) => {
    if (['ValidationError', 'CastError'].includes(error.name)) {
        return sendError(
            res,
            400,
            Object.values(error.errors || {})[0]?.message || 'Check the details and try again'
        );
    }

    return sendError(res, 500, error.message || fallback);
};

// An empty box means "not answered" rather than "free", so it is handed to the schema
// as nothing at all and comes back as the required-field message.
const readPrice = (value) => {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const price = Number(value);

    return Number.isFinite(price) ? price : null;
};

// Writing content and editing it take the same values, and neither may reach past
// them: whether the site carries this is never part of the form that describes it.
const readContentInput = (body = {}) => ({
    name: String(body?.name ?? '').trim(),
    description: String(body?.description ?? '').trim(),
    price: readPrice(body?.price),
    duration: String(body?.duration ?? '').trim(),
    code: String(body?.code ?? '').trim(),
    category: String(body?.category ?? '').trim(),
    level: String(body?.level ?? '').trim(),
    type: String(body?.type ?? '').trim(),
    taughtBy: String(body?.taughtBy ?? '').trim(),
    topics: body?.topics,
    prerequisites: body?.prerequisites,
    isHighlighted: Boolean(body?.isHighlighted)
});

const formatContentData = (content) => ({
    _id: content._id.toString(),
    name: content.name,
    description: content.description,
    price: content.price,
    duration: content.duration,
    code: content.code,
    category: content.category,
    level: content.level,
    type: content.type,
    taughtBy: content.taughtBy,
    topics: content.topics,
    prerequisites: content.prerequisites,
    isHighlighted: content.isHighlighted,
    // Showcasing is held as the moment it was picked, so both sides of it are read
    // off that one date.
    showcased: Boolean(content.showcasedAt),
    showcasedAt: content.showcasedAt,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt
});

// An id that could never name a document is answered the same way as one that names
// nothing: either way there is no such content, and every write below says so once.
const findContentById = async (contentId) => (
    isValidObjectId(contentId) ? Content.findById(contentId) : null
);

// Public Controllers

// The whole of the public catalogue: what the admin picked, highlighted first and
// then newest pick. Nothing unpicked ever leaves the building.
const getShowcasedContents = async (req, res) => {
    try {
        const contents = await Content
            .find({ showcasedAt: { $ne: null } })
            .sort(CATALOGUE_SORT);

        return res.status(200).json({
            success: true,
            message: 'Content retrieved successfully',
            data: { contents: contents.map(formatContentData) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving content');
    }
};

// Staff Controllers

// Everything the institute offers, showcased or not. The faculty are asked what is
// taught here more often than the admin is, so they read the same library — they
// simply have nothing to change about it.
const getAllContents = async (req, res) => {
    try {
        const contents = await Content.find().sort(LIBRARY_SORT);

        return res.status(200).json({
            success: true,
            message: 'Content retrieved successfully',
            data: { contents: contents.map(formatContentData) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving content');
    }
};

// Admin Controllers

const createContentByAdmin = async (req, res) => {
    try {
        const content = await Content.create(readContentInput(req.body));

        return res.status(201).json({
            success: true,
            message: 'Content created successfully',
            data: { content: formatContentData(content) }
        });
    } catch (error) {
        return sendWriteError(res, error, 'Something went wrong while saving the content');
    }
};

const updateContentByAdmin = async (req, res) => {
    try {
        const content = await findContentById(req.params.contentId);

        if (!content) {
            return sendError(res, 404, 'Content not found');
        }

        content.set(readContentInput(req.body));
        await content.save();

        return res.status(200).json({
            success: true,
            message: 'Content updated successfully',
            data: { content: formatContentData(content) }
        });
    } catch (error) {
        return sendWriteError(res, error, 'Something went wrong while updating the content');
    }
};

// Deleting takes it off the public site along with it, because the site reads this
// same collection rather than a copy of it.
const deleteContentByAdmin = async (req, res) => {
    try {
        const content = await findContentById(req.params.contentId);

        if (!content) {
            return sendError(res, 404, 'Content not found');
        }

        await content.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'Content deleted successfully',
            data: { contentId: content._id.toString() }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while deleting the content');
    }
};

// Showing and taking down are one decision with two answers, so both are this one
// write. Showcasing something already showcased moves it back to the front of the
// catalogue, which is the only thing the admin can have meant by picking it again.
const setContentShowcaseByAdmin = async (req, res) => {
    try {
        const { showcased } = req.body || {};

        if (typeof showcased !== 'boolean') {
            return sendError(res, 400, 'Say whether the content should be showcased');
        }

        const content = await findContentById(req.params.contentId);

        if (!content) {
            return sendError(res, 404, 'Content not found');
        }

        content.showcasedAt = showcased ? new Date() : null;
        await content.save();

        return res.status(200).json({
            success: true,
            message: showcased
                ? 'Content added to the website'
                : 'Content removed from the website',
            data: { content: formatContentData(content) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while updating the showcase');
    }
};

module.exports = {
    getShowcasedContents,
    getAllContents,
    createContentByAdmin,
    updateContentByAdmin,
    deleteContentByAdmin,
    setContentShowcaseByAdmin,
    formatContentData,
    readContentInput
};
