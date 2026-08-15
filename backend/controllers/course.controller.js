const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Course = require('../models/course.model');
const Chapter = require('../models/chapter.model');
const CourseProgress = require('../models/courseProgress.model');
const Note = require('../models/note.model');
const User = require('../models/user.model');

const YOUTUBE_PLAYLIST_ITEMS_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const YOUTUBE_PAGE_SIZE = 50;
const LOCAL_CLIENT_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175'
];
const DAYS_PER_COURSE_MONTH = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const hasField = (body, field) => Object.prototype.hasOwnProperty.call(body || {}, field);

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

const escapeHtmlAttribute = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const getClientOrigin = (value) => {
    try {
        return new URL(value).origin;
    } catch (error) {
        return '';
    }
};

const getAllowedClientOrigins = () => {
    const configuredClientOrigin = getClientOrigin(process.env.CLIENT_URL || '');

    return [...new Set([
        configuredClientOrigin,
        ...LOCAL_CLIENT_ORIGINS
    ].filter(Boolean))];
};

const getFrameAncestors = () => getAllowedClientOrigins().join(' ');

const toScriptJson = (value) => JSON.stringify(value === undefined ? null : value)
    .replace(/</g, '\\u003C')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const slugify = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeStringArray = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || '').trim())
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const normalizePhone = (value) => String(value || '').trim();

const normalizePhoneArray = (value) => {
    const source = Array.isArray(value)
        ? value
        : typeof value === 'string'
            ? value.split(',')
            : value === undefined || value === null
                ? []
                : [value];

    return [...new Set(source
        .map(normalizePhone)
        .filter(Boolean))];
};

const normalizeBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value.trim().toLowerCase() === 'true';
    }

    return Boolean(value);
};

const parseNonNegativeNumber = (value) => {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
        return null;
    }

    return numberValue;
};

const parsePositiveNumber = (value) => {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
        return null;
    }

    return numberValue;
};

const parseNonNegativeInteger = (value) => {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 0) {
        return null;
    }

    return numberValue;
};

const parsePlaylistId = (playlistUrl) => {
    const value = String(playlistUrl || '').trim();

    if (!value) {
        return null;
    }

    const listMatch = value.match(/[?&]list=([^&#]+)/);

    if (listMatch?.[1]) {
        return decodeURIComponent(listMatch[1]).trim() || null;
    }

    const looksLikeRawPlaylistId = /^[a-zA-Z0-9_-]{10,}$/.test(value)
        && !/[/:?&=#]/.test(value);

    if (looksLikeRawPlaylistId) {
        return value;
    }

    try {
        const parsedUrl = new URL(value.includes('://') ? value : `https://${value}`);
        const playlistId = parsedUrl.searchParams.get('list');

        if (playlistId) {
            return playlistId.trim();
        }
    } catch (error) {
        return null;
    }

    return null;
};

const getBestThumbnailUrl = (thumbnails = {}) => {
    const thumbnail = thumbnails.maxres
        || thumbnails.standard
        || thumbnails.high
        || thumbnails.medium
        || thumbnails.default;

    return thumbnail?.url || '';
};

const getYoutubeApiErrorMessage = (error) => (
    error.response?.data?.error?.message
    || error.message
    || 'Unable to fetch YouTube playlist videos'
);

const createYoutubeError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const fetchPlaylistItems = async (playlistId, apiKey) => {
    const playlistItems = [];
    let pageToken = '';

    do {
        const response = await axios.get(YOUTUBE_PLAYLIST_ITEMS_URL, {
            params: {
                part: 'snippet',
                playlistId,
                maxResults: YOUTUBE_PAGE_SIZE,
                pageToken,
                key: apiKey
            }
        });

        playlistItems.push(...(response.data?.items || []));
        pageToken = response.data?.nextPageToken || '';
    } while (pageToken);

    return playlistItems;
};

const fetchVideoDetails = async (videoIds, apiKey) => {
    const videoDetails = new Map();

    for (let index = 0; index < videoIds.length; index += YOUTUBE_PAGE_SIZE) {
        const batchVideoIds = videoIds.slice(index, index + YOUTUBE_PAGE_SIZE);

        if (!batchVideoIds.length) {
            continue;
        }

        const response = await axios.get(YOUTUBE_VIDEOS_URL, {
            params: {
                part: 'snippet,contentDetails,status',
                id: batchVideoIds.join(','),
                key: apiKey
            }
        });

        (response.data?.items || []).forEach((video) => {
            if (video.id) {
                videoDetails.set(video.id, video);
            }
        });
    }

    return videoDetails;
};

const buildVideoSnapshots = async (playlistId) => {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        throw createYoutubeError(500, 'YouTube API key is not configured');
    }

    try {
        const playlistItems = await fetchPlaylistItems(playlistId, apiKey);
        const playlistVideos = playlistItems
            .map((item) => {
                const snippet = item.snippet || {};
                const youtubeVideoId = snippet.resourceId?.videoId;

                if (!youtubeVideoId) {
                    return null;
                }

                return {
                    youtubeVideoId,
                    playlistTitle: snippet.title || 'Untitled video',
                    playlistThumbnailUrl: getBestThumbnailUrl(snippet.thumbnails),
                    playlistPublishedAt: snippet.publishedAt || null,
                    position: Number.isInteger(snippet.position) ? snippet.position : 0
                };
            })
            .filter(Boolean);

        const videoIds = [...new Set(playlistVideos.map((video) => video.youtubeVideoId))];
        const videoDetails = await fetchVideoDetails(videoIds, apiKey);
        const fetchedAt = new Date();

        return playlistVideos.map((playlistVideo) => {
            const details = videoDetails.get(playlistVideo.youtubeVideoId);
            const snippet = details?.snippet || {};
            const contentDetails = details?.contentDetails || {};

            return {
                youtubeVideoId: playlistVideo.youtubeVideoId,
                title: snippet.title || playlistVideo.playlistTitle,
                thumbnailUrl: getBestThumbnailUrl(snippet.thumbnails) || playlistVideo.playlistThumbnailUrl,
                position: playlistVideo.position,
                duration: contentDetails.duration || '',
                publishedAt: snippet.publishedAt || playlistVideo.playlistPublishedAt || null,
                watchUrl: `https://www.youtube.com/watch?v=${playlistVideo.youtubeVideoId}`,
                embedUrl: `https://www.youtube.com/embed/${playlistVideo.youtubeVideoId}`,
                fetchedAt
            };
        });
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createYoutubeError(502, getYoutubeApiErrorMessage(error));
    }
};

// YouTube reports a video length as an ISO 8601 duration ("PT1H2M3S"). Courses are read
// far more often than their playlists are synced, so every length is parsed once at sync
// time and only the resolved seconds are stored.
const ISO_DURATION_PATTERN = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

const parseIsoDurationSeconds = (value) => {
    const match = ISO_DURATION_PATTERN.exec(String(value || '').trim());

    if (!match) {
        return 0;
    }

    const [, weeks, days, hours, minutes, seconds] = match;

    return Math.round(
        ((Number(weeks) || 0) * 604800)
        + ((Number(days) || 0) * 86400)
        + ((Number(hours) || 0) * 3600)
        + ((Number(minutes) || 0) * 60)
        + (Number(seconds) || 0)
    );
};

const sumVideoDurationSeconds = (videos) => (videos || []).reduce(
    (total, video) => total + parseIsoDurationSeconds(video?.duration),
    0
);

// The stored total is rebuilt from the chapters rather than nudged by a delta, so a
// failed write can never leave a course carrying a length it does not have.
const recalculateCourseDuration = async (courseId) => {
    const [totals] = await Chapter.aggregate([
        { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
        { $group: { _id: null, totalDurationSeconds: { $sum: '$durationSeconds' } } }
    ]);

    const totalDurationSeconds = totals?.totalDurationSeconds || 0;

    await Course.updateOne({ _id: courseId }, { $set: { totalDurationSeconds } });

    return totalDurationSeconds;
};

// Chapters synced before lengths were stored already hold every video's ISO duration, so
// the existing catalogue is resolved from what is on disk instead of re-hitting YouTube.
// The two passes are guarded separately and in dependency order: a boot that dies between
// them still leaves the second one owed, and once both are done each guard matches nothing
// and later boots cost two empty reads.
const backfillChapterDurations = async () => {
    const chapters = await Chapter.find({ durationSeconds: { $exists: false } })
        .select('videos.duration')
        .lean();

    if (!chapters.length) {
        return 0;
    }

    await Chapter.bulkWrite(chapters.map((chapter) => ({
        updateOne: {
            filter: { _id: chapter._id },
            update: { $set: { durationSeconds: sumVideoDurationSeconds(chapter.videos) } }
        }
    })));

    return chapters.length;
};

const backfillCourseTotalDurations = async () => {
    const courses = await Course.find({ totalDurationSeconds: { $exists: false } })
        .select('_id')
        .lean();

    if (!courses.length) {
        return 0;
    }

    const courseIds = courses.map((course) => course._id);
    const courseTotals = new Map((await Chapter.aggregate([
        { $match: { courseId: { $in: courseIds } } },
        { $group: { _id: '$courseId', totalDurationSeconds: { $sum: '$durationSeconds' } } }
    ])).map((total) => [total._id.toString(), total.totalDurationSeconds]));

    // Courses with no chapters are written too, so a course is never left without the
    // field and reconsidered on every boot from here on.
    await Course.bulkWrite(courseIds.map((courseId) => ({
        updateOne: {
            filter: { _id: courseId },
            update: {
                $set: { totalDurationSeconds: courseTotals.get(courseId.toString()) || 0 }
            }
        }
    })));

    return courses.length;
};

const backfillCourseDurations = async () => {
    const chapterCount = await backfillChapterDurations();
    const courseCount = await backfillCourseTotalDurations();

    return { chapterCount, courseCount };
};

const parseCourseDurationMonths = (value) => {
    const rawValue = String(value ?? '').trim();

    if (!rawValue) {
        return null;
    }

    return parsePositiveNumber(rawValue);
};

const formatDurationMonths = (value) => {
    const durationMonths = parseCourseDurationMonths(value);

    return durationMonths === null ? '' : String(durationMonths);
};

const getCourseDurationMonths = (course) => parseCourseDurationMonths(course?.duration);

const getCourseDurationDays = (durationMonths) => {
    const parsedDurationMonths = parseCourseDurationMonths(durationMonths);

    return parsedDurationMonths === null
        ? null
        : Math.ceil(parsedDurationMonths * DAYS_PER_COURSE_MONTH);
};

const getCourseDurationValidationMessage = (duration, isOpenToAll) => {
    if (isOpenToAll) {
        return '';
    }

    return parseCourseDurationMonths(duration) === null
        ? 'Duration must be a positive number of months'
        : '';
};

const parseDateValue = (value) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
};

const getUtcStartOfDay = (value) => {
    const date = parseDateValue(value);

    if (!date) {
        return null;
    }

    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
    ));
};

const addDays = (date, days) => new Date(date.getTime() + (days * MILLISECONDS_PER_DAY));

// The one place a grant turns into a deadline, so the window shown on a course and
// the enrolment counted on an account can never name a different day. An expiry set by
// hand on the grant is that deadline outright: it replaces the course duration rather
// than being weighed against it, which is what makes a single user's window able to
// outlast or fall short of everyone else's on the same course.
const getGrantEndsAt = (course, grant) => {
    if (grant?.expiresAt) {
        return grant.expiresAt;
    }

    const startsAt = getUtcStartOfDay(grant?.grantedAt);
    const durationDays = getCourseDurationDays(getCourseDurationMonths(course));

    return startsAt && durationDays ? addDays(startsAt, durationDays) : null;
};

// A grant runs up to endsAt, so the days left on it are counted from the start of today:
// a window ending tomorrow still has today to be used and reads as one day, and one
// ending today has already run out. Counting whole UTC days is what lets this answer the
// same number all day instead of sliding with the clock. A hand-set expiry can land part
// way through a day, and that part still belongs to the person holding it, so it is
// rounded up — a deadline that falls on midnight is a whole number either way.
const getAccessDaysRemaining = (endsAt, now) => {
    const startOfToday = getUtcStartOfDay(now);

    if (!endsAt || !startOfToday) {
        return null;
    }

    return Math.max(0, Math.ceil((endsAt.getTime() - startOfToday.getTime()) / MILLISECONDS_PER_DAY));
};

const formatDateOnly = (value) => {
    const date = parseDateValue(value);

    return date ? date.toISOString().slice(0, 10) : '';
};

const getFallbackGrantedAt = (course) => (
    parseDateValue(course?.createdAt)
    || parseDateValue(course?.updatedAt)
    || new Date()
);

const getCourseAccessGrants = (course) => {
    const grantMap = new Map();
    const fallbackGrantedAt = getFallbackGrantedAt(course);

    (course?.accessGrants || []).forEach((grant) => {
        const phone = normalizePhone(grant?.phone);

        if (!phone || grantMap.has(phone)) {
            return;
        }

        grantMap.set(phone, {
            phone,
            grantedAt: parseDateValue(grant?.grantedAt) || fallbackGrantedAt,
            // Guarded rather than parsed straight, because an unset expiry reads as
            // null and a bare Date(null) is the epoch, not an absent value.
            expiresAt: grant?.expiresAt ? parseDateValue(grant.expiresAt) : null
        });
    });

    (course?.allowedUserPhones || []).forEach((phoneValue) => {
        const phone = normalizePhone(phoneValue);

        if (!phone || grantMap.has(phone)) {
            return;
        }

        grantMap.set(phone, {
            phone,
            grantedAt: fallbackGrantedAt,
            expiresAt: null
        });
    });

    return [...grantMap.values()];
};

const buildCourseAccessGrants = (course, phones, options = {}) => {
    const normalizedPhones = normalizePhoneArray(phones);
    const grantedAt = parseDateValue(options.grantedAt) || new Date();
    const resetPhones = new Set(normalizePhoneArray(options.resetPhones));
    const existingGrantMap = new Map(getCourseAccessGrants(course)
        .map((grant) => [grant.phone, grant]));

    return normalizedPhones.map((phone) => {
        const existingGrant = existingGrantMap.get(phone);
        const shouldResetGrantDate = options.resetAll
            || resetPhones.has(phone)
            || !existingGrant;

        return {
            phone,
            grantedAt: shouldResetGrantDate ? grantedAt : existingGrant.grantedAt,
            // Restarting someone's clock starts it clean: a hand-set expiry overrode the
            // window that was running, and keeping it would let a date already gone by
            // shut out the very grant that was just renewed.
            expiresAt: shouldResetGrantDate ? null : existingGrant.expiresAt
        };
    });
};

// The two access fields are written as a pair and never apart, so the list a query
// matches on and the grants the dates are read off cannot drift out of step.
const writeCourseAccessGrants = (course, grants) => {
    course.accessGrants = grants;
    course.allowedUserPhones = grants.map((grant) => grant.phone);
};

const setCourseAccessPhones = (course, phones, options = {}) => {
    // Built before anything is written, so a phone that is new to the course is read as
    // new and starts today rather than inheriting the date the course was created.
    writeCourseAccessGrants(course, buildCourseAccessGrants(course, phones, options));
};

// A grant given a deadline of its own; passing null puts that person back on the
// course's clock. Returns the named phones that hold no grant to give access to.
const setCourseAccessExpiry = (course, phones, expiresAt) => {
    const targetPhones = new Set(normalizePhoneArray(phones));
    const grants = getCourseAccessGrants(course);

    writeCourseAccessGrants(course, grants.map((grant) => (
        targetPhones.has(grant.phone) ? { ...grant, expiresAt } : grant
    )));

    const grantedPhones = new Set(grants.map((grant) => grant.phone));

    return [...targetPhones].filter((phone) => !grantedPhones.has(phone));
};

const addCourseAccessPhones = (course, phones) => {
    const phonesToGrant = normalizePhoneArray(phones);
    const currentPhones = getCourseAccessGrants(course).map((grant) => grant.phone);

    setCourseAccessPhones(
        course,
        [...currentPhones, ...phonesToGrant],
        {
            grantedAt: new Date(),
            resetPhones: phonesToGrant
        }
    );
};

const removeCourseAccessPhones = (course, phones) => {
    const phonesToRemove = new Set(normalizePhoneArray(phones));
    const nextPhones = getCourseAccessGrants(course)
        .map((grant) => grant.phone)
        .filter((phone) => !phonesToRemove.has(phone));

    setCourseAccessPhones(course, nextPhones);
};

const getCourseAccessGrant = (course, userPhone) => {
    const normalizedUserPhone = normalizePhone(userPhone);

    if (!normalizedUserPhone) {
        return null;
    }

    return getCourseAccessGrants(course)
        .find((grant) => grant.phone === normalizedUserPhone) || null;
};

const getCourseAccessWindow = (course, userPhone, now = new Date()) => {
    const normalizedUserPhone = normalizePhone(userPhone);

    if (!normalizedUserPhone) {
        return null;
    }

    if (course?.isOpenToAll) {
        return {
            type: 'open',
            startsAt: null,
            startsOn: '',
            endsAt: null,
            endsOn: '',
            durationMonths: null,
            durationDays: null,
            daysRemaining: null,
            isExpired: false
        };
    }

    const accessGrant = getCourseAccessGrant(course, normalizedUserPhone);

    if (!accessGrant) {
        return null;
    }

    const endsAt = getGrantEndsAt(course, accessGrant);

    if (!endsAt) {
        return null;
    }

    // A hand-set expiry answers the deadline on its own, so the course duration is not
    // reported alongside it — it is no longer what this window is made of, and a course
    // that never had one can still close on the date it was given.
    const isCustomExpiry = Boolean(accessGrant.expiresAt);
    const durationMonths = isCustomExpiry ? null : getCourseDurationMonths(course);
    const startsAt = getUtcStartOfDay(accessGrant.grantedAt);
    const currentTime = parseDateValue(now) || new Date();

    return {
        type: isCustomExpiry ? 'custom' : 'assigned',
        startsAt,
        startsOn: formatDateOnly(startsAt),
        endsAt,
        endsOn: formatDateOnly(endsAt),
        durationMonths,
        durationDays: isCustomExpiry ? null : getCourseDurationDays(durationMonths),
        daysRemaining: getAccessDaysRemaining(endsAt, currentTime),
        isExpired: currentTime.getTime() >= endsAt.getTime()
    };
};

// Who still counts as enrolled, read off the courses that hand enrolments out. An
// open-to-all course is the public catalogue rather than an enrolment, so it never
// keeps an account active, and neither does a grant whose days have run out.
const collectActiveUserPhones = (courses, now = new Date()) => {
    const currentTime = parseDateValue(now) || new Date();
    const activePhones = new Set();

    (courses || []).forEach((course) => {
        if (course?.isOpenToAll) {
            return;
        }

        getCourseAccessGrants(course).forEach((grant) => {
            const endsAt = getGrantEndsAt(course, grant);

            if (endsAt && currentTime.getTime() < endsAt.getTime()) {
                activePhones.add(grant.phone);
            }
        });
    });

    return activePhones;
};

const ACTIVE_PHONE_COURSE_FIELDS = 'duration isOpenToAll allowedUserPhones accessGrants createdAt updatedAt';

// A roster of any size is answered by one pass over the courses, so the users list
// and the attendance roster each cost a single extra read however many accounts
// they show. Naming phones narrows that read to the accounts actually being asked
// about, which is what the single-account callers do.
const getActiveUserPhones = async (phones = null, now = new Date()) => {
    const normalizedPhones = phones === null ? null : normalizePhoneArray(phones);

    if (normalizedPhones && !normalizedPhones.length) {
        return new Set();
    }

    const query = { isOpenToAll: { $ne: true } };

    if (normalizedPhones) {
        query.$or = [
            { allowedUserPhones: { $in: normalizedPhones } },
            { 'accessGrants.phone': { $in: normalizedPhones } }
        ];
    }

    const courses = await Course.find(query).select(ACTIVE_PHONE_COURSE_FIELDS).lean();

    return collectActiveUserPhones(courses, now);
};

const isUserPhoneActive = async (phone, now = new Date()) => (
    (await getActiveUserPhones([phone], now)).has(normalizePhone(phone))
);

const formatAccessWindowData = (accessWindow) => ({
    accessType: accessWindow?.type || '',
    accessStartsAt: accessWindow?.startsAt || null,
    accessStartsOn: accessWindow?.startsOn || '',
    accessEndsAt: accessWindow?.endsAt || null,
    accessEndsOn: accessWindow?.endsOn || '',
    accessDurationMonths: accessWindow?.durationMonths || null,
    accessDurationDays: accessWindow?.durationDays || null,
    accessDaysRemaining: accessWindow?.daysRemaining ?? null,
    isAccessExpired: Boolean(accessWindow?.isExpired)
});

const formatCourseAccessGrant = (course, grant, now = new Date()) => ({
    phone: grant.phone,
    grantedAt: grant.grantedAt,
    grantedOn: formatDateOnly(grant.grantedAt),
    ...formatAccessWindowData(getCourseAccessWindow(course, grant.phone, now))
});

const formatCourseAccessResponse = (course) => {
    const accessGrants = getCourseAccessGrants(course);

    return {
        allowedUserPhones: accessGrants.map((grant) => grant.phone),
        accessGrants: accessGrants.map((grant) => formatCourseAccessGrant(course, grant)),
        course: formatCourseData(course, {}, { includeAccessList: true })
    };
};

const formatCourseData = (course, counts = {}, options = {}) => {
    const accessGrants = getCourseAccessGrants(course);
    const durationMonths = getCourseDurationMonths(course);
    const durationDays = getCourseDurationDays(durationMonths);
    const courseData = {
        _id: course._id.toString(),
        title: course.title,
        slug: course.slug,
        duration: course.duration || '',
        durationMonths,
        durationDays,
        totalDurationSeconds: course.totalDurationSeconds || 0,
        price: course.price,
        description: course.description,
        shortDescription: course.shortDescription,
        thumbnailUrl: course.thumbnailUrl,
        category: course.category,
        level: course.level,
        language: course.language,
        tags: course.tags || [],
        highlights: course.highlights || [],
        prerequisites: course.prerequisites || [],
        isPublished: course.isPublished,
        isOpenToAll: Boolean(course.isOpenToAll),
        showIde: Boolean(course.showIde),
        chapterCount: counts.chapterCount || 0,
        videoCount: counts.videoCount || 0,
        accessUserCount: accessGrants.length,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
    };

    if (options.includeAccessList) {
        courseData.allowedUserPhones = accessGrants.map((grant) => grant.phone);
        courseData.accessGrants = accessGrants.map((grant) => (
            formatCourseAccessGrant(course, grant, options.now)
        ));
    }

    if (options.includeUserAccess) {
        Object.assign(
            courseData,
            formatAccessWindowData(getCourseAccessWindow(course, options.userPhone, options.now))
        );
    }

    return courseData;
};

const formatChapterData = (chapter) => ({
    _id: chapter._id.toString(),
    courseId: chapter.courseId.toString(),
    name: chapter.name,
    playlistUrl: chapter.playlistUrl,
    playlistId: chapter.playlistId,
    order: chapter.order,
    videoCount: chapter.videoCount,
    durationSeconds: chapter.durationSeconds || 0,
    lastSyncedAt: chapter.lastSyncedAt,
    syncStatus: chapter.syncStatus,
    syncError: chapter.syncError,
    videos: chapter.videos || [],
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt
});

const getUserVideoKey = (chapter, video) => `${chapter._id.toString()}:${video.position}`;

const parseVideoKey = (videoKey) => {
    const [chapterId, positionText] = String(videoKey || '').split(':');

    if (!isValidObjectId(chapterId) || !/^\d+$/.test(positionText || '')) {
        return null;
    }

    return {
        chapterId,
        videoPosition: Number(positionText)
    };
};

const findChapterVideo = (chapters, chapterId, videoPosition) => {
    const chapter = chapters.find((item) => item._id.toString() === String(chapterId));
    const video = (chapter?.videos || []).find((item) => Number(item.position) === videoPosition);

    return video ? { chapter, video } : null;
};

// Resolves a stored resume point against the course as it exists now, so a
// re-synced or deleted lesson quietly falls back to the start of the course.
const getLastWatchedVideoKey = async ({ viewerRole, viewerId, courseId, chapters }) => {
    const progress = await CourseProgress.findOne({ viewerRole, viewerId, courseId });

    if (!progress) {
        return '';
    }

    const match = findChapterVideo(chapters, progress.chapterId, progress.videoPosition);

    return match ? getUserVideoKey(match.chapter, match.video) : '';
};

const saveLastWatchedVideo = async (res, { viewerRole, viewerId, course, videoKey }) => {
    const parsedVideoKey = parseVideoKey(videoKey);

    if (!parsedVideoKey) {
        return sendError(res, 400, 'Invalid video key');
    }

    const chapters = await Chapter.find({ courseId: course._id });
    const match = findChapterVideo(chapters, parsedVideoKey.chapterId, parsedVideoKey.videoPosition);

    if (!match) {
        return sendError(res, 404, 'Video not found');
    }

    await CourseProgress.findOneAndUpdate(
        { viewerRole, viewerId, courseId: course._id },
        {
            $set: {
                chapterId: match.chapter._id,
                videoPosition: match.video.position,
                lastWatchedAt: new Date()
            }
        },
        { upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
        success: true,
        message: 'Last watched video saved successfully',
        data: {
            lastWatchedVideoKey: getUserVideoKey(match.chapter, match.video)
        }
    });
};

const formatUserVideoData = (chapter, video) => ({
    id: getUserVideoKey(chapter, video),
    title: video.title,
    position: video.position,
    duration: video.duration,
    playerPath: `/user/courses/${chapter.courseId.toString()}/chapters/${chapter._id.toString()}/videos/${video.position}/embed`
});

const formatUserChapterData = (chapter) => ({
    _id: chapter._id.toString(),
    name: chapter.name,
    order: chapter.order,
    videoCount: chapter.videoCount,
    durationSeconds: chapter.durationSeconds || 0,
    videos: (chapter.videos || []).map((video) => formatUserVideoData(chapter, video))
});

const formatFacultyVideoData = (chapter, video) => ({
    id: getUserVideoKey(chapter, video),
    title: video.title,
    position: video.position,
    duration: video.duration,
    thumbnailUrl: video.thumbnailUrl,
    watchUrl: video.watchUrl,
    playerPath: `/faculty/courses/${chapter.courseId.toString()}/chapters/${chapter._id.toString()}/videos/${video.position}/embed`
});

const formatFacultyChapterData = (chapter) => ({
    _id: chapter._id.toString(),
    name: chapter.name,
    order: chapter.order,
    videoCount: chapter.videoCount,
    durationSeconds: chapter.durationSeconds || 0,
    videos: (chapter.videos || []).map((video) => formatFacultyVideoData(chapter, video))
});

const YOUTUBE_PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';
const VIDEO_EVENT_SOURCE = 'jack-course-player';

const buildUserVideoEmbedUrl = (youtubeVideoId, shouldAutoplay = false) => {
    const params = new URLSearchParams({
        controls: '1',
        rel: '0',
        modestbranding: '1',
        iv_load_policy: '3',
        playsinline: '1',
        disablekb: '0',
        fs: '1',
        enablejsapi: '1',
        autoplay: shouldAutoplay ? '1' : '0'
    });

    return `${YOUTUBE_PLAYER_ORIGIN}/embed/${encodeURIComponent(youtubeVideoId)}?${params.toString()}`;
};

const buildUserVideoEmbedHtml = ({ embedUrl, title, videoKey, parentOrigins, nonce }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtmlAttribute(title || 'Course video')}</title>
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #020617;
      }

      iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
      }
    </style>
  </head>
  <body>
    <iframe
      id="course-video-frame"
      src="${escapeHtmlAttribute(embedUrl)}"
      title="${escapeHtmlAttribute(title || 'Course video')}"
      loading="eager"
      allow="accelerometer; autoplay; encrypted-media; fullscreen; gyroscope; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation"
      allowfullscreen
    ></iframe>
    <script nonce="${escapeHtmlAttribute(nonce)}">
      (function () {
        var PLAYER_ORIGIN = ${toScriptJson(YOUTUBE_PLAYER_ORIGIN)};
        var EVENT_SOURCE = ${toScriptJson(VIDEO_EVENT_SOURCE)};
        var ENDED_STATE = 0;
        var HANDSHAKE_INTERVAL_MS = 400;
        var HANDSHAKE_TIMEOUT_MS = 20000;

        var parentOrigins = ${toScriptJson(parentOrigins || [])};
        var videoKey = ${toScriptJson(videoKey || '')};
        var frame = document.getElementById('course-video-frame');
        var lastPlayerState = null;
        var handshakeTimer = null;

        if (!frame) {
          return;
        }

        var stopHandshake = function () {
          if (handshakeTimer === null) {
            return;
          }

          window.clearInterval(handshakeTimer);
          handshakeTimer = null;
        };

        var sendToPlayer = function (message) {
          if (!frame.contentWindow) {
            return;
          }

          try {
            frame.contentWindow.postMessage(JSON.stringify(message), PLAYER_ORIGIN);
          } catch (error) {
            stopHandshake();
          }
        };

        var subscribeToPlayer = function () {
          sendToPlayer({ event: 'listening', id: 'course-video', channel: 'widget' });
          sendToPlayer({
            event: 'command',
            func: 'addEventListener',
            args: ['onStateChange'],
            id: 'course-video',
            channel: 'widget'
          });
        };

        var readPlayerState = function (data) {
          if (!data || typeof data !== 'object') {
            return null;
          }

          if (data.event === 'onStateChange' && typeof data.info === 'number') {
            return data.info;
          }

          if (data.event === 'infoDelivery' && data.info && typeof data.info.playerState === 'number') {
            return data.info.playerState;
          }

          return null;
        };

        var notifyVideoEnded = function () {
          if (window.parent === window) {
            return;
          }

          for (var index = 0; index < parentOrigins.length; index += 1) {
            window.parent.postMessage({
              source: EVENT_SOURCE,
              type: 'video-ended',
              videoKey: videoKey
            }, parentOrigins[index]);
          }
        };

        window.addEventListener('message', function (event) {
          if (event.origin !== PLAYER_ORIGIN || event.source !== frame.contentWindow) {
            return;
          }

          var data = null;

          try {
            data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          } catch (error) {
            return;
          }

          stopHandshake();

          var playerState = readPlayerState(data);

          if (playerState === null || playerState === lastPlayerState) {
            return;
          }

          lastPlayerState = playerState;

          if (playerState === ENDED_STATE) {
            notifyVideoEnded();
          }
        });

        subscribeToPlayer();
        handshakeTimer = window.setInterval(subscribeToPlayer, HANDSHAKE_INTERVAL_MS);
        window.setTimeout(stopHandshake, HANDSHAKE_TIMEOUT_MS);
      })();
    </script>
  </body>
</html>`;

const sendVideoEmbedResponse = (res, { youtubeVideoId, title, videoKey, shouldAutoplay }) => {
    const nonce = crypto.randomBytes(16).toString('base64');
    const frameAncestors = getFrameAncestors();

    return res
        .status(200)
        .set({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': [
                "default-src 'none'",
                "base-uri 'none'",
                "form-action 'none'",
                "style-src 'unsafe-inline'",
                `script-src 'nonce-${nonce}'`,
                `frame-src ${YOUTUBE_PLAYER_ORIGIN} https://www.youtube.com`,
                frameAncestors ? `frame-ancestors 'self' ${frameAncestors}` : "frame-ancestors 'self'"
            ].join('; ')
        })
        .send(buildUserVideoEmbedHtml({
            embedUrl: buildUserVideoEmbedUrl(youtubeVideoId, shouldAutoplay),
            title,
            videoKey,
            parentOrigins: getAllowedClientOrigins(),
            nonce
        }));
};

const getCourseCounts = async (courseIds) => {
    if (!courseIds.length) {
        return new Map();
    }

    const counts = await Chapter.aggregate([
        { $match: { courseId: { $in: courseIds } } },
        {
            $group: {
                _id: '$courseId',
                chapterCount: { $sum: 1 },
                videoCount: { $sum: '$videoCount' }
            }
        }
    ]);

    return new Map(counts.map((item) => [
        item._id.toString(),
        {
            chapterCount: item.chapterCount,
            videoCount: item.videoCount
        }
    ]));
};

const buildCoursePayload = (body, options = {}) => {
    const payload = {};
    const errors = [];
    const isCreate = options.isCreate;

    if (isCreate || hasField(body, 'title')) {
        const title = String(body.title || '').trim();

        if (!title) {
            errors.push('Title is required');
        } else {
            payload.title = title;
        }
    }

    if (isCreate || hasField(body, 'duration')) {
        const duration = String(body.duration ?? '').trim();

        if (!duration) {
            payload.duration = '';
        } else if (parseCourseDurationMonths(duration) === null) {
            errors.push('Duration must be a positive number of months');
        } else {
            payload.duration = formatDurationMonths(duration);
        }
    }

    if (isCreate || hasField(body, 'price')) {
        const price = parseNonNegativeNumber(body.price);

        if (price === null) {
            errors.push('Price must be a non-negative number');
        } else {
            payload.price = price;
        }
    }

    if (isCreate || hasField(body, 'description')) {
        const description = String(body.description || '').trim();

        if (!description) {
            errors.push('Description is required');
        } else {
            payload.description = description;
        }
    }

    if (hasField(body, 'slug')) {
        const slug = slugify(body.slug);

        if (!slug) {
            errors.push('Slug is required');
        } else {
            payload.slug = slug;
        }
    } else if (isCreate && payload.title) {
        payload.slug = slugify(payload.title);
    }

    ['shortDescription', 'thumbnailUrl', 'category', 'level', 'language'].forEach((field) => {
        if (hasField(body, field)) {
            payload[field] = String(body[field] || '').trim();
        }
    });

    ['tags', 'highlights', 'prerequisites'].forEach((field) => {
        if (hasField(body, field)) {
            payload[field] = normalizeStringArray(body[field]);
        }
    });

    if (hasField(body, 'allowedUserPhones')) {
        payload.allowedUserPhones = normalizePhoneArray(body.allowedUserPhones);
    }

    if (hasField(body, 'isPublished')) {
        payload.isPublished = normalizeBoolean(body.isPublished);
    }

    if (hasField(body, 'isOpenToAll')) {
        payload.isOpenToAll = normalizeBoolean(body.isOpenToAll);
    }

    if (hasField(body, 'showIde')) {
        payload.showIde = normalizeBoolean(body.showIde);
    }

    if (isCreate && !payload.slug) {
        errors.push('Slug is required');
    }

    return { payload, errors };
};

const ensureCourseSlugAvailable = async (slug, courseId = null) => {
    const query = { slug };

    if (courseId) {
        query._id = { $ne: courseId };
    }

    const existingCourse = await Course.findOne(query).select('_id');
    return !existingCourse;
};

const getMissingUserPhones = async (phones) => {
    const normalizedPhones = normalizePhoneArray(phones);

    if (!normalizedPhones.length) {
        return [];
    }

    const users = await User.find({ phone: { $in: normalizedPhones } }).select('phone');
    const existingPhones = new Set(users.map((user) => user.phone));

    return normalizedPhones.filter((phone) => !existingPhones.has(phone));
};

const sendMissingUserPhonesError = (res, missingPhones) => sendError(
    res,
    404,
    missingPhones.length === 1
        ? `User with phone ${missingPhones[0]} was not found`
        : `Users with these phones were not found: ${missingPhones.join(', ')}`
);

const getAccessPhonesFieldValue = (body = {}) => {
    if (hasField(body, 'phones')) {
        return body.phones;
    }

    if (hasField(body, 'allowedUserPhones')) {
        return body.allowedUserPhones;
    }

    if (hasField(body, 'phone')) {
        return body.phone;
    }

    return undefined;
};

// An empty expiry is the way custom expiry is taken off again rather than a bad
// request, so a cleared field and a missing one both mean "use the course duration".
const parseAccessExpiryValue = (value) => {
    if (value === undefined || value === null || value === '') {
        return { expiresAt: null };
    }

    const expiresAt = parseDateValue(value);

    return expiresAt
        ? { expiresAt }
        : { error: 'Custom expiry must be a valid date and time' };
};

const getUserCourseLookupQuery = (courseIdOrSlug) => {
    const value = String(courseIdOrSlug || '').trim();

    if (isValidObjectId(value)) {
        return { _id: value };
    }

    const slug = slugify(value);
    return slug ? { slug } : null;
};

const courseUserHasAccess = (course, userPhone, options = {}) => {
    const normalizedUserPhone = normalizePhone(userPhone);

    if (!normalizedUserPhone) {
        return false;
    }

    if (course?.isOpenToAll) {
        return true;
    }

    const accessWindow = getCourseAccessWindow(course, normalizedUserPhone, options.now);

    return Boolean(accessWindow && !accessWindow.isExpired);
};

const getNextChapterOrder = async (courseId) => {
    const lastChapter = await Chapter.findOne({ courseId }).sort({ order: -1 }).select('order');
    return lastChapter ? lastChapter.order + 1 : 0;
};

const applySyncedVideosToChapter = (chapter, videos) => {
    chapter.videos = videos;
    chapter.videoCount = videos.length;
    chapter.durationSeconds = sumVideoDurationSeconds(videos);
    chapter.lastSyncedAt = new Date();
    chapter.syncStatus = 'synced';
    chapter.syncError = '';
};

const getAllCoursesByAdmin = async (req, res) => {
    try {
        const courses = await Course.find({}).sort({ createdAt: -1 });
        const courseCounts = await getCourseCounts(courses.map((course) => course._id));

        return res.status(200).json({
            success: true,
            message: 'Courses fetched successfully',
            data: {
                courses: courses.map((course) => formatCourseData(
                    course,
                    courseCounts.get(course._id.toString()) || {},
                    { includeAccessList: true }
                ))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching courses');
    }
};

// Running enrolments first with the nearest deadline on top, so what the admin has to
// act on is what he reads first; the ended ones follow, most recently ended first. A
// deadline is a YYYY-MM-DD string, so the dates order as they read.
const compareEnrolments = (first, second) => {
    if (first.isEnrolmentRunning !== second.isEnrolmentRunning) {
        return first.isEnrolmentRunning ? -1 : 1;
    }

    return first.isEnrolmentRunning
        ? first.accessEndsOn.localeCompare(second.accessEndsOn)
        : second.accessEndsOn.localeCompare(first.accessEndsOn);
};

// What one account was actually enrolled in, which the admin users list opens beside
// it. Open-to-all courses are the public catalogue rather than an enrolment, so they
// are left out here for the same reason they never make an account active. Only a name
// and a deadline are read off this, so only what those need is fetched and sent.
const getUserCoursesByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return sendError(res, 400, 'Invalid user id');
        }

        const user = await User.findById(id).select('name phone');

        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        const courses = await Course.find({
            isOpenToAll: { $ne: true },
            $or: [
                { allowedUserPhones: user.phone },
                { 'accessGrants.phone': user.phone }
            ]
        }).select('title duration allowedUserPhones accessGrants createdAt updatedAt').lean();
        const now = new Date();
        const userCourses = courses
            .map((course) => {
                const accessWindow = getCourseAccessWindow(course, user.phone, now);

                return {
                    _id: course._id.toString(),
                    title: course.title,
                    accessEndsOn: accessWindow?.endsOn || '',
                    // Enough for the deadline to be read back the way it was set: a
                    // hand-set one carries a time of day that a date alone would drop.
                    accessType: accessWindow?.type || '',
                    accessEndsAt: accessWindow?.endsAt || null,
                    // A course whose duration was never set has no deadline to be
                    // inside of, so it reads as ended here exactly as it fails to
                    // make its account active.
                    isEnrolmentRunning: Boolean(accessWindow && !accessWindow.isExpired)
                };
            })
            .sort(compareEnrolments);

        return res.status(200).json({
            success: true,
            message: 'User courses fetched successfully',
            data: {
                courses: userCourses,
                runningCount: userCourses.filter((course) => course.isEnrolmentRunning).length
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching user courses');
    }
};

const createCourseByAdmin = async (req, res) => {
    try {
        const { payload, errors } = buildCoursePayload(req.body || {}, { isCreate: true });

        if (errors.length) {
            return sendError(res, 400, errors[0]);
        }

        const durationError = getCourseDurationValidationMessage(
            payload.duration,
            Boolean(payload.isOpenToAll)
        );

        if (durationError) {
            return sendError(res, 400, durationError);
        }

        const slugAvailable = await ensureCourseSlugAvailable(payload.slug);

        if (!slugAvailable) {
            return sendError(res, 409, 'Course with this slug already exists');
        }

        if (hasField(payload, 'allowedUserPhones')) {
            const missingPhones = await getMissingUserPhones(payload.allowedUserPhones);

            if (missingPhones.length) {
                return sendMissingUserPhonesError(res, missingPhones);
            }

            payload.accessGrants = buildCourseAccessGrants(
                {},
                payload.allowedUserPhones,
                { resetAll: true }
            );
        }

        const course = await Course.create(payload);

        return res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: { course: formatCourseData(course, {}, { includeAccessList: true }) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'Course with this slug already exists');
        }

        return sendError(res, 500, 'Something went wrong while creating course');
    }
};

const getCourseByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const chapters = await Chapter.find({ courseId }).sort({ order: 1, createdAt: 1 });
        const counts = {
            chapterCount: chapters.length,
            videoCount: chapters.reduce((total, chapter) => total + chapter.videoCount, 0)
        };

        return res.status(200).json({
            success: true,
            message: 'Course fetched successfully',
            data: {
                course: formatCourseData(course, counts, { includeAccessList: true }),
                chapters: chapters.map(formatChapterData)
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching course');
    }
};

const updateCourseByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const { payload, errors } = buildCoursePayload(req.body || {}, { isCreate: false });

        if (errors.length) {
            return sendError(res, 400, errors[0]);
        }

        if (!Object.keys(payload).length) {
            return sendError(res, 400, 'At least one course field is required');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        if (payload.slug) {
            const slugAvailable = await ensureCourseSlugAvailable(payload.slug, courseId);

            if (!slugAvailable) {
                return sendError(res, 409, 'Course with this slug already exists');
            }
        }

        if (hasField(payload, 'allowedUserPhones')) {
            const missingPhones = await getMissingUserPhones(payload.allowedUserPhones);

            if (missingPhones.length) {
                return sendMissingUserPhonesError(res, missingPhones);
            }
        }

        const nextIsOpenToAll = hasField(payload, 'isOpenToAll')
            ? payload.isOpenToAll
            : Boolean(course.isOpenToAll);
        const nextDuration = hasField(payload, 'duration') ? payload.duration : course.duration;
        const durationError = getCourseDurationValidationMessage(nextDuration, nextIsOpenToAll);

        if (durationError) {
            return sendError(res, 400, durationError);
        }

        if (hasField(payload, 'allowedUserPhones')) {
            setCourseAccessPhones(course, payload.allowedUserPhones);
            delete payload.allowedUserPhones;
        }

        Object.assign(course, payload);
        await course.save();

        return res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            data: { course: formatCourseData(course, {}, { includeAccessList: true }) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'Course with this slug already exists');
        }

        return sendError(res, 500, 'Something went wrong while updating course');
    }
};

const getCourseAccessByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Course access fetched successfully',
            data: formatCourseAccessResponse(course)
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching course access');
    }
};

const replaceCourseAccessByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const accessPhonesValue = getAccessPhonesFieldValue(req.body || {});

        if (accessPhonesValue === undefined) {
            return sendError(res, 400, 'Phone list is required');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const allowedUserPhones = normalizePhoneArray(accessPhonesValue);
        const missingPhones = await getMissingUserPhones(allowedUserPhones);

        if (missingPhones.length) {
            return sendMissingUserPhonesError(res, missingPhones);
        }

        setCourseAccessPhones(course, allowedUserPhones);
        await course.save();

        return res.status(200).json({
            success: true,
            message: 'Course access updated successfully',
            data: formatCourseAccessResponse(course)
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while updating course access');
    }
};

const addCourseAccessByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const phones = normalizePhoneArray(getAccessPhonesFieldValue(req.body || {}));

        if (!phones.length) {
            return sendError(res, 400, 'At least one phone is required');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const missingPhones = await getMissingUserPhones(phones);

        if (missingPhones.length) {
            return sendMissingUserPhonesError(res, missingPhones);
        }

        addCourseAccessPhones(course, phones);
        await course.save();

        return res.status(200).json({
            success: true,
            message: 'Course access added successfully',
            data: formatCourseAccessResponse(course)
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while adding course access');
    }
};

const removeCourseAccessByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const phones = normalizePhoneArray(getAccessPhonesFieldValue(req.body || {}));

        if (!phones.length) {
            return sendError(res, 400, 'At least one phone is required');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        removeCourseAccessPhones(course, phones);
        await course.save();

        return res.status(200).json({
            success: true,
            message: 'Course access removed successfully',
            data: formatCourseAccessResponse(course)
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while removing course access');
    }
};

// Optional per-user override of when a course closes. Only grants that already exist can
// carry one, so this never grants access as a side effect of dating it.
const setCourseAccessExpiryByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const body = req.body || {};
        const phones = normalizePhoneArray(getAccessPhonesFieldValue(body));

        if (!phones.length) {
            return sendError(res, 400, 'At least one phone is required');
        }

        const { expiresAt, error: expiryError } = parseAccessExpiryValue(body.expiresAt);

        if (expiryError) {
            return sendError(res, 400, expiryError);
        }

        const course = await Course.findById(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const ungrantedPhones = setCourseAccessExpiry(course, phones, expiresAt);

        if (ungrantedPhones.length) {
            return sendError(
                res,
                404,
                ungrantedPhones.length === 1
                    ? `${ungrantedPhones[0]} does not have access to this course`
                    : `These phones do not have access to this course: ${ungrantedPhones.join(', ')}`
            );
        }

        await course.save();

        return res.status(200).json({
            success: true,
            message: expiresAt
                ? 'Custom expiry updated successfully'
                : 'Custom expiry removed successfully',
            data: formatCourseAccessResponse(course)
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while updating custom expiry');
    }
};

const deleteCourseByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findByIdAndDelete(courseId);

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        await Promise.all([
            Chapter.deleteMany({ courseId }),
            Note.deleteMany({ courseId })
        ]);

        return res.status(200).json({
            success: true,
            message: 'Course deleted successfully',
            data: {}
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while deleting course');
    }
};

const getChaptersByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId).select('_id');

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const chapters = await Chapter.find({ courseId }).sort({ order: 1, createdAt: 1 });

        return res.status(200).json({
            success: true,
            message: 'Chapters fetched successfully',
            data: { chapters: chapters.map(formatChapterData) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching chapters');
    }
};

const createChapterByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { name, playlistUrl } = req.body || {};

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId).select('_id');

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const chapterName = String(name || '').trim();

        if (!chapterName) {
            return sendError(res, 400, 'Chapter name is required');
        }

        const trimmedPlaylistUrl = String(playlistUrl || '').trim();
        const playlistId = parsePlaylistId(trimmedPlaylistUrl);

        if (!playlistId) {
            return sendError(res, 400, 'Valid YouTube playlist link is required');
        }

        const order = hasField(req.body, 'order')
            ? parseNonNegativeInteger(req.body.order)
            : await getNextChapterOrder(courseId);

        if (order === null) {
            return sendError(res, 400, 'Chapter order must be a non-negative integer');
        }

        const videos = await buildVideoSnapshots(playlistId);
        const syncedAt = new Date();
        const chapter = await Chapter.create({
            courseId,
            name: chapterName,
            playlistUrl: trimmedPlaylistUrl,
            playlistId,
            order,
            videos,
            videoCount: videos.length,
            durationSeconds: sumVideoDurationSeconds(videos),
            lastSyncedAt: syncedAt,
            syncStatus: 'synced',
            syncError: ''
        });

        await recalculateCourseDuration(courseId);

        return res.status(201).json({
            success: true,
            message: 'Chapter created successfully',
            data: { chapter: formatChapterData(chapter) }
        });
    } catch (error) {
        return sendError(
            res,
            error.statusCode || 500,
            error.statusCode ? error.message : 'Something went wrong while creating chapter'
        );
    }
};

const updateChapterByAdmin = async (req, res) => {
    try {
        const { courseId, chapterId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        if (!isValidObjectId(chapterId)) {
            return sendError(res, 400, 'Invalid chapter id');
        }

        const chapter = await Chapter.findOne({ _id: chapterId, courseId });

        if (!chapter) {
            return sendError(res, 404, 'Chapter not found');
        }

        const allowedFields = ['name', 'playlistUrl', 'order'];
        const hasUpdate = allowedFields.some((field) => hasField(req.body, field));
        let hasResyncedVideos = false;

        if (!hasUpdate) {
            return sendError(res, 400, 'At least one chapter field is required');
        }

        if (hasField(req.body, 'name')) {
            const chapterName = String(req.body.name || '').trim();

            if (!chapterName) {
                return sendError(res, 400, 'Chapter name is required');
            }

            chapter.name = chapterName;
        }

        if (hasField(req.body, 'order')) {
            const order = parseNonNegativeInteger(req.body.order);

            if (order === null) {
                return sendError(res, 400, 'Chapter order must be a non-negative integer');
            }

            chapter.order = order;
        }

        if (hasField(req.body, 'playlistUrl')) {
            const trimmedPlaylistUrl = String(req.body.playlistUrl || '').trim();
            const playlistId = parsePlaylistId(trimmedPlaylistUrl);

            if (!playlistId) {
                return sendError(res, 400, 'Valid YouTube playlist link is required');
            }

            if (playlistId !== chapter.playlistId || trimmedPlaylistUrl !== chapter.playlistUrl) {
                const videos = await buildVideoSnapshots(playlistId);
                chapter.playlistUrl = trimmedPlaylistUrl;
                chapter.playlistId = playlistId;
                applySyncedVideosToChapter(chapter, videos);
                hasResyncedVideos = true;
            }
        }

        await chapter.save();

        // Renaming or reordering a chapter cannot move the course length, so the
        // recount is spent only when a new playlist was actually pulled in.
        if (hasResyncedVideos) {
            await recalculateCourseDuration(courseId);
        }

        return res.status(200).json({
            success: true,
            message: 'Chapter updated successfully',
            data: { chapter: formatChapterData(chapter) }
        });
    } catch (error) {
        return sendError(
            res,
            error.statusCode || 500,
            error.statusCode ? error.message : 'Something went wrong while updating chapter'
        );
    }
};

const deleteChapterByAdmin = async (req, res) => {
    try {
        const { courseId, chapterId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        if (!isValidObjectId(chapterId)) {
            return sendError(res, 400, 'Invalid chapter id');
        }

        const chapter = await Chapter.findOneAndDelete({ _id: chapterId, courseId });

        if (!chapter) {
            return sendError(res, 404, 'Chapter not found');
        }

        await recalculateCourseDuration(courseId);

        return res.status(200).json({
            success: true,
            message: 'Chapter deleted successfully',
            data: {}
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while deleting chapter');
    }
};

const syncChapterVideosByAdmin = async (req, res) => {
    try {
        const { courseId, chapterId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        if (!isValidObjectId(chapterId)) {
            return sendError(res, 400, 'Invalid chapter id');
        }

        const chapter = await Chapter.findOne({ _id: chapterId, courseId });

        if (!chapter) {
            return sendError(res, 404, 'Chapter not found');
        }

        try {
            const videos = await buildVideoSnapshots(chapter.playlistId);
            applySyncedVideosToChapter(chapter, videos);
            await chapter.save();
            await recalculateCourseDuration(courseId);
        } catch (error) {
            chapter.syncStatus = 'failed';
            chapter.syncError = error.message || 'Unable to fetch YouTube playlist videos';
            await chapter.save();
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Chapter videos synced successfully',
            data: { chapter: formatChapterData(chapter) }
        });
    } catch (error) {
        return sendError(
            res,
            error.statusCode || 500,
            error.statusCode ? error.message : 'Something went wrong while syncing chapter videos'
        );
    }
};

const getCoursesByUser = async (req, res) => {
    try {
        const userPhone = normalizePhone(req.user?.phone);

        if (!userPhone) {
            return sendError(res, 401, 'Invalid user token');
        }

        const courses = await Course.find({
            isPublished: true,
            $or: [
                { isOpenToAll: true },
                { allowedUserPhones: userPhone },
                { 'accessGrants.phone': userPhone }
            ]
        }).sort({ createdAt: -1 });
        const accessibleCourses = courses.filter((course) => courseUserHasAccess(course, userPhone));
        const courseCounts = await getCourseCounts(accessibleCourses.map((course) => course._id));

        return res.status(200).json({
            success: true,
            message: 'Courses fetched successfully',
            data: {
                courses: accessibleCourses.map((course) => formatCourseData(
                    course,
                    courseCounts.get(course._id.toString()) || {},
                    {
                        includeUserAccess: true,
                        userPhone
                    }
                ))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching courses');
    }
};

const getCourseByUser = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userPhone = normalizePhone(req.user?.phone);

        if (!userPhone) {
            return sendError(res, 401, 'Invalid user token');
        }

        const courseQuery = getUserCourseLookupQuery(courseId);

        if (!courseQuery) {
            return sendError(res, 400, 'Invalid course id or slug');
        }

        const course = await Course.findOne({
            ...courseQuery,
            isPublished: true
        });

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        if (!courseUserHasAccess(course, userPhone)) {
            return sendError(res, 403, 'You do not have access to this course');
        }

        const chapters = await Chapter.find({ courseId: course._id }).sort({ order: 1, createdAt: 1 });
        const counts = {
            chapterCount: chapters.length,
            videoCount: chapters.reduce((total, chapter) => total + chapter.videoCount, 0)
        };
        const lastWatchedVideoKey = await getLastWatchedVideoKey({
            viewerRole: 'user',
            viewerId: req.user._id,
            courseId: course._id,
            chapters
        });

        return res.status(200).json({
            success: true,
            message: 'Course fetched successfully',
            data: {
                course: formatCourseData(course, counts, {
                    includeUserAccess: true,
                    userPhone
                }),
                chapters: chapters.map(formatUserChapterData),
                lastWatchedVideoKey
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching course');
    }
};

const saveCourseProgressByUser = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userPhone = normalizePhone(req.user?.phone);

        if (!req.user?._id || !userPhone) {
            return sendError(res, 401, 'Invalid user token');
        }

        const courseQuery = getUserCourseLookupQuery(courseId);

        if (!courseQuery) {
            return sendError(res, 400, 'Invalid course id or slug');
        }

        const course = await Course.findOne({
            ...courseQuery,
            isPublished: true
        });

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        if (!courseUserHasAccess(course, userPhone)) {
            return sendError(res, 403, 'You do not have access to this course');
        }

        return await saveLastWatchedVideo(res, {
            viewerRole: 'user',
            viewerId: req.user._id,
            course,
            videoKey: req.body?.videoKey
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while saving last watched video');
    }
};

const getCourseVideoEmbedByUser = async (req, res) => {
    try {
        const { courseId, chapterId, videoPosition } = req.params;
        const userPhone = normalizePhone(req.user?.phone);

        if (!userPhone) {
            return sendError(res, 401, 'Invalid user token');
        }

        const courseQuery = getUserCourseLookupQuery(courseId);

        if (!courseQuery) {
            return sendError(res, 400, 'Invalid course id or slug');
        }

        if (!isValidObjectId(chapterId)) {
            return sendError(res, 400, 'Invalid chapter id');
        }

        const parsedVideoPosition = parseNonNegativeInteger(videoPosition);

        if (parsedVideoPosition === null) {
            return sendError(res, 400, 'Invalid video position');
        }

        const course = await Course.findOne({
            ...courseQuery,
            isPublished: true
        });

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        if (!courseUserHasAccess(course, userPhone)) {
            return sendError(res, 403, 'You do not have access to this course');
        }

        const chapter = await Chapter.findOne({
            _id: chapterId,
            courseId: course._id
        });

        if (!chapter) {
            return sendError(res, 404, 'Chapter not found');
        }

        const video = (chapter.videos || []).find((chapterVideo) => (
            Number(chapterVideo.position) === parsedVideoPosition
        ));

        if (!video) {
            return sendError(res, 404, 'Video not found');
        }

        return sendVideoEmbedResponse(res, {
            youtubeVideoId: video.youtubeVideoId,
            title: video.title,
            videoKey: getUserVideoKey(chapter, video),
            shouldAutoplay: String(req.query?.autoplay || '') === '1'
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while loading video');
    }
};

// A faculty teaches whatever the site is running, so who a course was sold to is not
// what decides it: a course held for named students is still theirs to open. A draft
// is not, because it has not been released to anybody yet — it is the admin's until it
// goes live. Every faculty read of a course goes through this filter, so a link to a
// draft answers the same way as a link to a course that does not exist.
const FACULTY_COURSE_FILTER = { isPublished: true };

const getCoursesByFaculty = async (req, res) => {
    try {
        if (!req.faculty?._id) {
            return sendError(res, 401, 'Invalid faculty token');
        }

        const courses = await Course.find(FACULTY_COURSE_FILTER).sort({ createdAt: -1 });
        const courseCounts = await getCourseCounts(courses.map((course) => course._id));

        return res.status(200).json({
            success: true,
            message: 'Courses fetched successfully',
            data: {
                courses: courses.map((course) => formatCourseData(
                    course,
                    courseCounts.get(course._id.toString()) || {}
                ))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching courses');
    }
};

const getCourseByFaculty = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!req.faculty?._id) {
            return sendError(res, 401, 'Invalid faculty token');
        }

        const courseQuery = getUserCourseLookupQuery(courseId);

        if (!courseQuery) {
            return sendError(res, 400, 'Invalid course id or slug');
        }

        const course = await Course.findOne({ ...courseQuery, ...FACULTY_COURSE_FILTER });

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const chapters = await Chapter.find({ courseId: course._id }).sort({ order: 1, createdAt: 1 });
        const counts = {
            chapterCount: chapters.length,
            videoCount: chapters.reduce((total, chapter) => total + chapter.videoCount, 0)
        };
        const lastWatchedVideoKey = await getLastWatchedVideoKey({
            viewerRole: 'faculty',
            viewerId: req.faculty._id,
            courseId: course._id,
            chapters
        });

        return res.status(200).json({
            success: true,
            message: 'Course fetched successfully',
            data: {
                course: formatCourseData(course, counts),
                chapters: chapters.map(formatFacultyChapterData),
                lastWatchedVideoKey
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching course');
    }
};

const saveCourseProgressByFaculty = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!req.faculty?._id) {
            return sendError(res, 401, 'Invalid faculty token');
        }

        const courseQuery = getUserCourseLookupQuery(courseId);

        if (!courseQuery) {
            return sendError(res, 400, 'Invalid course id or slug');
        }

        const course = await Course.findOne({ ...courseQuery, ...FACULTY_COURSE_FILTER });

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        return await saveLastWatchedVideo(res, {
            viewerRole: 'faculty',
            viewerId: req.faculty._id,
            course,
            videoKey: req.body?.videoKey
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while saving last watched video');
    }
};

const getCourseVideoEmbedByFaculty = async (req, res) => {
    try {
        const { courseId, chapterId, videoPosition } = req.params;

        if (!req.faculty?._id) {
            return sendError(res, 401, 'Invalid faculty token');
        }

        const courseQuery = getUserCourseLookupQuery(courseId);

        if (!courseQuery) {
            return sendError(res, 400, 'Invalid course id or slug');
        }

        if (!isValidObjectId(chapterId)) {
            return sendError(res, 400, 'Invalid chapter id');
        }

        const parsedVideoPosition = parseNonNegativeInteger(videoPosition);

        if (parsedVideoPosition === null) {
            return sendError(res, 400, 'Invalid video position');
        }

        const course = await Course.findOne({ ...courseQuery, ...FACULTY_COURSE_FILTER });

        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const chapter = await Chapter.findOne({
            _id: chapterId,
            courseId: course._id
        });

        if (!chapter) {
            return sendError(res, 404, 'Chapter not found');
        }

        const video = (chapter.videos || []).find((chapterVideo) => (
            Number(chapterVideo.position) === parsedVideoPosition
        ));

        if (!video?.youtubeVideoId) {
            return sendError(res, 404, 'Video not found');
        }

        return sendVideoEmbedResponse(res, {
            youtubeVideoId: video.youtubeVideoId,
            title: video.title,
            videoKey: getUserVideoKey(chapter, video),
            shouldAutoplay: String(req.query?.autoplay || '') === '1'
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while loading video');
    }
};

module.exports = {
    getAllCoursesByAdmin,
    getUserCoursesByAdmin,
    createCourseByAdmin,
    getCourseByAdmin,
    updateCourseByAdmin,
    getCourseAccessByAdmin,
    replaceCourseAccessByAdmin,
    addCourseAccessByAdmin,
    removeCourseAccessByAdmin,
    setCourseAccessExpiryByAdmin,
    deleteCourseByAdmin,
    getChaptersByAdmin,
    createChapterByAdmin,
    updateChapterByAdmin,
    deleteChapterByAdmin,
    syncChapterVideosByAdmin,
    getCoursesByUser,
    getCourseByUser,
    saveCourseProgressByUser,
    getCourseVideoEmbedByUser,
    getCoursesByFaculty,
    getCourseByFaculty,
    saveCourseProgressByFaculty,
    getCourseVideoEmbedByFaculty,
    FACULTY_COURSE_FILTER,
    normalizePhoneArray,
    parseVideoKey,
    courseUserHasAccess,
    parseCourseDurationMonths,
    getCourseDurationDays,
    getCourseAccessWindow,
    collectActiveUserPhones,
    getActiveUserPhones,
    isUserPhoneActive,
    parsePlaylistId,
    buildVideoSnapshots,
    parseIsoDurationSeconds,
    sumVideoDurationSeconds,
    backfillCourseDurations
};
