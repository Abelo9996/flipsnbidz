# Contact Form EmailJS Setup

## Create Email Template in EmailJS

1. **Go to EmailJS Dashboard**: https://dashboard.emailjs.com/admin/templates

2. **Click "Create New Template"**

3. **Fill in the template details**:
   - **Template Name**: `Contact Form Submission`
   - **Template ID**: `template_contact` (MUST be exactly this)

4. **Email Template Content**:

### Subject Line:
```
New Contact Form Message from {{name}}
```

### Email Body:
```
You have received a new message from your website contact form!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTACT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: {{name}}
Email: {{email}}
Phone: {{phone}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MESSAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{message}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This message was sent from the contact form at flipsandbidz.com

To reply to this inquiry, simply respond directly to: {{email}}
```

5. **Settings**:
   - **To Email**: `{{to_email}}` (this will be flipsnbidz@gmail.com)
   - **From Name**: `Flips & Bidz Contact Form`
   - **From Email**: Use your configured sender email
   - **Reply To**: `{{email}}` (so you can reply directly to the customer)

6. **Click "Save"**

## Test the Contact Form

After creating the template:

1. Go to your website: `https://flipsandbidz.com`
2. Scroll to the Contact section
3. Fill out the form with test data
4. Click "Send Message"
5. You should see a green success notification
6. Check `flipsnbidz@gmail.com` inbox - you should receive the email!

## What Happens When Form is Submitted

1. ✅ User fills out the contact form
2. ✅ Button shows "Sending..." and is disabled
3. ✅ Email is sent to flipsnbidz@gmail.com via EmailJS
4. ✅ Success notification appears
5. ✅ Form is reset
6. ✅ Button returns to normal state

## If There's an Error

If email sending fails:
- ❌ Error notification appears
- ❌ Form is NOT reset (user can try again)
- ❌ Console shows error details
- ℹ️ User is told to email directly

## Template Variables Used

- `{{name}}` - Customer's name
- `{{email}}` - Customer's email address
- `{{phone}}` - Customer's phone number
- `{{message}}` - Customer's message text
- `{{to_email}}` - Recipient email (flipsnbidz@gmail.com)

## Troubleshooting

### Email not sending?
1. Check EmailJS dashboard for service status
2. Verify template ID is exactly `template_contact`
3. Check browser console for errors
4. Verify service ID is `service_exdu8rc`
5. Confirm public key is `aTiA22BTw9ab_DQDm`

### Wrong email address?
- Make sure `to_email` in template settings is `{{to_email}}`
- The code sends `to_email: 'flipsnbidz@gmail.com'` in formData

### Reply-To not working?
- Set Reply-To field in template to `{{email}}`
- This allows you to hit Reply and respond directly to customers

## Deploy to Vercel

After setting up the template:

```bash
git add .
git commit -m "Add EmailJS contact form functionality"
git push
```

Vercel will automatically deploy the changes!
