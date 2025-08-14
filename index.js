const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const config = require('./config');
const logger = require('./utils/logger');

const app = express();
const port = config.port;

app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose
  .connect(config.mongoURI)
  .then(() => {
    logger.info('MongoDB connected');
    // Create SuperAdmin if not exists
    const createSuperAdmin = async () => {
      const superAdminUsername = 'SuperAdmin';
      const superAdminEmail = 'superadmin@example.com';
      const superAdminPassword = 'Password123';

      let superAdmin = await User.findOne({ username: superAdminUsername });
      if (!superAdmin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(superAdminPassword, salt);
        superAdmin = new User({
          username: superAdminUsername,
          email: superAdminEmail,
          password: hashedPassword,
          role: 'SuperAdmin',
          isTemporaryPassword: false, // SuperAdmin does not have a temporary password
        });
        await superAdmin.save();
        logger.info('SuperAdmin created.');
      }
    };
    createSuperAdmin();
  })
  .catch((err) => logger.error(err));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/submit', require('./routes/submit'));
app.use('/api/auth', require('./routes/auth'));

app.get('/', (req, res) => {
  res.send('FX Watchdog API');
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ status: 'UP', message: 'Database connected' });
  } else {
    res.status(500).json({ status: 'DOWN', message: 'Database disconnected' });
  }
});

// Error Handling Middleware
app.use(require('./middleware/errorHandler'));

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
