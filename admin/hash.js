const bcrypt = require("bcryptjs");

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(`Hashed Password: ${hashedPassword}`);
};

// Hash passwords
hashPassword("Admin@123"); // Hash for Admin
hashPassword("Editor@123"); // Hash for Editor
