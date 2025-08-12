
require('dotenv').config();
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Create SuperAdmin if not exists
    const createSuperAdmin = async () => {
      const User = require('./models/user');
      const bcrypt = require('bcryptjs');
      const superAdminUsername = 'SuperAdmin';
      const superAdminPassword = 'Password123';

      let superAdmin = await User.findOne({ username: superAdminUsername });
      if (!superAdmin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(superAdminPassword, salt);
        superAdmin = new User({
          username: superAdminUsername,
          password: hashedPassword,
          role: 'SuperAdmin',
          isTemporaryPassword: false // SuperAdmin does not have a temporary password
        });
        await superAdmin.save();
        console.log('SuperAdmin created.');
      }
    };
    createSuperAdmin();
  })
  .catch(err => console.log(err));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/submit', require('./routes/submit'));
app.use('/api/auth', require('./routes/auth'));

app.get('/', (req, res) => {
  res.send('FX Watchdog API');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
