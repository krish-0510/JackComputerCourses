const express = require('express');
const {
    loginAdmin,
    logoutAdmin,
    getAdminProfile,
    getAdminAlertCounts,
    getAllUsersByAdmin,
    createUserByAdmin,
    bulkCreateUsersByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    getUserLoginHistoryByAdmin
} = require('../controllers/admin.controller');
const {
    getAllFacultiesByAdmin,
    createFacultyByAdmin,
    updateFacultyByAdmin,
    deleteFacultyByAdmin,
    getFacultyLoginHistoryByAdmin
} = require('../controllers/faculty.controller');
const { getUserCoursesByAdmin } = require('../controllers/course.controller');
const { getAllNotesByAdmin } = require('../controllers/note.controller');
const authAdmin = require('../middlewares/admin.middleware');
const { staffAttendanceRoutes } = require('./attendance.routes');
const courseRoutes = require('./course.routes');
const { adminTopicNoteRoutes } = require('./topicNote.routes');
const { adminBugRoutes } = require('./bug.routes');
const { adminReviewRoutes } = require('./review.routes');
const { adminContentRoutes } = require('./content.routes');
const { adminPasswordRequestRoutes } = require('./passwordRequest.routes');

const router = express.Router();

router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.get('/profile', authAdmin, getAdminProfile);
router.get('/alerts', authAdmin, getAdminAlertCounts);
router.get('/users', authAdmin, getAllUsersByAdmin);
router.post('/users', authAdmin, createUserByAdmin);
router.post('/users/bulk', authAdmin, bulkCreateUsersByAdmin);
router.get('/users/:id/login-history', authAdmin, getUserLoginHistoryByAdmin);
router.get('/users/:id/courses', authAdmin, getUserCoursesByAdmin);
router.patch('/users/:id', authAdmin, updateUserByAdmin);
router.delete('/users/:id', authAdmin, deleteUserByAdmin);
router.get('/faculties', authAdmin, getAllFacultiesByAdmin);
router.post('/faculties', authAdmin, createFacultyByAdmin);
router.get('/faculties/:id/login-history', authAdmin, getFacultyLoginHistoryByAdmin);
router.patch('/faculties/:id', authAdmin, updateFacultyByAdmin);
router.delete('/faculties/:id', authAdmin, deleteFacultyByAdmin);
router.use('/attendance', authAdmin, staffAttendanceRoutes);
router.use('/courses', authAdmin, courseRoutes);
router.get('/notes', authAdmin, getAllNotesByAdmin);
router.use('/password-requests', authAdmin, adminPasswordRequestRoutes);
router.use('/topic-notes', authAdmin, adminTopicNoteRoutes);
router.use('/bugs', authAdmin, adminBugRoutes);
router.use('/reviews', authAdmin, adminReviewRoutes);
router.use('/contents', authAdmin, adminContentRoutes);

module.exports = router;
