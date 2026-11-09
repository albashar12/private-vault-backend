const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());

// MongoDB Atlas Connection
const MONGO_URI = "mongodb+srv://albashar570_db_user:0oV13PrxQjqXuMdH@cluster0.fzhjgh6.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully!"))
    .catch(err => console.log("Connection Error: ", err));

// User Schema with Admin & Storage limits
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    maxStorageBytes: { type: Number, default: 10 * 1024 * 1024 * 1024 }, // 10 GB Default Free
    isAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// 1. Register API (First user automatically becomes Admin)
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userCount = await User.countDocuments();
        const isFirstUser = userCount === 0;

        await User.create({ email, password, isAdmin: isFirstUser });
        
        res.json({ 
            success: true, 
            message: isFirstUser ? "Admin account created with 10GB!" : "Account created with 10GB!", 
            isAdmin: isFirstUser 
        });
    } catch (e) {
        res.status(400).json({ success: false, message: "Email already exists!" });
    }
});

// 2. Login API (Returns whether user is Admin)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials!" });
    
    res.json({ 
        success: true, 
        storageLimit: user.maxStorageBytes,
        isAdmin: user.isAdmin 
    });
});

// 3. Admin API: Set any custom storage limit for a user
app.post('/api/admin/set-storage', async (req, res) => {
    try {
        const { adminEmail, targetEmail, gbAmount, mode } = req.body;

        const adminUser = await User.findOne({ email: adminEmail, isAdmin: true });
        if (!adminUser) {
            return res.status(403).json({ success: false, message: "Access Denied: Only Admin can change storage!" });
        }

        const gb = Number(gbAmount);
        if (isNaN(gb) || gb < 0) {
            return res.status(400).json({ success: false, message: "Please enter a valid storage limit in GB!" });
        }

        const targetUser = await User.findOne({ email: targetEmail });
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Target user email not found!" });
        }

        const bytes = gb * 1024 * 1024 * 1024;
        if (mode === "add") {
            targetUser.maxStorageBytes += bytes;
        } else {
            targetUser.maxStorageBytes = bytes;
        }
        await targetUser.save();

        res.json({
            success: true,
            message: `Success! ${targetEmail} now has ${gb} GB drive storage.`
        });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error: " + e.message });
    }
});

// Render-er dynamic port ba local 3000 port support korbe
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Free Vault Server running on port ${PORT}`));
