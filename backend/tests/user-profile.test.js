const test = require('node:test');
const assert = require('node:assert/strict');

const { formatUserData } = require('../controllers/user.controller');
const { formatUserData: formatUserDataForAdmin } = require('../controllers/admin.controller');
const User = require('../models/user.model');

const DAY_MS = 24 * 60 * 60 * 1000;

const buildUser = (overrides = {}) => new User({
    name: 'Asha Rao',
    phone: '9876543210',
    password: 'hashed-password',
    ...overrides
});

test('an account starts with every optional detail empty', () => {
    assert.deepEqual(formatUserData(buildUser()).profile, {
        email: '',
        alternatePhone: '',
        occupation: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        dateOfBirth: ''
    });
});

test('an account that has never answered is asked for its profile', () => {
    assert.equal(formatUserData(buildUser()).requiresProfile, true);
});

test('going through the form is what stops the account being asked', () => {
    assert.equal(formatUserData(buildUser({ profileUpdatedAt: new Date() })).requiresProfile, false);
});

test('asking for later holds the prompt off until the days are up', () => {
    const waiting = buildUser({ profileRemindAfter: User.getPromptRemindAfter('profile') });
    const elapsed = buildUser({ profileRemindAfter: new Date(Date.now() - 1000) });

    assert.equal(formatUserData(waiting).requiresProfile, false);
    assert.equal(formatUserData(elapsed).requiresProfile, true);
});

test('later is counted from the moment it was asked, not from the next login', () => {
    const asked = new Date('2026-01-01T10:00:00.000Z');
    const remindAfter = User.getPromptRemindAfter('profile', asked);

    assert.equal(remindAfter.getTime() - asked.getTime(), User.PROMPTS.profile.days * DAY_MS);
});

test('an account that already filled the form in is not asked again by a stale reminder', () => {
    const user = buildUser({
        profileUpdatedAt: new Date(),
        profileRemindAfter: new Date(Date.now() - DAY_MS)
    });

    assert.equal(formatUserData(user).requiresProfile, false);
});

test('the profile reads back exactly what an input can hold', () => {
    const user = buildUser();

    User.applyProfileInput(user, {
        email: '  Asha@Example.COM ',
        dateOfBirth: '2000-05-04',
        city: ' Pune '
    });

    const { profile } = formatUserData(user);

    assert.equal(profile.email, 'asha@example.com');
    assert.equal(profile.dateOfBirth, '2000-05-04');
    assert.equal(profile.city, 'Pune');
});

test('only the fields that were sent are touched, and an emptied box clears its value', () => {
    const user = buildUser();

    User.applyProfileInput(user, { city: 'Pune', pincode: '411001' });
    User.applyProfileInput(user, { city: '' });

    assert.equal(user.profile.city, '');
    assert.equal(user.profile.pincode, '411001');
});

test('a profile left completely empty is still valid, since none of it is required', () => {
    const user = buildUser();

    User.applyProfileInput(user, {
        email: '',
        alternatePhone: '',
        occupation: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        dateOfBirth: ''
    });

    assert.equal(user.validateSync(), undefined);
});

test('a detail that was typed has to be usable', () => {
    const user = buildUser();

    User.applyProfileInput(user, {
        email: 'asha-at-example',
        alternatePhone: '12',
        pincode: 'abc'
    });

    const { errors } = user.validateSync();

    assert.match(errors['profile.email'].message, /valid email/);
    assert.match(errors['profile.alternatePhone'].message, /10 to 15 digits/);
    assert.match(errors['profile.pincode'].message, /4 to 10 digits/);
});

// Blocking runs across the enrolment standing rather than replacing it, so the admin
// table has to be told both about the same account.
test('an account is unblocked until a date says otherwise, and blocking is its own standing', () => {
    const user = buildUser();
    const blocked = buildUser({ bannedAt: new Date('2026-08-15T10:00:00.000Z') });

    assert.equal(user.bannedAt, null);
    assert.equal(formatUserDataForAdmin(user, true).isBanned, false);
    assert.equal(formatUserDataForAdmin(blocked, true).isBanned, true);
    assert.equal(formatUserDataForAdmin(blocked, true).isActive, true);
});

test('a date of birth that is not a real past date is rejected', () => {
    const future = buildUser();
    const nonsense = buildUser();

    User.applyProfileInput(future, { dateOfBirth: '3000-01-01' });
    User.applyProfileInput(nonsense, { dateOfBirth: '2000-13-45' });

    assert.ok(future.validateSync().errors['profile.dateOfBirth']);
    assert.ok(nonsense.validateSync().errors['profile.dateOfBirth']);
});
