require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB...');

    // Update ALL users with role='patient' to role='doctor'
    const result = await User.updateMany({ role: 'patient' }, { $set: { role: 'doctor' } });
    console.log(`✅ Updated ${result.modifiedCount} user(s) to role=doctor`);

    // Show all users now
    const users = await User.find({}, 'name email role');
    console.log('\nAll users in DB:');
    users.forEach(u => console.log(`  - ${u.name} | ${u.email} | role: ${u.role}`));

    mongoose.disconnect();
    console.log('\nDone!');
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
