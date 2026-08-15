const express = require('express');
const {
    getShowcasedContents,
    getAllContents,
    createContentByAdmin,
    updateContentByAdmin,
    deleteContentByAdmin,
    setContentShowcaseByAdmin
} = require('../controllers/content.controller');

// Showcased content is read by visitors who have not signed in, so that router stays
// public. Writing it is the admin's alone, and the faculty read the library behind
// it, so each of those sits behind its role middleware.
const publicContentRoutes = express.Router();
const facultyContentRoutes = express.Router();
const adminContentRoutes = express.Router();

publicContentRoutes.get('/', getShowcasedContents);

facultyContentRoutes.get('/', getAllContents);

adminContentRoutes.get('/', getAllContents);
adminContentRoutes.post('/', createContentByAdmin);
adminContentRoutes.patch('/:contentId/showcase', setContentShowcaseByAdmin);
adminContentRoutes.patch('/:contentId', updateContentByAdmin);
adminContentRoutes.delete('/:contentId', deleteContentByAdmin);

module.exports = {
    publicContentRoutes,
    facultyContentRoutes,
    adminContentRoutes
};
