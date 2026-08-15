const test = require('node:test');
const assert = require('node:assert/strict');

const { formatContentData, readContentInput } = require('../controllers/content.controller');
const Content = require('../models/content.model');

const buildContent = (overrides = {}) => new Content({
    name: 'Python Programming',
    description: 'Start from "what is a variable" and finish writing your own programs.',
    price: 10000,
    duration: '3 months',
    ...overrides
});

// What content may hold

test('content is not content without a name, a description, a price and a length', () => {
    const blank = new Content().validateSync().errors;

    assert.ok(blank.name);
    assert.ok(blank.description);
    assert.ok(blank.price);
    assert.ok(blank.duration);
    assert.equal(buildContent().validateSync(), undefined);
});

test('a price of zero is how the institute says the fee depends on the batch', () => {
    assert.equal(buildContent({ price: 0 }).validateSync(), undefined);
    assert.ok(buildContent({ price: -1 }).validateSync().errors.price);
});

test('everything past the four required fields is optional', () => {
    const content = buildContent();

    assert.equal(content.type, '');
    assert.deepEqual(content.topics, []);
    assert.deepEqual(content.prerequisites, []);
    assert.equal(content.isHighlighted, false);
    assert.equal(content.showcasedAt, null);
});

test('a mode of learning is one of the three the institute offers, or none', () => {
    Content.TYPES.forEach((type) => {
        assert.equal(buildContent({ type }).validateSync(), undefined);
    });

    assert.equal(buildContent({ type: 'Online' }).validateSync(), undefined, 'case is not the sender\'s to get right');
    assert.ok(buildContent({ type: 'offline' }).validateSync().errors.type);
});

test('a list typed as one line keeps neither its blanks nor its repeats', () => {
    const content = buildContent({ topics: ['Loops', '  Loops  ', '', '  Functions'] });

    assert.deepEqual(content.topics, ['Loops', 'Functions']);
});

// What is taken from the sender

test('nothing but the content itself is taken from the sender', () => {
    const input = readContentInput({
        name: '  SQL & Databases  ',
        description: '  Query real data.  ',
        price: '10000',
        duration: ' 3 months ',
        showcasedAt: new Date(),
        _id: 'not-mine-to-set'
    });

    assert.equal(input.name, 'SQL & Databases');
    assert.equal(input.description, 'Query real data.');
    assert.equal(input.price, 10000);
    assert.equal(input.duration, '3 months');
    assert.equal(input.showcasedAt, undefined);
    assert.equal(input._id, undefined);
});

test('an empty price box means "not answered" rather than "free"', () => {
    assert.equal(readContentInput({ price: '' }).price, null);
    assert.equal(readContentInput({}).price, null);
    assert.equal(readContentInput({ price: 'later' }).price, null);
    assert.equal(readContentInput({ price: 0 }).price, 0);
});

test('a price that was never answered is refused by name', () => {
    const missing = buildContent(readContentInput({
        name: 'CCC',
        description: 'Computer fundamentals.',
        duration: 'Ask us',
        price: ''
    }));

    assert.match(missing.validateSync().errors.price.message, /Set a price/);
});

// How content reads back

test('showcasing is read off the date it was picked', () => {
    assert.equal(formatContentData(buildContent()).showcased, false);
    assert.equal(formatContentData(buildContent({ showcasedAt: new Date() })).showcased, true);
});

test('the whole of the content reads back, so every reader of it sees the same thing', () => {
    const content = buildContent({
        code: 'PY-01',
        category: 'Programming',
        level: 'No experience needed',
        type: 'online+hybrid',
        taughtBy: 'Programming faculty',
        topics: ['Loops', 'Functions'],
        prerequisites: ['None'],
        isHighlighted: true
    });

    const data = formatContentData(content);

    assert.equal(data._id, content._id.toString());
    assert.equal(data.code, 'PY-01');
    assert.equal(data.type, 'online+hybrid');
    assert.deepEqual(data.topics, ['Loops', 'Functions']);
    assert.equal(data.isHighlighted, true);
});
