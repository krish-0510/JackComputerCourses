const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const LoginHistory = require('../models/loginHistory.model');

test('login history requires account type, account id and session id', () => {
    const entry = new LoginHistory({});
    const error = entry.validateSync();

    assert.ok(error.errors.accountType);
    assert.ok(error.errors.accountId);
    assert.ok(error.errors.sessionId);
});

test('login history only accepts user and faculty accounts', () => {
    const adminEntry = new LoginHistory({
        accountType: 'admin',
        accountId: new mongoose.Types.ObjectId(),
        sessionId: 'session-1'
    });

    assert.ok(adminEntry.validateSync().errors.accountType);

    ['user', 'faculty'].forEach((accountType) => {
        const entry = new LoginHistory({
            accountType,
            accountId: new mongoose.Types.ObjectId(),
            sessionId: 'session-1'
        });

        assert.equal(entry.validateSync(), undefined);
    });
});

test('login history defaults to an open session stamped with a login time', () => {
    const entry = new LoginHistory({
        accountType: 'user',
        accountId: new mongoose.Types.ObjectId(),
        sessionId: 'session-1'
    });

    assert.ok(entry.loginAt instanceof Date);
    assert.equal(entry.logoutAt, null);
    assert.equal(entry.logoutReason, null);
});

// A session can be ended by the account, by the account's next login, or by the admin
// blocking it, and only the reasons the app actually writes may be stored.
test('login history accepts only the ways a session is actually ended', () => {
    const closedEntry = (logoutReason) => new LoginHistory({
        accountType: 'user',
        accountId: new mongoose.Types.ObjectId(),
        sessionId: 'session-1',
        logoutAt: new Date(),
        logoutReason
    });

    ['manual', 'replaced', 'blocked'].forEach((logoutReason) => {
        assert.equal(closedEntry(logoutReason).validateSync(), undefined);
    });

    assert.ok(closedEntry('expired').validateSync().errors.logoutReason);
});

test('login history indexes newest-first lookups per account', () => {
    const hasHistoryIndex = LoginHistory.schema.indexes().some(([fields]) => (
        fields.accountType === 1 && fields.accountId === 1 && fields.loginAt === -1
    ));

    assert.ok(hasHistoryIndex);
});

test('formatEntry exposes open sessions as active with ISO timestamps', () => {
    const loginAt = new Date('2026-08-02T10:15:30.000Z');
    const formatted = LoginHistory.formatEntry({
        _id: new mongoose.Types.ObjectId(),
        accountType: 'user',
        accountId: new mongoose.Types.ObjectId(),
        sessionId: 'session-1',
        loginAt,
        logoutAt: null,
        logoutReason: null
    });

    assert.deepEqual(
        Object.keys(formatted).sort(),
        ['_id', 'isActive', 'loginAt', 'logoutAt', 'logoutReason'].sort()
    );
    assert.equal(formatted.loginAt, loginAt.toISOString());
    assert.equal(formatted.logoutAt, null);
    assert.equal(formatted.isActive, true);
    assert.equal(formatted.sessionId, undefined);
});

test('formatEntry reports closed sessions with their logout reason', () => {
    const loginAt = new Date('2026-08-02T10:15:30.000Z');
    const logoutAt = new Date('2026-08-02T11:45:05.000Z');
    const formatted = LoginHistory.formatEntry({
        _id: new mongoose.Types.ObjectId(),
        accountType: 'faculty',
        accountId: new mongoose.Types.ObjectId(),
        sessionId: 'session-1',
        loginAt,
        logoutAt,
        logoutReason: 'replaced'
    });

    assert.equal(formatted.logoutAt, logoutAt.toISOString());
    assert.equal(formatted.logoutReason, 'replaced');
    assert.equal(formatted.isActive, false);
});
