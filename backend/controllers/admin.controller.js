const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Course = require('../models/course.model');
const Bug = require('../models/bug.model');
const Review = require('../models/review.model');
const PasswordRequest = require('../models/passwordRequest.model');
const LoginHistory = require('../models/loginHistory.model');
const { getActiveUserPhones, isUserPhoneActive } = require('./course.controller');

let cachedAdminPassword = null;
let cachedAdminPasswordHash = null;
let activeAdminSessionId = null;

const adminCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
};

const adminLoginCookieOptions = {
    ...adminCookieOptions,
    maxAge: 24 * 60 * 60 * 1000
};

const getAdminConfig = () => {
    const adminPhone = process.env.ADMIN_PHONE;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminPhone || !adminPassword || !jwtSecret) {
        return null;
    }

    return { adminPhone, adminPassword, jwtSecret };
};

const getAdminPasswordHash = async (adminPassword) => {
    if (cachedAdminPassword !== adminPassword || !cachedAdminPasswordHash) {
        cachedAdminPassword = adminPassword;
        cachedAdminPasswordHash = await bcrypt.hash(adminPassword, 10);
    }

    return cachedAdminPasswordHash;
};

const createSessionId = () => (
    typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(32).toString('hex')
);

const clearCurrentAdminSession = (token, jwtSecret) => {
    if (!token || !jwtSecret) {
        return;
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);

        if (
            decoded.role === 'admin'
            && decoded.sessionId
            && decoded.sessionId === activeAdminSessionId
        ) {
            activeAdminSessionId = null;
        }
    } catch {
        // Invalid or stale logout tokens should only clear the browser cookie.
    }
};

// Whether an account still holds a running course is decided by the courses, not by
// the account, so it is handed in by whoever already knows it: a list works it out
// for every row in one pass, a single account asks about itself.
const formatUserData = (user, isActive = false) => ({
    _id: user._id.toString(),
    name: user.name || '',
    phone: user.phone,
    // The details an account volunteered, in the same shape its own profile page
    // reads them. A query that did not ask for them reads as all empty rather than
    // as missing, so a caller only has to handle "not filled in".
    profile: User.formatProfile(user.profile),
    isActive: Boolean(isActive),
    // Blocked is a second standing rather than a replacement for the first: an account
    // can be inside a course window and still be barred from signing in, and the table
    // has to be able to say both.
    isBanned: Boolean(user.bannedAt),
    role: 'user'
});

const hasBodyField = (body, field) => Object.prototype.hasOwnProperty.call(body || {}, field);

const isValidUserId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

// A sheet is allowed to leave the password column empty, and when it does the site
// picks the same password every time: the first name in lower case with 123 after it.
const GENERATED_PASSWORD_SUFFIX = '123';

const getGeneratedPassword = (firstName) => (
    `${String(firstName).toLowerCase().replace(/\s+/g, '')}${GENERATED_PASSWORD_SUFFIX}`
);

// The create form and the bulk sheet hand over the same four fields, so the trimming,
// the missing-field refusal and the single name they are stored under are decided here
// for both. Only a sheet may arrive without a password, so only a sheet is given one.
// A refusal still carries whatever the row did say, so it can name itself on screen.
const prepareNewUserInput = (input = {}, { generatePassword = false } = {}) => {
    const firstName = String(input.firstName || '').trim();
    const lastName = String(input.lastName || '').trim();
    const phone = String(input.phone || '').trim();
    const typedPassword = String(input.password || '');
    const password = typedPassword || (generatePassword && firstName ? getGeneratedPassword(firstName) : '');
    const isComplete = Boolean(firstName && lastName && phone && password);

    return {
        name: [firstName, lastName].filter(Boolean).join(' '),
        phone,
        password,
        isPasswordGenerated: Boolean(password) && !typedPassword,
        message: isComplete
            ? ''
            : (generatePassword
                ? 'First name, last name and phone are required'
                : 'First name, last name, phone and password are required')
    };
};

const loginAdmin = async (req, res) => {
    try {
        const { phone, password } = req.body || {};

        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Phone and password are required',
                data: {}
            });
        }

        const adminConfig = getAdminConfig();

        if (!adminConfig) {
            return res.status(500).json({
                success: false,
                message: 'Admin authentication is not configured',
                data: {}
            });
        }

        const phoneMatches = String(phone).trim() === String(adminConfig.adminPhone).trim();
        const adminPasswordHash = await getAdminPasswordHash(adminConfig.adminPassword);
        const passwordMatches = await bcrypt.compare(String(password), adminPasswordHash);

        if (!phoneMatches || !passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone or password',
                data: {}
            });
        }

        activeAdminSessionId = createSessionId();

        const admin = {
            phone: adminConfig.adminPhone,
            role: 'admin'
        };

        const token = jwt.sign(
            {
                ...admin,
                sessionId: activeAdminSessionId
            },
            adminConfig.jwtSecret,
            { expiresIn: '1d' }
        );

        return res
            .status(200)
            .cookie('adminToken', token, adminLoginCookieOptions)
            .json({
                success: true,
                message: 'Admin logged in successfully',
                data: { admin }
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging in admin',
            data: {}
        });
    }
};

const logoutAdmin = async (req, res) => {
    try {
        clearCurrentAdminSession(req.cookies?.adminToken, process.env.JWT_SECRET);

        return res
            .status(200)
            .clearCookie('adminToken', adminCookieOptions)
            .json({
                success: true,
                message: 'Admin logged out successfully',
                data: {}
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging out admin',
            data: {}
        });
    }
};

const getAdminProfile = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'Admin profile fetched successfully',
            data: { admin: req.admin }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching admin profile',
            data: {}
        });
    }
};

// Feeds the navbar badges, so it answers with two counted index lookups instead
// of the full request and bug lists.
const getAdminAlertCounts = async (req, res) => {
    try {
        const [passwordRequests, bugs] = await Promise.all([
            PasswordRequest.countDocuments({ status: 'pending' }),
            Bug.countDocuments({ status: 'open' })
        ]);

        return res.status(200).json({
            success: true,
            message: 'Admin alerts fetched successfully',
            data: { passwordRequests, bugs }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching admin alerts',
            data: {}
        });
    }
};

const getAllUsersByAdmin = async (req, res) => {
    try {
        // Every enrolment in the catalogue is read once, so the whole list is
        // classified without a query per account.
        const [users, activePhones] = await Promise.all([
            User.find({}).select('name phone profile bannedAt').sort({ phone: 1 }),
            getActiveUserPhones()
        ]);

        return res.status(200).json({
            success: true,
            message: 'Users fetched successfully',
            data: {
                users: users.map((user) => formatUserData(user, activePhones.has(user.phone)))
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching users',
            data: {}
        });
    }
};

const createUserByAdmin = async (req, res) => {
    try {
        // The name halves are only an input shape: the account still stores one name.
        const newUser = prepareNewUserInput(req.body);

        if (newUser.message) {
            return res.status(400).json({
                success: false,
                message: newUser.message,
                data: {}
            });
        }

        const existingUser = await User.findOne({ phone: newUser.phone });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this phone already exists',
                data: {}
            });
        }

        const user = await User.create({
            name: newUser.name,
            phone: newUser.phone,
            password: await bcrypt.hash(newUser.password, 10)
        });

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            // A brand new account cannot hold a course yet, so it starts inactive
            // without asking the catalogue about it.
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
            message: 'Something went wrong while creating user',
            data: {}
        });
    }
};

// Hashing is what a sheet costs, and it is paid once per row, so the file is held to a
// size that still answers inside one request.
const MAX_BULK_USERS = 200;

// A whole sheet of accounts in one request. Every row is answered on its own: a row
// that cannot be made says why and the rows around it are still created, so the admin
// fixes the few that were refused instead of uploading the file again.
const bulkCreateUsersByAdmin = async (req, res) => {
    try {
        const rows = Array.isArray(req.body?.users) ? req.body.users : [];

        if (!rows.length) {
            return res.status(400).json({
                success: false,
                message: 'The sheet has no users in it',
                data: {}
            });
        }

        if (rows.length > MAX_BULK_USERS) {
            return res.status(400).json({
                success: false,
                message: `A sheet can hold at most ${MAX_BULK_USERS} users. Split the file and import it in parts.`,
                data: {}
            });
        }

        // Every phone in the sheet is looked up in one query, and a phone the sheet
        // itself repeats belongs to the row that reached it first.
        const existingUsers = await User.find({
            phone: { $in: rows.map((row) => String(row?.phone || '').trim()).filter(Boolean) }
        }).select('phone');
        const takenPhones = new Set(existingUsers.map((user) => user.phone));

        const users = [];
        const results = [];

        for (const row of rows) {
            const newUser = prepareNewUserInput(row, { generatePassword: true });

            if (newUser.message || takenPhones.has(newUser.phone)) {
                results.push({
                    status: 'failed',
                    name: newUser.name,
                    phone: newUser.phone,
                    message: newUser.message || 'User with this phone already exists'
                });
                continue;
            }

            try {
                const user = await User.create({
                    name: newUser.name,
                    phone: newUser.phone,
                    password: await bcrypt.hash(newUser.password, 10)
                });

                takenPhones.add(user.phone);
                users.push(formatUserData(user));
                results.push({
                    status: 'created',
                    name: user.name,
                    phone: user.phone,
                    // The admin has to be able to hand the account over, and a password
                    // the site generated is written down nowhere else.
                    password: newUser.password,
                    isPasswordGenerated: newUser.isPasswordGenerated
                });
            } catch (rowError) {
                results.push({
                    status: 'failed',
                    name: newUser.name,
                    phone: newUser.phone,
                    message: rowError.code === 11000
                        ? 'User with this phone already exists'
                        : 'This row could not be created'
                });
            }
        }

        const counts = {
            created: users.length,
            failed: results.length - users.length
        };

        return res.status(counts.created ? 201 : 200).json({
            success: true,
            message: `${counts.created} of ${results.length} users created`,
            data: { users, results, counts }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while importing users',
            data: {}
        });
    }
};

const updateUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUserId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
                data: {}
            });
        }

        const hasName = hasBodyField(req.body, 'firstName') || hasBodyField(req.body, 'lastName');
        const hasPhone = hasBodyField(req.body, 'phone');
        const hasPassword = hasBodyField(req.body, 'password');
        // Blocking is sent on its own from the users table rather than through the edit
        // form, so it is another field this may be asked for and nothing else has to be
        // sent alongside it.
        const hasBanned = hasBodyField(req.body, 'isBanned');

        if (!hasName && !hasPhone && !hasPassword && !hasBanned) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone, password or blocked standing is required',
                data: {}
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                data: {}
            });
        }

        const oldPhone = user.phone;

        if (hasName) {
            const trimmedFirstName = String(req.body.firstName || '').trim();
            const trimmedLastName = String(req.body.lastName || '').trim();

            if (!trimmedFirstName || !trimmedLastName) {
                return res.status(400).json({
                    success: false,
                    message: 'First name and last name are required',
                    data: {}
                });
            }

            user.name = `${trimmedFirstName} ${trimmedLastName}`;
        }

        if (hasPhone) {
            const trimmedPhone = String(req.body.phone || '').trim();

            if (!trimmedPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone is required',
                    data: {}
                });
            }

            const duplicateUser = await User.findOne({
                phone: trimmedPhone,
                _id: { $ne: id }
            });

            if (duplicateUser) {
                return res.status(409).json({
                    success: false,
                    message: 'User with this phone already exists',
                    data: {}
                });
            }

            user.phone = trimmedPhone;
        }

        if (hasPassword) {
            const userPassword = String(req.body.password || '');

            if (!userPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Password is required',
                    data: {}
                });
            }

            user.password = await bcrypt.hash(userPassword, 10);
        }

        // Blocking an account that is already blocked leaves the date it was applied on
        // alone, so a second click never reads as a fresh block.
        if (hasBanned) {
            user.bannedAt = req.body.isBanned ? (user.bannedAt || new Date()) : null;
        }

        await user.save();

        // A block takes hold at once rather than whenever the open tab happens to reload:
        // the session on the account is closed with the same stroke, so the next request
        // it makes signs it out and the login it lands on is the one that turns it away.
        if (hasBanned && user.bannedAt) {
            await User.updateOne({ _id: user._id }, { $set: { activeSessionId: null } });
            await LoginHistory.closeOpenSessions('user', user._id, 'blocked');
        }

        if (hasPhone && oldPhone !== user.phone) {
            await Course.updateMany(
                { allowedUserPhones: oldPhone },
                { $addToSet: { allowedUserPhones: user.phone } }
            );
            await Course.updateMany(
                { allowedUserPhones: oldPhone },
                { $pull: { allowedUserPhones: oldPhone } }
            );
            await Course.updateMany(
                { 'accessGrants.phone': oldPhone },
                { $set: { 'accessGrants.$[grant].phone': user.phone } },
                { arrayFilters: [{ 'grant.phone': oldPhone }] }
            );
        }

        // The row this replaces in the users table carries the standing too, and a
        // changed phone has just moved its grants, so it is read back afterwards.
        return res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: { user: formatUserData(user, await isUserPhoneActive(user.phone)) }
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
            message: 'Something went wrong while updating user',
            data: {}
        });
    }
};

const deleteUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUserId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
                data: {}
            });
        }

        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                data: {}
            });
        }

        await Course.updateMany(
            { allowedUserPhones: user.phone },
            { $pull: { allowedUserPhones: user.phone } }
        );
        await Course.updateMany(
            { 'accessGrants.phone': user.phone },
            { $pull: { accessGrants: { phone: user.phone } } }
        );
        await LoginHistory.clearAccountHistory('user', user._id);
        // Their reviews go with the account: a showcased one is on a page the whole
        // internet can read, and nobody is left to stand behind it.
        await Review.deleteMany({ userId: user._id });

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            data: {}
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting user',
            data: {}
        });
    }
};

const getUserLoginHistoryByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUserId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
                data: {}
            });
        }

        const user = await User.findById(id).select('name phone profile bannedAt');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                data: {}
            });
        }

        const [history, isActive] = await Promise.all([
            LoginHistory.getAccountHistory('user', user._id),
            isUserPhoneActive(user.phone)
        ]);

        return res.status(200).json({
            success: true,
            message: 'User login history fetched successfully',
            data: {
                user: formatUserData(user, isActive),
                history
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching user login history',
            data: {}
        });
    }
};

module.exports = {
    loginAdmin,
    logoutAdmin,
    getAdminProfile,
    getAdminAlertCounts,
    getAllUsersByAdmin,
    createUserByAdmin,
    bulkCreateUsersByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    getUserLoginHistoryByAdmin,
    formatUserData,
    getGeneratedPassword,
    prepareNewUserInput,
    MAX_BULK_USERS,
    getActiveAdminSessionId: () => activeAdminSessionId
};
