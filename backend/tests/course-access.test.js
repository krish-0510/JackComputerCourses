const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizePhoneArray,
    courseUserHasAccess,
    courseUserHasEnrolment,
    parseCourseDurationMonths,
    getCourseDurationDays,
    getCourseAccessWindow,
    collectActiveUserPhones
} = require('../controllers/course.controller');

test('normalizePhoneArray trims, splits comma lists, and removes duplicates', () => {
    assert.deepEqual(
        normalizePhoneArray(' 9876543210, 9876543210, +91 99999 99999 ,, '),
        ['9876543210', '+91 99999 99999']
    );
});

test('courseUserHasAccess allows only phones present on the course', () => {
    const course = {
        duration: '3',
        allowedUserPhones: ['9876543210', ' +91 99999 99999 '],
        accessGrants: [
            { phone: '9876543210', grantedAt: new Date('2026-01-01T10:00:00.000Z') },
            { phone: '+91 99999 99999', grantedAt: new Date('2026-01-01T10:00:00.000Z') }
        ]
    };

    const now = new Date('2026-03-31T23:59:59.999Z');

    assert.equal(courseUserHasAccess(course, '9876543210', { now }), true);
    assert.equal(courseUserHasAccess(course, '+91 99999 99999', { now }), true);
    assert.equal(courseUserHasAccess(course, '0000000000', { now }), false);
    assert.equal(courseUserHasAccess({ duration: '3', allowedUserPhones: [] }, '9876543210', { now }), false);
});

test('courseUserHasAccess allows any website user for open courses', () => {
    const course = {
        isOpenToAll: true,
        allowedUserPhones: []
    };

    assert.equal(courseUserHasAccess(course, '0000000000'), true);
    assert.equal(courseUserHasAccess(course, ''), false);
});

test('course duration accepts only positive month values and converts them to days', () => {
    assert.equal(parseCourseDurationMonths('3'), 3);
    assert.equal(parseCourseDurationMonths('1.5'), 1.5);
    assert.equal(parseCourseDurationMonths('0'), null);
    assert.equal(parseCourseDurationMonths('8 weeks'), null);
    assert.equal(getCourseDurationDays('1.5'), 45);
    assert.equal(getCourseDurationDays('0.1'), 3);
    assert.equal(getCourseDurationDays('0.01'), 1);
});

test('only a grant that is still running keeps an account active', () => {
    const now = new Date('2026-08-06T12:00:00.000Z');
    const activePhones = collectActiveUserPhones([
        {
            duration: '3',
            accessGrants: [
                { phone: '9000000001', grantedAt: new Date('2026-07-01T10:00:00.000Z') },
                { phone: '9000000002', grantedAt: new Date('2026-01-01T10:00:00.000Z') }
            ]
        },
        {
            // A second course the expired account is also on, still expired.
            duration: '1',
            accessGrants: [
                { phone: '9000000002', grantedAt: new Date('2026-05-01T10:00:00.000Z') }
            ]
        },
        {
            // Open to all is the public catalogue, not an enrolment.
            isOpenToAll: true,
            duration: '',
            allowedUserPhones: ['9000000003']
        },
        {
            // A course without a usable duration has no deadline to be inside of.
            duration: '',
            allowedUserPhones: ['9000000004'],
            createdAt: new Date('2026-08-01T10:00:00.000Z')
        }
    ], now);

    assert.deepEqual([...activePhones], ['9000000001']);
});

test('a grant with no date of its own falls back to the course it was made on', () => {
    const course = {
        duration: '1',
        allowedUserPhones: ['9000000005'],
        createdAt: new Date('2026-08-01T10:00:00.000Z')
    };

    assert.equal(collectActiveUserPhones([course], new Date('2026-08-06T12:00:00.000Z')).size, 1);
    assert.equal(collectActiveUserPhones([course], new Date('2026-09-06T12:00:00.000Z')).size, 0);
});

test('course access expires at midnight after the converted duration days', () => {
    const course = {
        duration: '3',
        accessGrants: [
            { phone: '9876543210', grantedAt: new Date('2026-01-01T10:00:00.000Z') }
        ]
    };

    const accessWindow = getCourseAccessWindow(course, '9876543210', new Date('2026-03-31T12:00:00.000Z'));

    assert.equal(accessWindow.startsOn, '2026-01-01');
    assert.equal(accessWindow.endsOn, '2026-04-01');
    assert.equal(accessWindow.endsAt.toISOString(), '2026-04-01T00:00:00.000Z');
    assert.equal(courseUserHasAccess(course, '9876543210', {
        now: new Date('2026-03-31T23:59:59.999Z')
    }), true);
    assert.equal(courseUserHasAccess(course, '9876543210', {
        now: new Date('2026-04-01T00:00:00.000Z')
    }), false);
});

test('a custom expiry replaces the course duration for that one grant', () => {
    const course = {
        duration: '3',
        accessGrants: [
            {
                phone: '9876543210',
                grantedAt: new Date('2026-01-01T10:00:00.000Z'),
                expiresAt: new Date('2026-02-10T18:30:00.000Z')
            },
            { phone: '9000000002', grantedAt: new Date('2026-01-01T10:00:00.000Z') }
        ]
    };

    const customWindow = getCourseAccessWindow(course, '9876543210', new Date('2026-02-01T12:00:00.000Z'));

    assert.equal(customWindow.type, 'custom');
    assert.equal(customWindow.endsAt.toISOString(), '2026-02-10T18:30:00.000Z');
    // The course duration is no longer what the window is made of, so it is not reported.
    assert.equal(customWindow.durationMonths, null);
    assert.equal(customWindow.durationDays, null);

    // The grant beside it is untouched and still runs on the course duration.
    assert.equal(getCourseAccessWindow(course, '9000000002', new Date('2026-02-01T12:00:00.000Z')).type, 'assigned');

    assert.equal(courseUserHasAccess(course, '9876543210', {
        now: new Date('2026-02-10T18:29:59.999Z')
    }), true);
    assert.equal(courseUserHasAccess(course, '9876543210', {
        now: new Date('2026-02-10T18:30:00.000Z')
    }), false);
});

test('a custom expiry can outlast the course duration and give a course without one a deadline', () => {
    const longerThanDuration = {
        duration: '1',
        accessGrants: [
            {
                phone: '9876543210',
                grantedAt: new Date('2026-01-01T10:00:00.000Z'),
                expiresAt: new Date('2026-06-01T09:00:00.000Z')
            }
        ]
    };

    // Past the month the course would have given, still running on the date it was set.
    assert.equal(courseUserHasAccess(longerThanDuration, '9876543210', {
        now: new Date('2026-05-01T12:00:00.000Z')
    }), true);

    const noDuration = {
        duration: '',
        accessGrants: [
            {
                phone: '9876543210',
                grantedAt: new Date('2026-01-01T10:00:00.000Z'),
                expiresAt: new Date('2026-06-01T09:00:00.000Z')
            }
        ]
    };

    assert.equal(getCourseAccessWindow(noDuration, '9876543210', new Date('2026-05-01T12:00:00.000Z')).type, 'custom');
    assert.equal(courseUserHasAccess(noDuration, '9876543210', {
        now: new Date('2026-05-01T12:00:00.000Z')
    }), true);
});

test('an account is kept active by a custom expiry exactly as by the course duration', () => {
    const courses = [
        {
            duration: '1',
            accessGrants: [
                // The course duration ran out in February; the hand-set date has not.
                {
                    phone: '9000000001',
                    grantedAt: new Date('2026-01-01T10:00:00.000Z'),
                    expiresAt: new Date('2026-09-01T09:00:00.000Z')
                },
                // Still inside the course duration, but hand-dated to have ended.
                {
                    phone: '9000000002',
                    grantedAt: new Date('2026-08-01T10:00:00.000Z'),
                    expiresAt: new Date('2026-08-04T09:00:00.000Z')
                }
            ]
        }
    ];

    assert.deepEqual(
        [...collectActiveUserPhones(courses, new Date('2026-08-06T12:00:00.000Z'))],
        ['9000000001']
    );
});

test('an ended grant is still an enrolment, and a course that never granted one is not', () => {
    const course = {
        duration: '1',
        accessGrants: [
            { phone: '9876543210', grantedAt: new Date('2026-01-01T10:00:00.000Z') }
        ]
    };

    const afterItClosed = { now: new Date('2026-06-01T12:00:00.000Z') };

    // The course stays on the student's shelf once the window closes, and opens nothing.
    assert.equal(courseUserHasEnrolment(course, '9876543210', afterItClosed), true);
    assert.equal(courseUserHasAccess(course, '9876543210', afterItClosed), false);

    assert.equal(courseUserHasEnrolment(course, '0000000000', afterItClosed), false);
    assert.equal(courseUserHasEnrolment(course, '', afterItClosed), false);

    // A grant with no deadline to be inside of is no window at all, so it is no more
    // visible than it is playable.
    const noDeadline = {
        duration: '',
        accessGrants: [
            { phone: '9876543210', grantedAt: new Date('2026-01-01T10:00:00.000Z') }
        ]
    };

    assert.equal(courseUserHasEnrolment(noDeadline, '9876543210', afterItClosed), false);

    // An open course is everyone's, and never ends.
    assert.equal(courseUserHasEnrolment({ isOpenToAll: true }, '9876543210', afterItClosed), true);
});

test('a part day left on a custom expiry still counts as a day', () => {
    const course = {
        duration: '3',
        accessGrants: [
            {
                phone: '9876543210',
                grantedAt: new Date('2026-01-01T10:00:00.000Z'),
                expiresAt: new Date('2026-02-10T18:30:00.000Z')
            }
        ]
    };

    assert.equal(
        getCourseAccessWindow(course, '9876543210', new Date('2026-02-10T09:00:00.000Z')).daysRemaining,
        1
    );
    assert.equal(
        getCourseAccessWindow(course, '9876543210', new Date('2026-02-09T09:00:00.000Z')).daysRemaining,
        2
    );
});
