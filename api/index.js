const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }
    
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    
    cachedDb = connection;
    return connection;
}

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    referralSource: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create compound index for date and time to ensure uniqueness
appointmentSchema.index({ date: 1, time: 1 }, { unique: true });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

// Gmail API OAuth2 Setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Helper function to create email in RFC 2822 format
function createEmail(to, from, subject, htmlBody) {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
        `From: Flips & Bidz <${from}>`,
        `To: ${to}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        htmlBody
    ];
    const message = messageParts.join('\n');
    
    // Encode the message in base64url format
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    
    return encodedMessage;
}

// Helper function to send emails via Gmail API
async function sendAppointmentEmails(appointmentData) {
    const { firstName, lastName, email, phone, date, time, referralSource } = appointmentData;
    const fromEmail = process.env.GMAIL_USER || 'flipsnbidz@gmail.com';
    
    // Customer email HTML
    const customerHtml = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
        .info-row { margin: 10px 0; }
        .label { font-weight: bold; color: #2563eb; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Appointment Confirmed!</h1>
        </div>
        <div class="content">
            <p>Hello ${firstName},</p>
            <p>Thank you for scheduling an appointment with Flips & Bidz Liquidation Auctions!</p>
            
            <div class="info-box">
                <h3 style="margin-top: 0; color: #2563eb;">Appointment Details</h3>
                <div class="info-row">
                    <span class="label">Date:</span> ${date}
                </div>
                <div class="info-row">
                    <span class="label">Time:</span> ${time}
                </div>
                <div class="info-row">
                    <span class="label">Name:</span> ${firstName} ${lastName}
                </div>
                <div class="info-row">
                    <span class="label">Phone:</span> ${phone}
                </div>
            </div>
            
            <p><strong>Location:</strong><br>
            15300 Valley View Avenue<br>
            La Mirada, CA 90638</p>
            
            <p>We look forward to seeing you! If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
            
            <a href="https://flipsandbidz.com" class="button">Visit Our Website</a>
            
            <div class="footer">
                <p>Questions? Contact us at (626) 944-3190 or flipsnbidz@gmail.com</p>
                <p>&copy; 2025 Flips & Bidz. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
    
    // Business notification email HTML
    const businessHtml = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #fffbeb; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin: 20px 0; }
        .label { font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔔 New Appointment Booking</h2>
        </div>
        <div class="content">
            <div class="info-grid">
                <div class="label">Customer:</div>
                <div>${firstName} ${lastName}</div>
                
                <div class="label">Email:</div>
                <div><a href="mailto:${email}">${email}</a></div>
                
                <div class="label">Phone:</div>
                <div><a href="tel:${phone}">${phone}</a></div>
                
                <div class="label">Date:</div>
                <div>${date}</div>
                
                <div class="label">Time:</div>
                <div>${time}</div>
                
                <div class="label">Referral Source:</div>
                <div>${referralSource || 'Not specified'}</div>
            </div>
        </div>
    </div>
</body>
</html>`;
    
    try {
        // Send customer confirmation email
        const customerEmail = createEmail(
            email,
            fromEmail,
            'Appointment Confirmation - Flips & Bidz',
            customerHtml
        );
        
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: customerEmail
            }
        });
        
        console.log(`✅ Customer email sent to ${email}`);
        
        // Send business notification email
        const businessEmail = createEmail(
            fromEmail,
            fromEmail,
            `New Appointment: ${date} at ${time}`,
            businessHtml
        );
        
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: businessEmail
            }
        });
        
        console.log(`✅ Business notification sent to ${fromEmail}`);
        
        return { success: true };
    } catch (error) {
        console.error('Gmail API error:', error);
        return { success: false, error: error.message };
    }
}

// API Routes

// Create new appointment
app.post('/api/appointments', async (req, res) => {
    try {
        await connectToDatabase();
        
        const appointmentData = req.body;
        
        // Check if slot is already taken
        const existingAppointment = await Appointment.findOne({
            date: appointmentData.date,
            time: appointmentData.time,
            status: { $ne: 'cancelled' }
        });
        
        if (existingAppointment) {
            return res.status(409).json({
                success: false,
                message: 'This time slot is already booked. Please select another time.'
            });
        }
        
        // Create new appointment
        const appointment = new Appointment(appointmentData);
        await appointment.save();
        
        // Send confirmation emails
        const emailResult = await sendAppointmentEmails(appointmentData);
        
        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully!',
            appointment: appointment,
            emailSent: emailResult.success
        });
        
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to book appointment',
            error: error.message
        });
    }
});

// Get all appointments (for admin)
app.get('/api/appointments', async (req, res) => {
    try {
        await connectToDatabase();
        
        const appointments = await Appointment.find()
            .sort({ date: 1, time: 1 });
        
        res.json({
            success: true,
            count: appointments.length,
            appointments: appointments
        });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message
        });
    }
});

// Get available time slots for a specific date
app.get('/api/appointments/availability/:date', async (req, res) => {
    try {
        await connectToDatabase();
        
        const { date } = req.params;
        
        // Get all booked appointments for this date
        const bookedAppointments = await Appointment.find({
            date: date,
            status: { $ne: 'cancelled' }
        }).select('time');
        
        const bookedTimes = bookedAppointments.map(apt => apt.time);
        
        res.json({
            success: true,
            date: date,
            bookedTimes: bookedTimes
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check availability',
            error: error.message
        });
    }
});

// Get single appointment by ID
app.get('/api/appointments/:id', async (req, res) => {
    try {
        await connectToDatabase();
        
        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }
        
        res.json({
            success: true,
            appointment: appointment
        });
    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointment',
            error: error.message
        });
    }
});

// Update appointment status
app.patch('/api/appointments/:id', async (req, res) => {
    try {
        await connectToDatabase();
        
        const { status, notes } = req.body;
        
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status, notes },
            { new: true, runValidators: true }
        );
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Appointment updated successfully',
            appointment: appointment
        });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update appointment',
            error: error.message
        });
    }
});

// Delete appointment
app.delete('/api/appointments/:id', async (req, res) => {
    try {
        await connectToDatabase();
        
        const appointment = await Appointment.findByIdAndDelete(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Appointment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete appointment',
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await connectToDatabase();
        res.json({
            success: true,
            message: 'Server is running',
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            emailProvider: 'Gmail API'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Export the Express app as a serverless function
module.exports = app;
