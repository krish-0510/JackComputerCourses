const express = require('express');
const {
    loginFaculty,
    logoutFaculty,
    getFacultyProfile,
    completeFacultyTour
} = require('../controllers/faculty.controller');
const {
    getCoursesByFaculty,
    getCourseByFaculty,
    saveCourseProgressByFaculty,
    getCourseVideoEmbedByFaculty
} = require('../controllers/course.controller');
const { getAllNotesByFaculty, getNoteByFaculty } = require('../controllers/note.controller');
const authFaculty = require('../middlewares/faculty.middleware');
const { staffAttendanceRoutes } = require('./attendance.routes');
const workspaceRoutes = require('./workspace.routes');
const ideShareRoutes = require('./ideShare.routes');
const { facultyQueryRoutes } = require('./query.routes');
const { facultyTopicNoteRoutes } = require('./topicNote.routes');
const { reporterBugRoutes } = require('./bug.routes');
const { facultyContentRoutes } = require('./content.routes');

const router = express.Router();

router.post('/login', loginFaculty);
router.post('/logout', logoutFaculty);
router.get('/profile', authFaculty, getFacultyProfile);
router.patch('/tour', authFaculty, completeFacultyTour);
router.use('/attendance', authFaculty, staffAttendanceRoutes);
router.use('/workspace', authFaculty, workspaceRoutes);
router.use('/ide-share', authFaculty, ideShareRoutes);
router.use('/', authFaculty, facultyQueryRoutes);
router.use('/topic-notes', authFaculty, facultyTopicNoteRoutes);
router.use('/bugs', authFaculty, reporterBugRoutes);
router.use('/contents', authFaculty, facultyContentRoutes);
router.get('/notes', authFaculty, getAllNotesByFaculty);
router.get('/courses', authFaculty, getCoursesByFaculty);
router.get(
    '/courses/:courseId/chapters/:chapterId/videos/:videoPosition/embed',
    authFaculty,
    getCourseVideoEmbedByFaculty
);
router.get('/courses/:courseId/notes', authFaculty, getNoteByFaculty);
router.put('/courses/:courseId/progress', authFaculty, saveCourseProgressByFaculty);
router.get('/courses/:courseId', authFaculty, getCourseByFaculty);

module.exports = router;
