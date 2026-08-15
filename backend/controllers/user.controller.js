const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const LoginHistory = require('../models/loginHistory.model');

const userCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
};

const userLoginCookieOptions = {
    ...userCookieOptions,
    maxAge: 24 * 60 * 60 * 1000
};

const formatUserData = (user) => ({
    name: user.name || '',
    phone: user.phone,
    // The app blocks on this until the account has both a first and a last name.
    requiresName: !User.hasFullName(user.name),
    // The guided walkthrough is owed to every account that has not finished it.
    requiresTour: !user.tourCompletedAt,
    // The optional details, and whether this login is due to be asked for them.
    profile: User.formatProfile(user.profile),
    requiresProfile: User.needsPrompt(user, 'profile'),
    // The other optional ask: what the account makes of the institute. Asked for the
    // same way, and owed until it is either answered or put off.
    requiresReview: User.needsPrompt(user, 'review'),
    role: 'user'
});

const createSessionId = () => (
    typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(32).toString('hex')
);

const createUserToken = (user) => jwt.sign(
    {
        id: user._id.toString(),
        phone: user.phone,
        role: 'user',
        sessionId: user.activeSessionId
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
);

const clearCurrentUserSession = async (token) => {
    if (!token || !process.env.JWT_SECRET) {
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'user' || !decoded.id || !decoded.sessionId) {
            return;
        }

        await User.updateOne(
            {
                _id: decoded.id,
                activeSessionId: decoded.sessionId
            },
            { $set: { activeSessionId: null } }
        );
        await LoginHistory.endSession('user', decoded.id, decoded.sessionId);
    } catch {
        // Invalid or stale logout tokens should only clear the browser cookie.
    }
};

const registerUser = async (req, res) => {
    try {
        const { name, phone, password } = req.body || {};

        if (!name || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone and password are required',
                data: {}
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'User authentication is not configured',
                data: {}
            });
        }

        const trimmedName = String(name).trim();
        const trimmedPhone = String(phone).trim();
        const userPassword = String(password);

        if (!trimmedName || !trimmedPhone || !userPassword) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone and password are required',
                data: {}
            });
        }

        if (userPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
                data: {}
            });
        }

        const existingUser = await User.findOne({ phone: trimmedPhone });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this phone already exists',
                data: {}
            });
        }

        const hashedPassword = await bcrypt.hash(userPassword, 10);
        const user = await User.create({
            name: trimmedName,
            phone: trimmedPhone,
            password: hashedPassword,
            activeSessionId: createSessionId()
        });

        await LoginHistory.startSession('user', user._id, user.activeSessionId);

        const token = createUserToken(user);

        return res
            .status(201)
            .cookie('userToken', token, userLoginCookieOptions)
            .json({
                success: true,
                message: 'User registered successfully',
                data: { user: formatUserData(user) }
            });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'User with this phone already exists',
                data: {}
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Something went wrong while registering user',
            data: {}
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { phone, password } = req.body || {};

        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Phone and password are required',
                data: {}
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'User authentication is not configured',
                data: {}
            });
        }

        const user = await User.findOne({ phone: String(phone).trim() }).select('+password +activeSessionId');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone or password',
                data: {}
            });
        }

        const passwordMatches = await bcrypt.compare(String(password), user.password);

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone or password',
                data: {}
            });
        }

        // A blocked account is turned away only once the password has been checked, so a
        // wrong password still reads as a wrong password and nobody can learn which
        // numbers are blocked by typing them in. It is the one refusal that names itself,
        // because the account cannot fix it and has to be told who can.
        if (user.bannedAt) {
            return res.status(403).json({
                success: false,
                message: User.BANNED_MESSAGE,
                data: {}
            });
        }

        user.activeSessionId = createSessionId();
        // Older accounts were stored with whatever casing was typed, so logging in
        // is where they pick up the "First Last" shape.
        user.name = User.formatName(user.name);
        await user.save();

        await LoginHistory.startSession('user', user._id, user.activeSessionId);

        const token = createUserToken(user);

        return res
            .status(200)
            .cookie('userToken', token, userLoginCookieOptions)
            .json({
                success: true,
                message: 'User logged in successfully',
                data: { user: formatUserData(user) }
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging in user',
            data: {}
        });
    }
};

const logoutUser = async (req, res) => {
    try {
        await clearCurrentUserSession(req.cookies?.userToken);

        return res
            .status(200)
            .clearCookie('userToken', userCookieOptions)
            .json({
                success: true,
                message: 'User logged out successfully',
                data: {}
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging out user',
            data: {}
        });
    }
};

// One time backfill for accounts that were created without a full name; once a
// first and last name are stored the account can no longer rename itself.
const updateUserName = async (req, res) => {
    try {
        const { firstName, lastName } = req.body || {};
        const trimmedFirstName = String(firstName || '').trim();
        const trimmedLastName = String(lastName || '').trim();

        if (!trimmedFirstName || !trimmedLastName) {
            return res.status(400).json({
                success: false,
                message: 'First name and last name are required',
                data: {}
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                data: {}
            });
        }

        if (User.hasFullName(user.name)) {
            return res.status(409).json({
                success: false,
                message: 'Name is already set for this account',
                data: {}
            });
        }

        user.name = `${trimmedFirstName} ${trimmedLastName}`;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Name saved successfully',
            data: { user: formatUserData(user) }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while saving user name',
            data: {}
        });
    }
};

// Closing the walkthrough is final: the filter keeps a second call from moving a
// date that is already set, so replays never rewrite when the account was taught.
const completeUserTour = async (req, res) => {
    try {
        await User.updateOne(
            {
                _id: req.user._id,
                tourCompletedAt: null
            },
            { $set: { tourCompletedAt: new Date() } }
        );

        return res.status(200).json({
            success: true,
            message: 'Walkthrough marked as completed',
            data: {}
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while saving the walkthrough',
            data: {}
        });
    }
};

// The whole profile is optional, so saving is also the answer to the prompt: whatever
// was typed is kept, and the account is not asked for it again.
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                data: {}
            });
        }

        User.applyProfileInput(user, req.body || {});
        user.set(User.answerPrompt('profile'));
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Profile saved successfully',
            data: { user: formatUserData(user) }
        });
    } catch (error) {
        // A value that is not an email, a number or a real date is the sender's to
        // correct, so the field's own rule is quoted back instead of a server fault.
        if (['ValidationError', 'CastError'].includes(error.name)) {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors || {})[0]?.message || 'Enter valid profile details',
                data: {}
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Something went wrong while saving user profile',
            data: {}
        });
    }
};

// Asking for later buys that prompt's own number of days, counted from the moment it
// was asked. An account that has already answered is never put back on the clock, so
// the filter carries the answer the same way for whichever prompt was put off.
const remindUserPromptLater = async (req, res) => {
    const { prompt } = req.params;

    try {
        const promptSettings = User.PROMPTS[prompt];

        if (!promptSettings) {
            return res.status(404).json({
                success: false,
                message: 'Unknown prompt',
                data: {}
            });
        }

        const reminder = User.remindPromptLater(prompt);

        await User.updateOne(
            {
                _id: req.user._id,
                [promptSettings.answeredField]: null
            },
            { $set: reminder }
        );

        return res.status(200).json({
            success: true,
            message: 'Reminder scheduled',
            data: { remindAfter: reminder[promptSettings.remindField] }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while scheduling the reminder',
            data: {}
        });
    }
};

const getUserProfile = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'User profile fetched successfully',
            data: { user: req.user }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching user profile',
            data: {}
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    updateUserName,
    completeUserTour,
    updateUserProfile,
    remindUserPromptLater,
    formatUserData,
    getUserProfile
};
