const mongoose = require('mongoose');
const Attendance = require('../models/attendance.model');
const User = require('../models/user.model');
const { getActiveUserPhones } = require('./course.controller');

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// How many months the student's own attendance page charts, the visible month included.
const TREND_MONTHS = 6;

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

// Months are plain YYYY-MM strings here too, so walking back a few of them is
// arithmetic on the month number instead of a Date that could shift a timezone.
const shiftMonthKey = (monthKey, delta) => {
    const [year, month] = monthKey.split('-').map(Number);
    const monthIndex = (year * 12) + (month - 1) + delta;

    return `${Math.floor(monthIndex / 12)}-${String((monthIndex % 12) + 1).padStart(2, '0')}`;
};

// A month with no attendance still gets a slot, so the chart keeps a fixed number
// of columns and an empty month reads as empty instead of disappearing.
const buildAttendanceTrend = (rows, endMonth, monthCount = TREND_MONTHS) => {
    const countsByMonth = new Map();

    rows.forEach((row) => {
        const monthKey = row?._id?.month;
        const status = row?._id?.status;

        if (!MONTH_KEY_PATTERN.test(String(monthKey)) || !Attendance.STATUSES.includes(status)) {
            return;
        }

        const counts = countsByMonth.get(monthKey) || {};

        counts[status] = (counts[status] || 0) + (row.count || 0);
        countsByMonth.set(monthKey, counts);
    });

    return Array.from({ length: monthCount }, (item, index) => {
        const month = shiftMonthKey(endMonth, index - (monthCount - 1));
        const counts = countsByMonth.get(month) || {};

        return {
            month,
            present: counts.present || 0,
            absent: counts.absent || 0
        };
    });
};

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

// The same handlers serve the admin and the faculty attendance pages, so who is
// marking is read from the request instead of from the body.
const getMarker = (req) => {
    if (req.admin) {
        return { role: 'admin', name: 'Admin', facultyId: null };
    }

    if (req.faculty?._id) {
        return {
            role: 'faculty',
            name: req.faculty.name || 'Faculty',
            facultyId: req.faculty._id
        };
    }

    return null;
};

// Only the admin is allowed to read who marked a day back, so the fields are left
// off the faculty payload rather than hidden in the browser.
const formatAttendanceData = (record, includeMarkedBy) => ({
    _id: record._id.toString(),
    user: record.user.toString(),
    date: record.date,
    status: record.status,
    ...(includeMarkedBy
        ? { markedByRole: record.markedByRole, markedByName: record.markedByName }
        : {}),
    updatedAt: record.updatedAt
});

// The roster is read once per page, so the courses are read once beside it and the
// whole list is split into the students who are still enrolled and the ones who are
// not, without a query per student.
const getStudentsForAttendance = async (req, res) => {
    try {
        const [students, activePhones] = await Promise.all([
            User.find({}).select('name phone bannedAt').sort({ name: 1 }).lean(),
            getActiveUserPhones()
        ]);

        return res.status(200).json({
            success: true,
            message: 'Students fetched successfully',
            data: {
                students: students.map((student) => ({
                    _id: student._id.toString(),
                    name: student.name || '',
                    phone: student.phone,
                    isActive: activePhones.has(student.phone),
                    // A blocked student still belongs on the roster — they are still on the
                    // course and can still sit in the room — so the badge beside the name
                    // says it here too rather than only in the admin table.
                    isBanned: Boolean(student.bannedAt)
                }))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching students');
    }
};

// One read per visible month. Passing a userId narrows it to a single student,
// which is what the attendance view on the admin users list asks for.
const getMonthAttendance = async (req, res) => {
    try {
        const month = String(req.query?.month || '').trim();
        const userId = String(req.query?.userId || '').trim();

        if (!MONTH_KEY_PATTERN.test(month)) {
            return sendError(res, 400, 'Month must be sent as YYYY-MM');
        }

        if (userId && !isValidObjectId(userId)) {
            return sendError(res, 400, 'Invalid student id');
        }

        const query = { date: { $gte: `${month}-01`, $lte: `${month}-31` } };

        if (userId) {
            query.user = userId;
        }

        const records = await Attendance.find(query).sort({ date: 1 }).lean();

        return res.status(200).json({
            success: true,
            message: 'Attendance fetched successfully',
            data: {
                month,
                attendance: records.map((record) => formatAttendanceData(record, Boolean(req.admin)))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching attendance');
    }
};

// Create and update are the same action here: a student has one record per day, so
// marking a day that is already marked rewrites it and restamps who marked it.
const markAttendance = async (req, res) => {
    try {
        const marker = getMarker(req);

        if (!marker) {
            return sendError(res, 401, 'Attendance can only be marked by an admin or a faculty');
        }

        const userId = String(req.body?.userId || '').trim();
        const date = String(req.body?.date || '').trim();
        const status = String(req.body?.status || '').trim();

        if (!isValidObjectId(userId)) {
            return sendError(res, 400, 'Invalid student id');
        }

        if (!Attendance.DATE_KEY_PATTERN.test(date)) {
            return sendError(res, 400, 'Date must be sent as YYYY-MM-DD');
        }

        if (!Attendance.STATUSES.includes(status)) {
            return sendError(res, 400, `Status must be one of: ${Attendance.STATUSES.join(', ')}`);
        }

        const student = await User.findById(userId).select('_id');

        if (!student) {
            return sendError(res, 404, 'Student not found');
        }

        const record = await Attendance.findOneAndUpdate(
            { user: userId, date },
            {
                $set: {
                    status,
                    markedByRole: marker.role,
                    markedByName: marker.name,
                    markedByFaculty: marker.facultyId
                }
            },
            { returnDocument: 'after', upsert: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Attendance marked successfully',
            data: { attendance: formatAttendanceData(record, Boolean(req.admin)) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'Attendance for this student and day already exists');
        }

        return sendError(res, 500, 'Something went wrong while marking attendance');
    }
};

// The student reads his own month only: the id comes from his token, never from
// the query, so no student can ask for somebody else's attendance. Who marked the
// day stays off the payload here, exactly as it does for a faculty.
const getMyAttendance = async (req, res) => {
    try {
        const month = String(req.query?.month || '').trim();
        const userId = req.user?._id;

        if (!userId) {
            return sendError(res, 401, 'Attendance is only available to a signed in student');
        }

        if (!MONTH_KEY_PATTERN.test(month)) {
            return sendError(res, 400, 'Month must be sent as YYYY-MM');
        }

        const trendStart = shiftMonthKey(month, -(TREND_MONTHS - 1));

        // The visible month is read in full for the calendar; the months behind it
        // are only ever charted as totals, so they are counted in the database.
        const [records, trendRows] = await Promise.all([
            Attendance.find({
                user: userId,
                date: { $gte: `${month}-01`, $lte: `${month}-31` }
            }).sort({ date: 1 }).lean(),
            Attendance.aggregate([
                {
                    $match: {
                        user: new mongoose.Types.ObjectId(userId),
                        date: { $gte: `${trendStart}-01`, $lte: `${month}-31` }
                    }
                },
                {
                    $group: {
                        _id: { month: { $substrBytes: ['$date', 0, 7] }, status: '$status' },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        return res.status(200).json({
            success: true,
            message: 'Attendance fetched successfully',
            data: {
                month,
                attendance: records.map((record) => formatAttendanceData(record, false)),
                trend: buildAttendanceTrend(trendRows, month)
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching attendance');
    }
};

const deleteAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.params;

        if (!isValidObjectId(attendanceId)) {
            return sendError(res, 400, 'Invalid attendance id');
        }

        const record = await Attendance.findByIdAndDelete(attendanceId);

        if (!record) {
            return sendError(res, 404, 'Attendance record not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Attendance removed successfully',
            data: { attendanceId: record._id.toString() }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while removing attendance');
    }
};

module.exports = {
    getStudentsForAttendance,
    getMonthAttendance,
    getMyAttendance,
    markAttendance,
    deleteAttendance,
    formatAttendanceData,
    buildAttendanceTrend,
    shiftMonthKey,
    TREND_MONTHS
};
