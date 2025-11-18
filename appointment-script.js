// Appointment Scheduler Script

// API Configuration - automatically detects environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'  // Development
    : `${window.location.origin}/api`;  // Production (uses same domain)

// State management
let selectedDate = null;
let selectedTime = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let bookedTimeSlots = []; // Store booked time slots from database

// Business hours: Wednesday-Monday, 10 AM - 5 PM (15-minute slots)
const businessHours = {
    start: 10, // 10 AM
    end: 17,   // 5 PM
    closedDays: [2] // Tuesday (0 = Sunday, 1 = Monday, 2 = Tuesday, etc.)
};

// Initialize calendar
function initCalendar() {
    renderCalendar();
    setupEventListeners();
}

// Render calendar
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const currentMonthDisplay = document.getElementById('currentMonth');
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Set month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = daysInPrevMonth - i;
        calendar.appendChild(day);
    }
    
    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        day.textContent = i;
        
        const date = new Date(currentYear, currentMonth, i);
        date.setHours(0, 0, 0, 0);
        
        // Check if it's today
        if (date.getTime() === today.getTime()) {
            day.classList.add('today');
        }
        
        // Disable past dates and closed days (Tuesdays)
        if (date < today || businessHours.closedDays.includes(date.getDay())) {
            day.classList.add('disabled');
        } else {
            day.addEventListener('click', () => selectDate(date, day));
        }
        
        calendar.appendChild(day);
    }
    
    // Add next month's leading days
    const totalCells = calendar.children.length - 7; // Subtract headers
    const remainingCells = 42 - totalCells - 7; // 6 weeks * 7 days - headers
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = i;
        calendar.appendChild(day);
    }
}

// Select date
function selectDate(date, element) {
    selectedDate = date;
    selectedTime = null; // Reset selected time
    
    // Update UI
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    element.classList.add('selected');
    
    // Show time slots
    renderTimeSlots(date);
    document.getElementById('timeSlotsContainer').style.display = 'block';
    
    // Update form
    updateAppointmentSummary();
}

// Render time slots
async function renderTimeSlots(date) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    
    timeSlotsContainer.innerHTML = '<div class="loading">Loading available times...</div>';
    
    // Format date display
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = date.toLocaleDateString('en-US', options);
    selectedDateDisplay.textContent = dateString;
    
    // Fetch booked time slots from database
    try {
        const response = await fetch(`${API_URL}/appointments/availability/${dateString}`);
        const data = await response.json();
        
        if (data.success) {
            bookedTimeSlots = data.bookedTimes;
        } else {
            console.warn('Could not fetch availability, using offline mode');
            bookedTimeSlots = [];
        }
    } catch (error) {
        console.warn('Backend not available, showing all slots as available');
        bookedTimeSlots = [];
    }
    
    // Clear loading message
    timeSlotsContainer.innerHTML = '';
    
    // Generate 15-minute time slots
    for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        for (let minutes = 0; minutes < 60; minutes += 15) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            
            const displayHour = hour > 12 ? hour - 12 : hour;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayMinutes = minutes.toString().padStart(2, '0');
            const timeString = `${displayHour}:${displayMinutes} ${ampm}`;
            
            timeSlot.textContent = timeString;
            timeSlot.dataset.time = `${hour}:${displayMinutes}`;
            
            // Check if this slot is already booked in database
            if (bookedTimeSlots.includes(timeString)) {
                timeSlot.classList.add('unavailable');
                timeSlot.title = 'This time slot is already booked';
            } else {
                timeSlot.addEventListener('click', () => selectTime(timeString, timeSlot));
            }
            
            timeSlotsContainer.appendChild(timeSlot);
        }
    }
}

// Select time
function selectTime(time, element) {
    selectedTime = time;
    
    // Update UI
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    element.classList.add('selected');
    
    // Update form
    updateAppointmentSummary();
}

const EMAILJS_CONFIG = {
    publicKey: 'aTiA22BTw9ab_DQDm',        // Replace with your Public Key
    serviceId: 'service_exdu8rc',        // Replace with your Service ID
    customerTemplateId: 'template_wajtgop',  // Customer confirmation template
    businessTemplateId: 'template_4o85tnx'   // Business notification template
};

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

// Update appointment summary
function updateAppointmentSummary() {
    const appointmentInfo = document.getElementById('selectedAppointmentInfo');
    const appointmentSummary = document.getElementById('appointmentSummary');
    const submitBtn = document.getElementById('submitBtn');
    
    if (selectedDate && selectedTime) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = selectedDate.toLocaleDateString('en-US', options);
        
        appointmentSummary.innerHTML = `
            <strong>Date:</strong> ${dateString}<br>
            <strong>Time:</strong> ${selectedTime} (15 minutes)<br>
            <strong>Location:</strong> 15300 Valley View Ave, La Mirada, CA 90638
        `;
        appointmentInfo.style.display = 'block';
        submitBtn.disabled = false;
    } else {
        appointmentInfo.style.display = 'none';
        submitBtn.disabled = true;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Month navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
    
    // Phone number formatting
    document.getElementById('phone').addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            value = value.substring(0, 10);
            if (value.length > 6) {
                value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
            } else if (value.length > 3) {
                value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
            } else if (value.length > 0) {
                value = `(${value}`;
            }
        }
        e.target.value = value;
    });
    
    // Form submission
    document.getElementById('appointmentForm').addEventListener('submit', handleFormSubmit);
    
    // Close modal
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('successModal').classList.remove('active');
        resetForm();
    });
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        referralSource: document.getElementById('referralSource').value,
        date: selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: selectedTime
    };
    
    // Show loading state
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Scheduling...';
    submitBtn.disabled = true;
    
    try {
        // Send confirmation emails
        await sendEmails(formData);
        
        // Show success modal
        showSuccessModal(formData);
    } catch (error) {
        console.error('Error scheduling appointment:', error);
        alert('There was an error scheduling your appointment. Please try again or call us at (626) 944-3190.');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Send appointment to backend (MongoDB + EmailJS)
async function sendEmails(formData) {
    try {
        // Step 1: Save to MongoDB database
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to book appointment');
        }
        
        console.log('✅ Appointment saved to database:', result);
        
        // Step 2: Send customer confirmation email via EmailJS
        try {
            await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.customerTemplateId,
                {
                    to_email: formData.email,
                    to_name: formData.firstName,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    date: formData.date,
                    time: formData.time,
                    referralSource: formData.referralSource
                }
            );
            console.log('✅ Customer confirmation email sent to:', formData.email);
        } catch (emailError) {
            console.warn('⚠️ Could not send customer email:', emailError);
            // Don't throw - appointment is still booked
        }
        
        // Step 3: Send business notification email via EmailJS
        try {
            await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.businessTemplateId,
                {
                    to_email: 'flipsnbidz@gmail.com',
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    date: formData.date,
                    time: formData.time,
                    referralSource: formData.referralSource || 'Not specified'
                }
            );
            console.log('✅ Business notification email sent to flipsnbidz@gmail.com');
        } catch (emailError) {
            console.warn('⚠️ Could not send business notification:', emailError);
            // Don't throw - appointment is still booked
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error booking appointment:', error);
        
        // Check if it's a conflict error (slot already booked)
        if (error.message.includes('already booked')) {
            alert('Sorry, this time slot was just booked by someone else. Please select another time.');
            // Refresh the time slots
            await renderTimeSlots(selectedDate);
            throw error;
        }
        
        // Check if backend is not running
        if (error.message.includes('Failed to fetch')) {
            console.warn('Backend server is not running. Trying email-only mode...');
            
            // Try to send emails without database
            try {
                await emailjs.send(
                    EMAILJS_CONFIG.serviceId,
                    EMAILJS_CONFIG.customerTemplateId,
                    {
                        to_email: formData.email,
                        to_name: formData.firstName,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        phone: formData.phone,
                        date: formData.date,
                        time: formData.time,
                        referralSource: formData.referralSource
                    }
                );
                
                await emailjs.send(
                    EMAILJS_CONFIG.serviceId,
                    EMAILJS_CONFIG.businessTemplateId,
                    {
                        to_email: 'flipsnbidz@gmail.com',
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        phone: formData.phone,
                        date: formData.date,
                        time: formData.time,
                        referralSource: formData.referralSource || 'Not specified'
                    }
                );
                
                console.log('✅ Emails sent successfully (database unavailable)');
                return { success: true, message: 'Appointment confirmed via email' };
            } catch (emailError) {
                console.error('❌ Email sending also failed:', emailError);
                alert('Unable to connect to the booking system. Please call us at (626) 944-3190 to book your appointment.');
                throw emailError;
            }
        }
        
        throw error;
    }
}

// Show success modal
function showSuccessModal(formData) {
    const modal = document.getElementById('successModal');
    const confirmationDetails = document.getElementById('confirmationDetails');
    
    confirmationDetails.innerHTML = `
        <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
        <p><strong>Date:</strong> ${formData.date}</p>
        <p><strong>Time:</strong> ${formData.time}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Phone:</strong> ${formData.phone}</p>
    `;
    
    modal.classList.add('active');
}

// Reset form
function resetForm() {
    document.getElementById('appointmentForm').reset();
    selectedDate = null;
    selectedTime = null;
    
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    document.getElementById('timeSlotsContainer').style.display = 'none';
    document.getElementById('selectedAppointmentInfo').style.display = 'none';
    document.getElementById('submitBtn').disabled = true;
    
    // Reset to current month
    currentMonth = new Date().getMonth();
    currentYear = new Date().getFullYear();
    renderCalendar();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initCalendar);
