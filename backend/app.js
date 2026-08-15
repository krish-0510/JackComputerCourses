const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;
const cors = require('cors');
const cookieParser = require('cookie-parser');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const facultyRoutes = require('./routes/faculty.routes');
const ideShareRoutes = require('./routes/ideShare.routes');
const { publicReviewRoutes } = require('./routes/review.routes');
const { publicContentRoutes } = require('./routes/content.routes');
const { streamDriveFile } = require('./controllers/drive.controller');

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(cookieParser());

// CONNECTION TO DATABASE
const connectToDb = require('./db/db');
const { backfillCourseDurations } = require('./controllers/course.controller');

connectToDb()
    .then(() => backfillCourseDurations())
    .then(({ chapterCount, courseCount }) => {
        if (chapterCount || courseCount) {
            console.log(`backfilled durations for ${chapterCount} chapters and ${courseCount} courses`);
        }
    })
    .catch((error) => {
        console.log('error in course duration backfill: ', error);
    });

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Backend is running',
        data: {}
    });
});

app.use('/admin', adminRoutes);
app.use('/user', userRoutes);
app.use('/faculty', facultyRoutes);
app.use('/ide-share', ideShareRoutes);
// The landing page is read by visitors who have not signed in, so the reviews it
// showcases are served without a session — and so is the catalogue it links to.
app.use('/reviews', publicReviewRoutes);
app.use('/contents', publicContentRoutes);
app.get('/drive-files/:fileId', streamDriveFile);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        data: {}
    });
});

app.use((error, req, res, next) => {
    const statusCode = error.statusCode || error.status || 500;

    res.status(statusCode).json({
        success: false,
        message: statusCode >= 500 ? 'Internal server error' : error.message,
        data: {}
    });
});

const http = require('http');
const { Server } = require('socket.io');
const { initSocket } = require('./services/socket.service');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true
    }
});

initSocket(io);

if (require.main === module) {
    server.listen(PORT, (error) => {
        if (error) {
            console.log('error in server connection: ', error);
            return;
        }

        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
