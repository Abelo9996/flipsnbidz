# Holiday Theme Guide

## Overview
A subtle, festive Christmas/New Year theme for the Flips & Bidz website that can be easily toggled on and off.

## Features

### ✨ Subtle Festive Touches:
- 🎄 Christmas tree and gift emojis on headings
- ❄️ Gentle snowflake animation (8 subtle snowflakes)
- 🎁 Holiday-themed banner message
- ✨ Sparkle effects on CTA buttons
- 🎨 Christmas red/green accent colors on hover
- 📅 Date-based auto-activation (Dec 1 - Jan 5)

### 🎯 Non-Intrusive Design:
- Does NOT change the overall layout
- Does NOT change main colors
- Only adds subtle decorative touches
- Enhances existing elements without replacing them
- Professional holiday aesthetic

## How to Enable/Disable

### Option 1: Auto-Enable Based on Dates (Current Setting)
The theme automatically activates between **December 1, 2025** and **January 5, 2026**.

No action needed - it will:
- ✅ Auto-enable on December 1st
- ✅ Auto-disable on January 6th

### Option 2: Manual Toggle

**To DISABLE the theme manually** (even during holiday period):

1. Open `holiday-theme.js`
2. Change line 4:
   ```javascript
   ENABLED: false,  // Change true to false
   ```
3. Save and deploy

**To ENABLE the theme manually** (outside holiday period):

1. Open `holiday-theme.js`
2. Change line 4:
   ```javascript
   ENABLED: true,  // Change false to true
   ```
3. Save and deploy

### Option 3: Disable via Browser Console (Temporary)

For testing purposes, open browser console and run:
```javascript
window.disableHolidayTheme();
```

This removes the theme temporarily (only for current page load).

## What Changes Are Made

### Visual Changes:
1. **Banner**: Updates announcement banner with holiday message
2. **Decorations**: Adds 🎄 and 🎁 emojis to headings
3. **Snowflakes**: 8 subtle falling snowflakes
4. **Button Hover**: Christmas red gradient on hover
5. **Borders**: Red accent on card hovers
6. **Sparkles**: ✨ on CTA buttons

### Technical Changes:
- Adds `holiday-theme` class to `<body>`
- Injects CSS styles dynamically
- Creates snowflake elements
- No permanent changes to HTML/CSS files

## Customization

Edit `holiday-theme.js` to customize:

```javascript
const HOLIDAY_THEME = {
    ENABLED: true,                    // On/off switch
    START_DATE: '2025-12-01',         // When to start
    END_DATE: '2026-01-05',           // When to end
    
    ACCENT_COLOR: '#c41e3a',          // Christmas red
    SECONDARY_COLOR: '#165b33',       // Christmas green
    GOLD_ACCENT: '#d4af37',           // Gold touches
    
    SHOW_SNOWFLAKES: true,            // Enable/disable snow
    
    BANNER_MESSAGE: '🎄 Christmas Special: ...',  // Custom message
    CTA_TEXT: '🎁 Shop Holiday Deals',          // Button text
    APPOINTMENT_NOTE: '🎄 Book your...',        // Appointment note
};
```

## Deployment

### Deploy with Holiday Theme:
```bash
git add holiday-theme.js index.html appointment.html faq.html terms.html privacy.html
git commit -m "Add Christmas/New Year holiday theme"
git push
```

### Remove Holiday Theme After Holidays:

**Easy Way** (recommended):
```bash
# Just disable it in the config
# Edit holiday-theme.js and set ENABLED: false
git add holiday-theme.js
git commit -m "Disable holiday theme"
git push
```

**Complete Removal** (if you want to remove files):
```bash
# Remove the script tags from all HTML files
# Delete holiday-theme.js
git rm holiday-theme.js
git add *.html
git commit -m "Remove holiday theme files"
git push
```

## File Locations

Holiday theme is added to:
- ✅ `index.html` (Homepage)
- ✅ `appointment.html` (Appointment page)
- ✅ `faq.html` (FAQ page)
- ✅ `terms.html` (Terms page)
- ✅ `privacy.html` (Privacy page)

## Testing

1. **Test with theme enabled:**
   - Visit your website
   - Look for snowflakes, holiday emojis, red/green accents
   - Hover over buttons to see holiday effects

2. **Test with theme disabled:**
   - Set `ENABLED: false` in `holiday-theme.js`
   - Deploy and check - should look exactly like original

3. **Test date range:**
   - Change `START_DATE` and `END_DATE` to test auto-activation

## FAQ

**Q: Will this affect mobile users?**
A: Yes, but it's optimized for all devices. Snowflakes are subtle and don't affect performance.

**Q: Can I use this for other holidays?**
A: Yes! Just change the dates, colors, and emojis in the config.

**Q: Does it slow down the site?**
A: No. The snowflake animation is lightweight and uses CSS animations.

**Q: What if I forget to disable it after holidays?**
A: It auto-disables on January 6th based on the END_DATE setting.

**Q: Can I change the snowflake count?**
A: Yes, edit the `numberOfFlakes` variable in the `addSnowflakes()` function.

## Quick Reference

| Action | Command |
|--------|---------|
| Enable theme | `ENABLED: true` in holiday-theme.js |
| Disable theme | `ENABLED: false` in holiday-theme.js |
| Change dates | Edit `START_DATE` and `END_DATE` |
| Remove snowflakes | `SHOW_SNOWFLAKES: false` |
| Disable temporarily | Run `window.disableHolidayTheme()` in console |

## Support

If you need help:
1. Check this README
2. Review `holiday-theme.js` comments
3. Test in browser console with `window.disableHolidayTheme()`

---

**Remember**: After the holidays, simply set `ENABLED: false` and redeploy! 🎄
