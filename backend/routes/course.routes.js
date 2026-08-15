const express = require('express');
const {
    getAllCoursesByAdmin,
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
    syncChapterVideosByAdmin
} = require('../controllers/course.controller');
const {
    createNoteByAdmin,
    getNoteByAdmin,
    updateNoteByAdmin,
    deleteNoteByAdmin,
    syncNoteByAdmin
} = require('../controllers/note.controller');

const router = express.Router();

router.get('/', getAllCoursesByAdmin);
router.post('/', createCourseByAdmin);
router.get('/:courseId/access', getCourseAccessByAdmin);
router.put('/:courseId/access', replaceCourseAccessByAdmin);
router.post('/:courseId/access', addCourseAccessByAdmin);
router.patch('/:courseId/access', setCourseAccessExpiryByAdmin);
router.delete('/:courseId/access', removeCourseAccessByAdmin);
router.get('/:courseId', getCourseByAdmin);
router.patch('/:courseId', updateCourseByAdmin);
router.delete('/:courseId', deleteCourseByAdmin);

router.get('/:courseId/chapters', getChaptersByAdmin);
router.post('/:courseId/chapters', createChapterByAdmin);
router.patch('/:courseId/chapters/:chapterId', updateChapterByAdmin);
router.delete('/:courseId/chapters/:chapterId', deleteChapterByAdmin);
router.post('/:courseId/chapters/:chapterId/sync-videos', syncChapterVideosByAdmin);

router.get('/:courseId/notes', getNoteByAdmin);
router.post('/:courseId/notes', createNoteByAdmin);
router.put('/:courseId/notes', updateNoteByAdmin);
router.delete('/:courseId/notes', deleteNoteByAdmin);
router.post('/:courseId/notes/sync', syncNoteByAdmin);

module.exports = router;
