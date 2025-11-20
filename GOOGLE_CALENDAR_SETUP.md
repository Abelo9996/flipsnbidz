# Add Google Calendar Link to EmailJS Templates

## Overview
The appointment emails now include a `{{calendar_link}}` variable that contains a Google Calendar link. You need to update your EmailJS templates to display this link as a button.

## Update Customer Confirmation Template

1. **Go to**: https://dashboard.emailjs.com/admin/templates
2. **Find**: `template_wajtgop` (Customer confirmation template)
3. **Click**: Edit

### Add this HTML button to the email body:

Find the section with appointment details and add this **after** the appointment information:

```html
<div style="text-align: center; margin: 30px 0;">
    <a href="{{calendar_link}}" 
       style="display: inline-block; 
              background: #4285f4; 
              color: white; 
              padding: 15px 30px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold;
              font-size: 16px;">
        📅 Add to Google Calendar
    </a>
</div>

<p style="color: #666; font-size: 14px; text-align: center;">
    Click the button above to automatically add this appointment to your Google Calendar
</p>
```

### Full Customer Email Template Example:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0;">Appointment Confirmed! ✓</h1>
    </div>
    
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello {{firstName}},</p>
        
        <p>Thank you for scheduling an appointment with <strong>Flips & Bidz Liquidation Auctions!</strong></p>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb;">
            <h3 style="margin-top: 0; color: #2563eb;">Appointment Details</h3>
            <p><strong>Date:</strong> {{date}}</p>
            <p><strong>Time:</strong> {{time}} (15 minutes)</p>
            <p><strong>Name:</strong> {{firstName}} {{lastName}}</p>
            <p><strong>Phone:</strong> {{phone}}</p>
        </div>
        
        <p><strong>Location:</strong><br>
        15300 Valley View Avenue<br>
        La Mirada, CA 90638</p>
        
        <!-- Google Calendar Button -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{calendar_link}}" 
               style="display: inline-block; 
                      background: #4285f4; 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold;
                      font-size: 16px;">
                📅 Add to Google Calendar
            </a>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center;">
            Click the button above to automatically add this appointment to your Google Calendar
        </p>
        
        <p>We look forward to seeing you! If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="https://flipsandbidz.com" 
               style="display: inline-block; 
                      background: #2563eb; 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 5px;">
                Visit Our Website
            </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
            <p>Questions? Contact us at (626) 944-3190 or flipsnbidz@gmail.com</p>
            <p>&copy; 2025 Flips & Bidz. All rights reserved.</p>
        </div>
    </div>
</div>
```

## Update Business Notification Template

1. **Find**: `template_4o85tnx` (Business notification template)
2. **Click**: Edit

### Add this link to the business email:

Add this after the customer information:

```html
<p>
    <strong>Quick Actions:</strong><br>
    <a href="{{calendar_link}}" style="color: #2563eb; text-decoration: underline;">
        📅 Add to your Calendar
    </a>
</p>
```

### Full Business Email Template Example:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">🔔 New Appointment Booking</h2>
    </div>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 0 0 8px 8px;">
        <h3>Customer Information:</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 10px 0; font-weight: bold; width: 150px;">Customer:</td>
                <td style="padding: 10px 0;">{{firstName}} {{lastName}}</td>
            </tr>
            <tr style="background: #fef3c7;">
                <td style="padding: 10px 0; font-weight: bold;">Email:</td>
                <td style="padding: 10px 0;"><a href="mailto:{{email}}">{{email}}</a></td>
            </tr>
            <tr>
                <td style="padding: 10px 0; font-weight: bold;">Phone:</td>
                <td style="padding: 10px 0;"><a href="tel:{{phone}}">{{phone}}</a></td>
            </tr>
            <tr style="background: #fef3c7;">
                <td style="padding: 10px 0; font-weight: bold;">Date:</td>
                <td style="padding: 10px 0;">{{date}}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; font-weight: bold;">Time:</td>
                <td style="padding: 10px 0;">{{time}}</td>
            </tr>
            <tr style="background: #fef3c7;">
                <td style="padding: 10px 0; font-weight: bold;">Referral Source:</td>
                <td style="padding: 10px 0;">{{referralSource}}</td>
            </tr>
        </table>
        
        <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px;">
            <strong>Quick Actions:</strong><br>
            <a href="{{calendar_link}}" 
               style="display: inline-block; 
                      margin-top: 10px;
                      background: #4285f4; 
                      color: white; 
                      padding: 10px 20px; 
                      text-decoration: none; 
                      border-radius: 5px;">
                📅 Add to Calendar
            </a>
        </div>
    </div>
</div>
```

## What the Calendar Link Does

When clicked, the Google Calendar link will:
1. ✅ Open Google Calendar (web or app)
2. ✅ Pre-fill the event with:
   - **Title**: "Appointment at Flips & Bidz Liquidation Auctions"
   - **Date & Time**: Appointment date and time
   - **Duration**: 15 minutes
   - **Location**: 15300 Valley View Ave, La Mirada, CA 90638
   - **Description**: Customer details and contact info
3. ✅ Allow the user to click "Save" to add to their calendar

## Benefits

✅ **For Customers:**
- One-click calendar reminders
- No manual entry needed
- Works with Google Calendar, which syncs to phones
- Reduces no-shows

✅ **For You:**
- Easy to add to your business calendar
- All appointment details included
- Customer contact info in event description

## Test It

1. Book a test appointment on your website
2. Check the confirmation email
3. Click the "Add to Google Calendar" button
4. Verify the event details are correct
5. Save to your calendar

## Troubleshooting

**Link doesn't work?**
- Make sure `{{calendar_link}}` variable is in your template
- Check that the code has been deployed to Vercel

**Wrong date/time?**
- The system uses the date format from the appointment form
- Time is automatically converted to 24-hour format
- Duration is set to 15 minutes

**Link too long?**
- Google Calendar URLs can be long, that's normal
- EmailJS will handle it correctly

## Deploy Changes

Commit and push:
```bash
git add appointment-script.js
git commit -m "Add Google Calendar link to appointment emails"
git push
```

Vercel will automatically deploy!
